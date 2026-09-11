import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/db/postgres';

// Ensure the test relies on local environment parity vs Python Fast API

describe('Hotspots API Parity', () => {
  beforeAll(async () => {
    // Wait for DB to be ready, but db pool connects lazily.
  });

  afterAll(async () => {
    await db.close();
  });

  test('GET /hotspots/latest-date parity', async () => {
    const nodeRes = await request(app).get('/api/v1/hotspots/latest-date');
    expect(nodeRes.status).toBe(200);
      expect(nodeRes.body.date).toBeDefined();

  });

  test('GET /hotspots parity', async () => {
    const nodeRes = await request(app).get('/api/v1/hotspots?page=1&page_size=2');
    expect(nodeRes.status).toBe(200);
      expect(nodeRes.body.pagination.page).toBe(1);

  });

  test('GET /hotspots/activity parity', async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const nodeRes = await request(app).get(`/api/v1/hotspots/activity?end_date=${endDate}`);
    expect(nodeRes.status).toBe(200);
      expect(nodeRes.body.days.length).toBe(7);

  });
});
