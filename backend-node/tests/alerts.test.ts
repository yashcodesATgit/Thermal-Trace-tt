import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/db/postgres';

describe('Alerts API & Pagination Regression Tests', () => {
  beforeAll(async () => {});

  afterAll(async () => {
    await db.close();
  });

  test('GET /alerts pagination metadata is independent of page_size', async () => {
    const resSmallPage = await request(app).get('/api/v1/alerts?page=1&page_size=10');
    expect(resSmallPage.status).toBe(200);
    expect(resSmallPage.body.data.length).toBeLessThanOrEqual(10);
    expect(typeof resSmallPage.body.pagination.total).toBe('number');
    expect(typeof resSmallPage.body.pagination.unacknowledged_total).toBe('number');

    const resLargePage = await request(app).get('/api/v1/alerts?page=1&page_size=500');
    expect(resLargePage.status).toBe(200);
    expect(resLargePage.body.data.length).toBeLessThanOrEqual(500);

    // Total count must be identical regardless of page_size requested
    expect(resSmallPage.body.pagination.total).toBe(resLargePage.body.pagination.total);
    expect(resSmallPage.body.pagination.unacknowledged_total).toBe(resLargePage.body.pagination.unacknowledged_total);
  });

  test('GET /alerts?severity=high returns correct filtered count', async () => {
    const res = await request(app).get('/api/v1/alerts?severity=high&page_size=10');
    expect(res.status).toBe(200);
    expect(res.body.pagination.page_size).toBe(10);
    expect(res.body.data.every((a: any) => a.severity === 'high')).toBe(true);
  });
});
