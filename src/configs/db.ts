import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {User} from '@models/user';
import {Compliment} from '@models/compliment';

dotenv.config();

class Database {
  private connectionString: string;

  constructor() {
    this.connectionString =
      process.env.DATABASE_URL ||
      'mongodb://admin:password@localhost:27017/compliments';
  }

  public async connect() {
    try {
      await mongoose.connect(this.connectionString, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      const db = mongoose.connection;

      db.on('error', console.error.bind(console, 'connection error:'));
      db.once('open', () => {
        console.log('Connected to the database');
      });
    } catch (error) {
      console.error('Database connection error:', error);
    }
  }

  public async seedData() {
    try {
      const user = await User.create({
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        username: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password',
      });

      const compliment = await Compliment.create({
        text: 'You are amazing!',
        authorId: user._id,
      });
      console.log(`User: ${user.username} created`);
      console.log(`Compliment: ${compliment.text} created`);
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }
}

export default Database;
