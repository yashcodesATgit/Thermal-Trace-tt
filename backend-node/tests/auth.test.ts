import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/db/postgres';

describe('Auth API Parity', () => {
  beforeAll(async () => {});

  afterAll(async () => {
    await db.close();
  });

  test('POST /auth/login parity (Invalid)', async () => {
    const payload = {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    };
    const nodeRes = await request(app).post('/api/v1/auth/login').send(payload);
    expect(nodeRes.status).toBe(401);
  });

  test('POST /auth/logout parity', async () => {
    const nodeRes = await request(app).post('/api/v1/auth/logout');
    expect(nodeRes.status).toBe(200);

  });

  test('GET /auth/me parity (No Token)', async () => {
    const nodeRes = await request(app).get('/api/v1/auth/me');
    expect(nodeRes.status).toBe(401);
  });
});
