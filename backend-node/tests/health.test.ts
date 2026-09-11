import request from 'supertest';
import app from '../src/app';

describe('API Foundation Tests', () => {
  it('GET /api/v1/health responds with expected structure', async () => {
    const response = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(response.status); // Depends on actual DB/Redis connectivity in test env
    expect(response.body).toHaveProperty('service', 'thermalwatch-api-node');
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('redis');
  });

  it('GET /api/v1/nonexistent route responds with 404', async () => {
    const response = await request(app).get('/api/v1/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });
});
