import request from 'supertest';
import app from '../src/app';

describe('Facilities API', () => {
  it('GET /api/v1/facilities returns HTTP 200 and matches schema', async () => {
    const response = await request(app).get('/api/v1/facilities?page=1&page_size=2');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');

    expect(Array.isArray(response.body.data)).toBe(true);

    if (response.body.data.length > 0) {
      const facility = response.body.data[0];
      expect(facility).toHaveProperty('id');
      expect(facility).toHaveProperty('name');
      expect(facility).toHaveProperty('type');
      expect(facility).toHaveProperty('latitude');
      expect(facility).toHaveProperty('longitude');
      expect(facility).toHaveProperty('city');
      expect(facility).toHaveProperty('state');
      expect(facility).toHaveProperty('country');
      expect(facility).toHaveProperty('source');
    }

    expect(response.body.pagination).toMatchObject({
      page: 1,
      page_size: 2,
    });
    expect(typeof response.body.pagination.total).toBe('number');
  });

  it('GET /api/v1/facilities validates page_size', async () => {
    const response = await request(app).get('/api/v1/facilities?page_size=1000');
    expect(response.status).toBe(422); // Validation error
  });

  it('GET /api/v1/facilities/summary returns totalFacilities and typeDistribution', async () => {
    const response = await request(app).get('/api/v1/facilities/summary');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalFacilities');
    expect(response.body).toHaveProperty('typeDistribution');
    expect(typeof response.body.totalFacilities).toBe('number');
  });
});
