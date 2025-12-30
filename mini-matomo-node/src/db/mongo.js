const { MongoClient } = require('mongodb');
const config = require('../config');

let client;

async function connect() {
  if (client) return client;
  client = new MongoClient(config.mongodbUri, {
    maxPoolSize: 10,
  });
  await client.connect();
  return client;
}

async function getEventsCollection() {
  const activeClient = await connect();
  const db = activeClient.db();
  const collection = db.collection('events');
  await collection.createIndex({ siteId: 1, timestamp: -1 });
  await collection.createIndex({ siteId: 1, url: 1 });
  return collection;
}

async function close() {
  if (client) {
    await client.close();
    client = undefined;
  }
}

module.exports = { connect, getEventsCollection, close };
