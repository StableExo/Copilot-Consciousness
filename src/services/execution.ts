/**
 * Execution Service - Executes arbitrage trades
 */

import express from 'express';
import { createConnection } from 'amqplib';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'execution', uptime: process.uptime() });
});

const port = parseInt(process.env.PORT || '3004', 10);

async function start() {
  const connection = await createConnection(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
  const channel = await connection.createChannel();
  await channel.assertQueue('paths', { durable: true });
  
  channel.consume('paths', async (msg) => {
    if (msg) {
      const path = JSON.parse(msg.content.toString());
      console.log('[Execution] Executing path:', path.opportunityId);
      // TODO: Implement actual execution logic
      channel.ack(msg);
    }
  });

  app.listen(port, () => console.log(`[Execution] Listening on port ${port}`));
}

start().catch(console.error);
