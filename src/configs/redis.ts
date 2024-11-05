import Redis, {RedisOptions} from 'ioredis';

export class RedisService {
  private static instance: RedisService | null = null;
  private client: Redis | null = null;

  private constructor() {}

  private createClient(): Redis {
    const redisConfig: RedisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        return Math.min(times * 50, 2000);
      },
    };

    if (
      process.env.REDIS_PASSWORD &&
      process.env.REDIS_PASSWORD !== '' &&
      process.env.NODE_ENV !== 'test'
    ) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    const client = new Redis(redisConfig);

    client.on('connect', () => {
      console.log('Successfully connected to Redis');
    });

    client.on('error', error => {
      console.error('Redis connection error:', error);
    });

    return client;
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public getClient(): Redis {
    if (!this.client) {
      this.client = this.createClient();
    }
    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log('Redis connection closed');
    }
  }
}

export default RedisService.getInstance().getClient();
