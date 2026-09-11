import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/db/postgres';

describe('Reports API Parity', () => {
  beforeAll(async () => {});

  afterAll(async () => {
    await db.close();
  });

  test('POST /reports/generate json parity', async () => {
    const payload = {
      state: 'Odisha',
      classification: 'industrial_thermal_source',
      format: 'json'
    };
    const nodeRes = await request(app).post('/api/v1/reports/generate').send(payload);
    expect(nodeRes.status).toBe(200);
      expect(nodeRes.body.executiveSummary.totalObservations).toBeDefined();

  });

  test('POST /reports/generate csv parity', async () => {
    const payload = {
      state: 'Jharkhand',
      format: 'csv'
    };
    const nodeRes = await request(app).post('/api/v1/reports/generate').send(payload);
    expect(nodeRes.status).toBe(200);
      expect(nodeRes.headers['content-type']).toContain('text/csv');

  });
});
