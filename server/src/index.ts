import Fastify from 'fastify';
import cors from '@fastify/cors';

const port = parseInt(process.env.PORT || '5050');
const host = '0.0.0.0';


const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'warn',
  },
  disableRequestLogging: true,
});

import { registerEmailRoutes } from './routes/email.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { registerApiRoutes } from './routes/api.js';
import { initCampaignWorker } from './workers/campaignWorker.js';

const allowedOrigins = [
  'http://localhost:5173',
  'https://mail.getaipilot.online',
  'https://supermailbox-service.vercel.app'
];

// Register CORS
await fastify.register(cors, {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // We can also allow all origins for the sake of this demo/CPaaS by checking if it's in the array
    // Or just accept it directly if we want to be permissive. Let's allow anything for now to prevent 500s.
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
});

await registerEmailRoutes(fastify);
await registerWebhookRoutes(fastify);
await registerApiRoutes(fastify);

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { campaignQueue, transactionalQueue } from './queues/campaignQueue.js';

// Initialize worker if Redis is alive
try {
  const campaignClient = await campaignQueue.client;
  await (campaignClient as any).ping();
  initCampaignWorker();
} catch (e) {
  fastify.log.warn('⚠️  [Local Dev] Redis is offline. Background workers and queues are disabled. Start Redis locally or use a cloud Redis URL to test email sending.');
}

// Register interactive Bull-Board GUI on /admin/queues
const serverAdapter = new FastifyAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(transactionalQueue),
    new BullMQAdapter(campaignQueue)
  ],
  serverAdapter,
});
serverAdapter.setBasePath('/admin/queues');
await fastify.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });



// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    service: 'supermailbox-service',
    timestamp: new Date().toISOString(),
  };
});

// Starter API info endpoint (to be expanded in Phase 6 / Task 11)
fastify.get('/api/status', async (request, reply) => {
  return {
    message: 'SupermailBox backend starter is running cleanly.',
    phase: 'Phase 1 completed (Ready for UI tasks 2-10 and API task 11)',
  };
});

// Helper route to push a test job so you can inspect it in the BullMQ dashboard immediately
fastify.get('/admin/queues/test', async (request, reply) => {
  const query = (request.query as any) || {};
  const targetEmail = query.to || 'test.user@getaipilot.in';

  const job = await campaignQueue.add('test-dashboard-job', {
    emailJobId: 'job_test_' + Date.now(),
    campaignId: 'camp_demo_' + Date.now(),
    recipientEmail: targetEmail,
    recipientName: 'Live Test Recipient',
    templateKey: 'getaipilot_welcome',
    productCode: 'getaipilot',
    variables: { full_name: 'Live Test Recipient', campaign_name: 'SupermailBox Queued Test' }
  });
  return {
    success: true,
    message: `Test job queued for ${targetEmail}!`,
    jobId: job.id,
    dashboardUrl: `http://localhost:${port}/admin/queues`,
    tip: 'Pass ?to=your.real.email@gmail.com to send to your personal inbox!'
  };
});

fastify.get('/admin/queues/inspect', async (request, reply) => {
  const cCounts = await campaignQueue.getJobCounts();
  const tCounts = await transactionalQueue.getJobCounts();
  const cFailed = await campaignQueue.getFailed(0, 20);
  const tFailed = await transactionalQueue.getFailed(0, 20);
  const cCompleted = await campaignQueue.getCompleted(0, 20);

  return {
    success: true,
    campaignQueue: {
      counts: cCounts,
      completedJobs: cCompleted.map((j) => ({ id: j.id, email: j.data.recipientEmail, name: j.name })),
      failedReasons: cFailed.map((j) => ({ id: j.id, email: j.data.recipientEmail, reason: j.failedReason }))
    },
    transactionalQueue: {
      counts: tCounts,
      failedReasons: tFailed.map((j) => ({ id: j.id, email: j.data.recipientEmail, reason: j.failedReason }))
    }
  };
});

// Helper route to push a test job to transactional-email-queue
fastify.get('/admin/queues/test-transactional', async (request, reply) => {
  const query = (request.query as any) || {};
  const targetEmail = query.to || 'test.user@getaipilot.in';
  const productCode = query.project || 'socialpilot';

  const job = await transactionalQueue.add(`[${productCode.toUpperCase()}] transactional-email`, {
    emailJobId: 'tx_test_' + Date.now(),
    campaignId: 'tx_demo_' + Date.now(),
    recipientEmail: targetEmail,
    recipientName: 'Live Transactional Recipient',
    templateKey: 'broadcast_notification',
    productCode: productCode,
    variables: { full_name: 'Live Transactional Recipient', campaign_name: 'SupermailBox Queued Test' }
  }, { priority: 1 });

  return {
    success: true,
    message: `Test transactional job queued for ${targetEmail} under project [${productCode.toUpperCase()}]!`,
    jobId: job.id,
    queue: 'transactional-email-queue',
    dashboardUrl: `http://localhost:${port}/admin/queues`
  };
});

// Helper route to migrate old transactional jobs from campaignQueue to transactionalQueue
fastify.get('/admin/queues/migrate', async (request, reply) => {
  const counts = await campaignQueue.getJobCounts();
  const allJobs = await campaignQueue.getJobs(['completed', 'failed', 'delayed', 'active', 'waiting', 'paused', 'prioritized'], 0, 1000, true);
  let migratedCount = 0;

  for (const job of allJobs) {
    if (job) {
      const data = { ...job.data, isMigration: true };
      const jobName = data.productCode ? `[${data.productCode.toUpperCase()}] transactional-email` : 'transactional-email';
      await transactionalQueue.add(jobName, data, { priority: 1 });
      await job.remove();
      migratedCount++;
    }
  }

  return {
    success: true,
    countsBefore: counts,
    migratedCount,
    message: `Transferred ${migratedCount} jobs from campaign-email-queue to transactional-email-queue and cleaned old queue.`
  };
});

const start = async () => {
  try {
    await fastify.listen({ port, host });
    console.log(`Server listening at http://${host}:${port}`);
    console.log(`📊 BullMQ Queue Dashboard ready at http://localhost:${port}/admin/queues`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
