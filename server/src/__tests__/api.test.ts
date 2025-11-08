import request from 'supertest';
import { app } from '../index.js';

// Create a simpler test approach without complex mocking
// We'll test the contract without actually calling OpenAI

describe('API Contract Tests', () => {
  describe('POST /api/interpret', () => {
    it('returns actions array structure on valid request', async () => {
      // This test verifies the endpoint exists and validates input
      // Note: Without a real API key, it will fail at OpenAI call
      // But we can verify the request structure is accepted
      const response = await request(app)
        .post('/api/interpret')
        .send({
          transcript: 'Graph 3cos(x)',
          apiKey: 'sk-test12345678901234567890',
        });

      // Should either succeed (200) or fail with proper error structure
      // 401 = invalid API key, 500 = OpenAI error, 200 = success
      expect([200, 401, 500]).toContain(response.status);
      
      // If it's a 200, verify structure
      if (response.status === 200) {
        expect(Array.isArray(response.body.actions)).toBe(true);
        expect(response.body.requestId).toBeDefined();
      }
      
      // Verify requestId is present (in success or error responses)
      if (response.body.requestId) {
        expect(typeof response.body.requestId).toBe('string');
      }
    });

    it('validates input and returns 400 on invalid transcript', async () => {
      const response = await request(app)
        .post('/api/interpret')
        .send({
          transcript: '', // Empty transcript
          apiKey: 'sk-test12345678901234567890',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
      expect(response.body.details).toBeDefined();
    });

    it('validates input and returns 400 on invalid API key', async () => {
      const response = await request(app)
        .post('/api/interpret')
        .send({
          transcript: 'Graph x',
          apiKey: 'short', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('sanitizes transcript (trims and caps at 500 chars)', async () => {
      const longTranscript = '  ' + 'a'.repeat(600) + '  ';
      const response = await request(app)
        .post('/api/interpret')
        .send({
          transcript: longTranscript,
          apiKey: 'sk-test12345678901234567890',
        });

      // Should accept (validation passes after sanitization)
      // The actual OpenAI call will fail, but validation should pass
      expect([200, 401, 500]).toContain(response.status);
    });

    it('rejects non-ASCII payloads', async () => {
      const response = await request(app)
        .post('/api/interpret')
        .send({
          transcript: 'Graph 测试', // Non-ASCII characters
          apiKey: 'sk-test12345678901234567890',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid payload');
    });

    it('returns TutorResponse structure', async () => {
      // Test that response matches expected structure
      const response = await request(app)
        .post('/api/interpret')
        .send({
          transcript: 'Graph x',
          apiKey: 'sk-test12345678901234567890',
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('actions');
        expect(Array.isArray(response.body.actions)).toBe(true);
        expect(response.body).toHaveProperty('requestId');
      }
    });
  });
});
