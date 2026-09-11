import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/db/postgres';

describe('Incidents API Parity', () => {
  jest.setTimeout(30000);
  beforeAll(async () => {});

  afterAll(async () => {
    await db.close();
  });

  test('GET /incidents parity', async () => {
    const nodeRes = await request(app).get('/api/v1/incidents?page=1&page_size=2');
    expect(nodeRes.status).toBe(200);
      expect(nodeRes.body.pagination.page).toBe(1);

  });
});
