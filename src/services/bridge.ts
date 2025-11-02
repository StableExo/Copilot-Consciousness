/**
 * Bridge Service - Handles cross-chain communication
 */

import express from 'express';
import Redis from 'ioredis';

const app = express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'bridge', uptime: process.uptime() });
});

app.post('/transfer', async (req, res) => {
  console.log('[Bridge] Processing cross-chain transfer:', req.body);
  res.json({ status: 'pending', txHash: '0x...' });
});

const port = parseInt(process.env.PORT || '3006', 10);
app.listen(port, () => console.log(`[Bridge] Listening on port ${port}`));
