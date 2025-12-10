const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
// support application/geo+json as JSON
app.use(express.json({ type: ['application/json', 'application/geo+json'], limit: '10mb' }));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in environment');
  process.exit(1);
}

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let camerasColl;

async function start() {
  await client.connect();
  const db = client.db();
  camerasColl = db.collection('cameras');
  console.log('Connected to MongoDB');

  app.post('/api/cameras', async (req, res) => {
    try {
      const geojson = req.body;
      if (!geojson || !geojson.type || geojson.type !== 'FeatureCollection') {
        return res.status(400).json({ error: 'Expected FeatureCollection GeoJSON' });
      }
      const now = new Date();
      // store with an insertedAt and raw geojson
      const doc = { geojson, insertedAt: now };
      const result = await camerasColl.insertOne(doc);
      res.json({ insertedId: result.insertedId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'insert failed' });
    }
  });

  // return merged FeatureCollection of stored camera features
  app.get('/api/cameras', async (req, res) => {
    try {
      const docs = await camerasColl.find({}).toArray();
      const features = [];
      docs.forEach((d) => {
        if (d.geojson && d.geojson.features && Array.isArray(d.geojson.features)) {
          // assume first feature is point
          d.geojson.features.forEach((f) => features.push(f));
        }
      });
      res.json({ type: 'FeatureCollection', features });
    } catch (err) {
      console.error('failed to read cameras', err);
      res.status(500).json({ error: 'read failed' });
    }
  });

  // serve static frontend from project root
  const path = require('path');
  app.use(express.static(path.join(__dirname)));
  // fallback to index.html for SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server listening on ${port}`));
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
