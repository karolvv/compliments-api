/* eslint-disable no-undef */

// Initialize database
db.getSiblingDB('compliments');

// Create user first
db.createUser({
  user: 'admin',
  pwd: 'password',
  roles: [{role: 'readWrite', db: 'compliments'}],
});

// Create collections with validators
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'username', 'password', 'createdAt'],
      properties: {
        _id: {
          bsonType: 'objectId',
          description: 'Unique identifier for each user',
        },
        username: {
          bsonType: 'string',
          description: 'User display name or unique identifier',
        },
        email: {
          bsonType: 'string',
          description:
            'Contact information (optional, if sending compliments by email)',
        },
        password: {
          bsonType: 'string',
          description: 'User password hashed with bcrypt',
        },
        roles: {
          bsonType: 'array',
          description: 'User roles (admin, user)',
        },
        createdAt: {
          bsonType: 'date',
          description: 'Timestamp of when the user joined',
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Timestamp of when the user was last updated',
        },
      },
    },
  },
});

db.createCollection('compliments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['text', 'createdAt'],
      properties: {
        _id: {
          bsonType: 'objectId',
          description: 'Unique identifier for each compliment',
        },
        text: {
          bsonType: 'string',
          description: 'The compliment text',
        },
        authorId: {
          bsonType: 'objectId',
          description:
            'ID of the user who created it (if user-generated) or null if pre-made',
        },
        createdAt: {
          bsonType: 'date',
          description: 'Timestamp of when the compliment was created',
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Timestamp of when the compliment was last updated',
        },
      },
    },
  },
});

// Insert data with error handling
try {
  db.users.insertMany([
    {
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      username: 'admin',
      email: 'admin@compliments.com',
      password: '$2b$10$J4P2HpZAwMRCDzfhbzngy.MWNDP5gbR7IWa49N7A5yX1JuY5mMS4q',
      refreshToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzI2YTMxNTY2MWEwNGUyNTBiNzRjNjIiLCJpYXQiOjE3MzA1ODUzNjUsImV4cCI6MTczMTE5MDE2NSwiYXVkIjoiY29tcGxpbWVudC1hcHAiLCJpc3MiOiJjb21wbGltZW50LWFwaSJ9.mhILMvji4rcEfg3uMfnMmI7kNN5K39pTnTnoKFysbxU',
      roles: [1001],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId('507f1f77bcf86cd799439012'),
      username: 'user',
      email: 'user@compliments.com',
      password: '$2b$10$GegFsIqNeZmTW9xyc2UH9OzsGFBa6lF/peAHCc8Kb0dBetFaa7hC6',
      refreshToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzI2YTI5ODY2MWEwNGUyNTBiNzRjNWIiLCJpYXQiOjE3MzA1ODUyNDAsImV4cCI6MTczMTE5MDA0MCwiYXVkIjoiY29tcGxpbWVudC1hcHAiLCJpc3MiOiJjb21wbGltZW50LWFwaSJ9.coJ-32QujJQUQffznrYn0bxpC4DwmvIM-uSb1E-Ouxo',
      roles: [1002],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  db.compliments.insertMany([
    {
      _id: new ObjectId('65f9b24c7fd3c8f4e15a3d71'),
      text: 'You are doing a great job!',
      authorId: new ObjectId('507f1f77bcf86cd799439011'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId('65f9b24c7fd3c8f4e15a3d72'),
      text: 'Keep up the good work!',
      authorId: new ObjectId('507f1f77bcf86cd799439011'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId('65f9b24c7fd3c8f4e15a3d73'),
      text: 'Your efforts are appreciated!',
      authorId: new ObjectId('507f1f77bcf86cd799439011'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId('65f9b24c7fd3c8f4e15a3d74'),
      text: 'You have a positive attitude!',
      authorId: new ObjectId('507f1f77bcf86cd799439011'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId('65f9b24c7fd3c8f4e15a3d75'),
      text: 'You are a valuable team member!',
      authorId: new ObjectId('507f1f77bcf86cd799439011'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId('65f9b24c7fd3c8f4e15a3d76'),
      text: 'You are a great leader!',
      authorId: new ObjectId('507f1f77bcf86cd799439011'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId('65f9b24c7fd3c8f4e15a3d77'),
      text: 'I love your creativity!',
      authorId: new ObjectId('507f1f77bcf86cd799439011'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  console.log('Sent compliments inserted successfully');

  console.log('All data seeded successfully');
} catch (error) {
  console.error('Error seeding data:', error);
  throw error;
}
