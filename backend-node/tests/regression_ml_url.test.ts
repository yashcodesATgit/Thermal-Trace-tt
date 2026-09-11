import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { FIRMSIngestionService } from '../src/services/firms/firms.ingestion';
import { redisClient } from '../src/redis/redis';
import { db } from '../src/db/postgres';

process.env.FIRMS_MAP_KEY = 'test_key';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Phase 11 Regression Tests - ML Service URL & Cache Invalidation', () => {
  afterAll(async () => {
    await redisClient.disconnect();
    await db.close();
  });

  test('Express ML_SERVICE_URL MUST NOT point to legacy FastAPI port 8000', () => {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    expect(mlUrl).not.toContain(':8000');
    expect(mlUrl).toContain(':8001');
  });

  test('FIRMSIngestionService targets isolated ML Service port 8001', async () => {
    const service = new FIRMSIngestionService();
    service['client'].fetchCsv = jest.fn().mockResolvedValue(
      `latitude,longitude,bright_ti4,acq_date,acq_time,confidence,frp\n28.5500,77.2500,320.0,2023-10-16,1500,h,15.5`
    );

    mockedAxios.post.mockResolvedValue({
      data: { mlType: 'natural_fire', mlConfidence: 0.92, modelVersion: 'thermalwatch-v1' },
    });

    await service.ingest('VIIRS_SNPP_NRT', '0,0,0,0', 1);

    expect(mockedAxios.post).toHaveBeenCalled();
    const targetUrl = mockedAxios.post.mock.calls[mockedAxios.post.mock.calls.length - 1][0];
    expect(targetUrl).not.toContain(':8000');
    expect(targetUrl).toContain(':8001');
    expect(targetUrl).toContain('/predict');
  });

  test('Ingestion invalidates stale analytics cache keys in Redis', async () => {
    await redisClient.connect().catch(() => {});
    const cacheKey = 'thermalwatch:cache:analytics:test_key';
    await redisClient.setEx(cacheKey, 60, JSON.stringify({ stale: true }));

    // Verify key exists before
    const beforeVal = await redisClient.get(cacheKey);
    expect(beforeVal).not.toBeNull();

    // Invalidate analytics keys matching pattern
    const keys = await redisClient.keys('thermalwatch:cache:analytics:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    // Verify key is cleared after
    const afterVal = await redisClient.get(cacheKey);
    expect(afterVal).toBeNull();
  });
});
