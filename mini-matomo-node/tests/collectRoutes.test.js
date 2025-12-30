const express = require('express');
const request = require('supertest');
const { describe, it, expect, beforeEach, vi } = require('vitest');

vi.mock('../src/db/mongo', () => {
  return {
    getEventsCollection: vi.fn(),
  };
});

const { getEventsCollection } = require('../src/db/mongo');
const collectRouter = require('../src/routes/collect');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(collectRouter);
  return app;
}

describe('collect routes', () => {
  let app;
  let collection;

  beforeEach(() => {
    collection = {
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };
    getEventsCollection.mockResolvedValue(collection);
    app = createApp();
  });

  it('stores GET /collect events and returns a tracking pixel', async () => {
    const res = await request(app)
      .get('/collect')
      .query({ idsite: '1', url: 'https://example.com/' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/gif/);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(collection.insertOne).toHaveBeenCalledTimes(1);
  });

  it('returns 204 when send_image is disabled', async () => {
    const res = await request(app)
      .get('/collect')
      .query({ idsite: '1', url: 'https://example.com', send_image: '0' });

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(collection.insertOne).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid site ids with 400', async () => {
    const res = await request(app).get('/collect').query({ url: 'https://example.com' });

    expect(res.status).toBe(400);
    expect(collection.insertOne).not.toHaveBeenCalled();
  });

  it('handles storage errors with 500', async () => {
    const failingCollection = {
      insertOne: vi.fn().mockRejectedValue(new Error('db down')),
    };
    getEventsCollection.mockResolvedValue(failingCollection);
    app = createApp();

    const res = await request(app)
      .post('/collect')
      .send({ siteId: '1', url: 'https://example.com', timestamp: new Date().toISOString() });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to store event');
    expect(failingCollection.insertOne).toHaveBeenCalledTimes(1);
  });

  it('accepts POST /collect with JSON payloads', async () => {
    const res = await request(app)
      .post('/collect')
      .send({ siteId: '2', url: 'https://example.com/page', timestamp: new Date().toISOString() });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('stored');
    expect(res.body.id).toHaveLength(12);
    expect(collection.insertOne).toHaveBeenCalledTimes(1);
  });
});
