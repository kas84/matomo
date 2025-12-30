const express = require('express');
const { buildEvent, mapQueryToEventPayload } = require('../core/enrichEvent');
const { getEventsCollection } = require('../db/mongo');

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64',
);

function sendTrackingPixel(req, res) {
  const shouldSendImage = req.query.send_image !== '0';

  if (!shouldSendImage) {
    return res.status(204).end();
  }

  res.setHeader('Content-Type', 'image/gif');
  return res.status(200).end(TRANSPARENT_GIF);
}

const router = express.Router();

router.get('/collect', async (req, res) => {
  const payload = mapQueryToEventPayload(req.query || {});
  const { event, error } = buildEvent(payload, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    acceptLanguage: req.get('accept-language'),
  });

  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const collection = await getEventsCollection();
    await collection.insertOne(event);
    return sendTrackingPixel(req, res);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to store event' });
  }
});

router.post('/collect', async (req, res) => {
  const { event, error } = buildEvent(req.body || {}, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    acceptLanguage: req.get('accept-language'),
  });

  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const collection = await getEventsCollection();
    await collection.insertOne(event);
    return res.status(201).json({ status: 'stored', id: event._id });
  } catch (err) {
    // Logable en sistemas reales
    return res.status(500).json({ error: 'Failed to store event' });
  }
});

module.exports = router;
