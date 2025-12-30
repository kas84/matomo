const express = require('express');
const { getEventsCollection } = require('../db/mongo');
const { isValidSiteId } = require('../core/validation');

const router = express.Router();

router.get('/reports/pageviews', async (req, res) => {
  const { siteId, from, to } = req.query;

  if (!isValidSiteId(siteId)) {
    return res.status(400).json({ error: 'siteId is required' });
  }

  const matchStage = { siteId: siteId.trim(), eventType: 'pageview' };

  if (from) {
    const fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from date' });
    }
    matchStage.timestamp = { ...matchStage.timestamp, $gte: fromDate };
  }

  if (to) {
    const toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid to date' });
    }
    matchStage.timestamp = { ...matchStage.timestamp, $lte: toDate };
  }

  try {
    const collection = await getEventsCollection();
    const cursor = collection.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            day: { $dateTrunc: { date: '$timestamp', unit: 'day' } },
            url: '$url',
          },
          views: { $sum: 1 },
        },
      },
      {
        $project: {
          date: '$_id.day',
          url: '$_id.url',
          views: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1, views: -1 } },
    ]);

    const results = await cursor.toArray();
    return res.json({ siteId, results });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to build report' });
  }
});

module.exports = router;
