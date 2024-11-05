import mongoose from 'mongoose';
import {RedisService} from '@configs/redis';

beforeAll(async () => {
  console.log('Connecting to MongoDB');
  await mongoose.connect(process.env.DATABASE_URL as string);
  console.log('Connected to MongoDB');
  console.log('Pinging Redis');
  await RedisService.getInstance().getClient().ping();
  console.log('Pinged Redis');
});

afterAll(async () => {
  console.log('Disconnecting from MongoDB');
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  console.log('Disconnecting from Redis');
  await RedisService.getInstance().disconnect();
  console.log('Disconnected from Redis');
});

afterEach(async () => {
  await Promise.all([
    // Clean all MongoDB collections
    Promise.all(
      Object.values(mongoose.connection.collections).map(collection =>
        collection.deleteMany({}),
      ),
    ),
    // Clean Redis
    RedisService.getInstance().getClient().flushall(),
  ]);
});
