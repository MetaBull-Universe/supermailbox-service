import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { CampaignJobPayload } from '../types.js';

const Redis = (IORedis as any).default || IORedis;

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisUrl = process.env.REDIS_URL;

export const redisConnection = redisUrl ? new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true
}) : new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  lazyConnect: true
});

// Avoid crashing server if local Redis is disconnected during dev
redisConnection.on('error', (err: any) => {
  // Silent or low-noise log in dev
});

export const campaignQueue = new Queue<CampaignJobPayload>('campaign-email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      count: 1000
    },
    removeOnFail: {
      count: 5000
    }
  }
});

export const transactionalQueue = new Queue<CampaignJobPayload>('transactional-email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      count: 1000
    },
    removeOnFail: {
      count: 5000
    }
  }
});

export async function enqueueCampaignJobs(jobs: CampaignJobPayload[]): Promise<number> {
  if (jobs.length === 0) return 0;

  const bulkJobs = jobs.map((job) => ({
    name: job.productCode ? `[${job.productCode.toUpperCase()}] campaign-email` : 'dispatch-campaign-email',
    data: job
  }));

  try {
    await campaignQueue.addBulk(bulkJobs);
    console.log(`📤 [BullMQ Enqueue] Added ${jobs.length} campaign job(s) to 'campaign-email-queue' in Redis.`);
    return jobs.length;
  } catch (err) {
    console.error('[Campaign Queue] Failed to enqueue jobs into Redis/BullMQ:', err);
    throw err;
  }
}

export async function enqueueTransactionalJob(job: CampaignJobPayload): Promise<string> {
  try {
    const jobName = job.productCode
      ? `[${job.productCode.toUpperCase()}] transactional-email`
      : 'dispatch-transactional-email';

    const bullJob = await transactionalQueue.add(jobName, job, {
      priority: 1
    });
    console.log(`⚡ [BullMQ Enqueue] Added high-priority job [${bullJob.id}] to 'transactional-email-queue' in Redis.`);
    return bullJob.id || `tx_bull_${Date.now()}`;
  } catch (err) {
    console.error('[Transactional Queue] Failed to enqueue transactional job into BullMQ:', err);
    throw err;
  }
}

