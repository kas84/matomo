const express = require('express');
const { buildEvent } = require('../core/enrichEvent');
const { getEventsCollection } = require('../db/mongo');

const router = express.Router();

router.post('/collect', async (req, res) => {
  const { event, error } = buildEvent(req.body || {}, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
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
