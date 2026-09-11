import { Router } from 'express';
import { checkDatabaseHealth } from '../db/postgres';
import { checkRedisHealth } from '../redis/redis';

const router = Router();

router.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const redisHealth = await checkRedisHealth();

  const isHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    service: 'thermalwatch-api-node',
    status: isHealthy ? 'healthy' : 'degraded',
    database: dbHealth,
    redis: redisHealth,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
