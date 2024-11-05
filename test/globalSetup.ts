import mongoose from 'mongoose';
import {exec} from 'child_process';
import {promisify} from 'util';
import {RedisService} from '../src/configs/redis';

const execAsync = promisify(exec);

async function globalSetup() {
  // Set up test environment variables
  process.env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_URL: 'mongodb://admin:password@localhost:27017/compliments',
    LOG_LEVEL: 'debug',
    JWT_SECRET: 'boleks-compliment-token-secret',
    JWT_REFRESH_SECRET: 'refresh-boleks-compliment-refresh-token',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    ENABLE_GLOBAL_RATE_LIMIT: 'true',
  };
  delete process.env.REDIS_PASSWORD;

  try {
    await execAsync('docker rm -f ct-mongodb ct-redis || true');
    await execAsync('docker-compose -f docker-compose.test.yml down -v');
    await execAsync('docker-compose -f docker-compose.test.yml up -d');

    let retries = 10;
    const delay = 2000;
    console.log('Waiting for containers to be ready...');

    while (retries > 0) {
      try {
        const redisClient = RedisService.getInstance().getClient();
        await Promise.all([
          redisClient.ping(),
          mongoose.connect(process.env.DATABASE_URL as string),
        ]);
        console.log('Containers are ready');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('Container startup failed after multiple retries');
          throw error;
        }
        console.log(
          `Retrying in ${delay}ms... (${retries} attempts remaining)`,
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    await RedisService.getInstance().getClient().flushall();
  } catch (error) {
    console.error('Error in global setup:', error);
    throw error;
  }
}

export default globalSetup;
