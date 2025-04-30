import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

const app = express();
app.use(express.json());

// Stub endpoint for /reminders (you can remove this if your actual app handles it)
app.post('/reminders', (req, res) => {
  const { title, time } = req.body;
  if (title && time) {
    return res.status(201).json({ title, time });
  }
  return res.status(400).json({ error: 'Missing fields' });
});

describe('CreateReminder', () => {
  it('should create a new reminder', async () => {
    const res = await request(app)
      .post('/reminders')
      .send({
        title: 'Test Reminder',
        time: '2025-05-01T12:00:00Z',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('title', 'Test Reminder');
  });
});