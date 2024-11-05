import mongoose from 'mongoose';
import {exec} from 'child_process';
import {promisify} from 'util';
import {RedisService} from '../src/configs/redis';

const execAsync = promisify(exec);

async function globalTeardown() {
  console.log('Disconnecting from MongoDB');
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  console.log('Disconnecting from Redis');
  await RedisService.getInstance().disconnect();
  console.log('Disconnected from Redis');

  try {
    await execAsync('docker-compose -f docker-compose.test.yml down -v');
  } catch (error) {
    console.error('Error in global teardown:', error);
  }
}

export default globalTeardown;
