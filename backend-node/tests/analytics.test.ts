import request from 'supertest';
import app from '../src/app';
import { redisClient } from '../src/redis/redis';

// Mock Redis so we don't depend on live instance for CI
jest.mock('../src/redis/redis', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
  }
}));

describe('Analytics API', () => {
  it('GET /api/v1/analytics/regional returns HTTP 200 and matches schema', async () => {
    const response = await request(app).get('/api/v1/analytics/regional');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalStatesRepresented');
    expect(response.body).toHaveProperty('states');

    expect(Array.isArray(response.body.states)).toBe(true);
    expect(typeof response.body.totalStatesRepresented).toBe('number');

    if (response.body.states.length > 0) {
      const state = response.body.states[0];
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('totalObservations');
      expect(state).toHaveProperty('industrialObservations');
      expect(state).toHaveProperty('miningObservations');
      expect(state).toHaveProperty('naturalFires');
      expect(state).toHaveProperty('persistentEvents');
    }
  });
});
