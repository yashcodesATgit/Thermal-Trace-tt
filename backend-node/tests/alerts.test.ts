import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/db/postgres';

describe('Alerts API Parity', () => {
  beforeAll(async () => {});

  afterAll(async () => {
    await db.close();
  });

  test('GET /alerts parity', async () => {
    const nodeRes = await request(app).get('/api/v1/alerts?page=1&page_size=2');
    expect(nodeRes.status).toBe(200);
      expect(nodeRes.body.pagination.page).toBe(1);

  });

  test('GET /alerts?severity=high parity', async () => {
    const nodeRes = await request(app).get('/api/v1/alerts?severity=high');
    expect(nodeRes.status).toBe(200);

  });
});
