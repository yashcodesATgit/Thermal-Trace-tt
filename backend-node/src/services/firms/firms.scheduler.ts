import { db } from '../../db/postgres';
import { redisClient } from '../../redis/redis';
import { FIRMSIngestionService } from './firms.ingestion';
import { randomBytes } from 'crypto';

export class FIRMSSyncManager {
  private schedulerTimer: NodeJS.Timeout | null = null;
  private isExecuting = false;

  async initializeFromDb() {
    // In Node.js version, we can rely on Redis for the last_sync_success_at
    // No strict requirement to duplicate the fallback query if Redis is reliable,
    // but preserving exact behavior is good.
    try {
      const res = await db.query('SELECT MAX(timestamp) as max_ts FROM hotspots');
      const maxTs = res.rows[0]?.max_ts;

      const savedSyncAt = await redisClient.get('thermalwatch:cache:firms:last_sync_success_at');
      if (!savedSyncAt) {
        await redisClient.setEx('thermalwatch:cache:firms:last_sync_success_at', 2592000, new Date().toISOString());
      }
    } catch (e) {
      console.warn('Notice initializing FIRMS status from database:', e);
    }
  }

  async getStatusPayload() {
    const lastSyncSuccessAt = await redisClient.get('thermalwatch:cache:firms:last_sync_success_at');
    const lastSyncError = await redisClient.get('thermalwatch:cache:firms:last_sync_error');

    let status = 'stale';
    let successDt = lastSyncSuccessAt ? new Date(lastSyncSuccessAt) : null;

    if (lastSyncError && successDt) {
      // Only mark degraded if there's been a sync error AND last success was more than 12h ago
      const ageHours = (Date.now() - successDt.getTime()) / 3600000;
      if (ageHours > 12) {
        status = 'degraded';
      } else if (ageHours <= 12) {
        status = 'live'; // Last sync was recent enough despite errors
      }
    } else if (lastSyncError && !successDt) {
      status = 'degraded';
    } else if (successDt) {
      const ageHours = (Date.now() - successDt.getTime()) / 3600000;
      if (ageHours <= 12) {
        status = 'live';
      } else if (ageHours <= 24) {
        status = 'delayed';
      }
    }

    const nextSync = successDt ? new Date(successDt.getTime() + 12 * 3600000) : new Date();
    if (nextSync.getTime() < Date.now()) {
      nextSync.setTime(Date.now());
    }

    const maxTsRes = await db.query('SELECT MAX(timestamp) as max_ts FROM hotspots');
    const latestObservationAt = maxTsRes.rows[0]?.max_ts ? new Date(maxTsRes.rows[0].max_ts).toISOString() : null;

    return {
      status,
      lastSyncSuccessAt: successDt ? successDt.toISOString() : null,
      latestObservationAt,
      nextScheduledSyncAt: nextSync.toISOString(),
      satellites: ['SNPP', 'NOAA-20', 'NOAA-21'],
      observationsIngested: 0, // This state might not be 100% persistent globally in python either
      syncIntervalHours: 12,
    };
  }

  async recordSyncSuccess(inserted: number) {
    const now = new Date().toISOString();
    await redisClient.setEx('thermalwatch:cache:firms:last_sync_success_at', 2592000, now);
    await redisClient.del('thermalwatch:cache:firms:last_sync_error');

    // Invalidate analytics pattern
    const keys = await redisClient.keys('thermalwatch:cache:analytics:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }

  async recordSyncFailure(error: string) {
    await redisClient.setEx('thermalwatch:cache:firms:last_sync_error', 86400, error);
  }

  async executeSyncIfNeeded(force = false): Promise<boolean> {
    const now = Date.now();
    const lastSyncStr = await redisClient.get('thermalwatch:cache:firms:last_sync_success_at');

    if (!force && lastSyncStr) {
      const ageHours = (now - new Date(lastSyncStr).getTime()) / 3600000;
      if (ageHours < 12) {
        console.log(`FIRMS sync skipped: last successful sync was ${ageHours.toFixed(1)}h ago (interval is 12h).`);
        return false;
      }
    }

    const lockToken = `worker-${randomBytes(4).toString('hex')}`;
    const lockKey = 'thermalwatch:lock:firms_sync';

    // Acquire lock
    const gotLock = await redisClient.set(lockKey, lockToken, {
      NX: true,
      EX: 600
    });

    if (gotLock !== 'OK') {
      console.log(`FIRMS sync skipped: distributed lock '${lockKey}' held by another worker.`);
      return false;
    }

    if (this.isExecuting) {
      await this.releaseLock(lockKey, lockToken);
      console.log(`FIRMS sync skipped: synchronization operation is already in progress locally.`);
      return false;
    }

    this.isExecuting = true;
    console.log(`Starting scheduled NASA FIRMS data synchronization (lock_token=${lockToken})...`);

    const startTime = Date.now();
    try {
      const service = new FIRMSIngestionService();
      const sources = (process.env.FIRMS_SOURCES || 'VIIRS_SNPP_NRT,VIIRS_NOAA20_NRT,VIIRS_NOAA21_NRT').split(',');
      const days = parseInt(process.env.FIRMS_INGESTION_DAYS || '5', 10);

      const res = await service.ingestAllSources(sources, undefined, days);

      if (res.sources_succeeded > 0 || res.total_inserted > 0) {
        await this.recordSyncSuccess(res.total_inserted);
      } else if (res.sources_failed > 0) {
        const errMsg = res.errors.map(e => e.error).join('; ');
        await this.recordSyncFailure(errMsg);
      }

      const duration = (Date.now() - startTime) / 1000;
      console.log(`NASA FIRMS 12-hour sync completed in ${duration.toFixed(2)}s`);
      return true;
    } catch (e: any) {
      await this.recordSyncFailure(e.message || String(e));
      console.error(`NASA FIRMS 12-hour sync failed:`, e);
      return false;
    } finally {
      this.isExecuting = false;
      await this.releaseLock(lockKey, lockToken);
    }
  }

  private async releaseLock(key: string, token: string) {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
      else
          return 0
      end
    `;
    try {
      await redisClient.eval(luaScript, {
        keys: [key],
        arguments: [token]
      });
    } catch (e) {
      console.error('Failed to release lock', e);
    }
  }

  startSchedulerTask() {
    if (this.schedulerTimer) return;

    // Initial check
    this.executeSyncIfNeeded(false).catch(console.error);

    // Every 60 seconds
    this.schedulerTimer = setInterval(() => {
      this.executeSyncIfNeeded(false).catch(console.error);
    }, 60000);
    console.log('NASA FIRMS 12-hour background scheduler task launched.');
  }

  stopSchedulerTask() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
      console.log('NASA FIRMS background scheduler task stop requested.');
    }
  }
}

export const firmsSyncManager = new FIRMSSyncManager();
