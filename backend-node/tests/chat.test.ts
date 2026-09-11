import request from 'supertest';
import app from '../src/app';

describe('Chat API (Express Native LLM Service)', () => {
  it('POST /api/v1/chat validates empty message', async () => {
    const response = await request(app).post('/api/v1/chat').send({ message: '' });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('detail');
  });

  it('POST /api/v1/chat returns structured response matching schema', async () => {
    const response = await request(app)
      .post('/api/v1/chat')
      .send({ message: 'What is the current system status?' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('conversationId');
    expect(response.body).toHaveProperty('toolCalls');
    expect(response.body).toHaveProperty('metadata');
    expect(Array.isArray(response.body.toolCalls)).toBe(true);
  });
});
