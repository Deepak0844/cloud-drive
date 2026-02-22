import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 */
export async function connectTestDB() {
  if (mongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  }
}

/**
 * Clear all test data
 */
export async function clearTestDB() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
}

/**
 * Close database connection and stop MongoDB server
 */
export async function closeTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
}

/**
 * Setup before all tests
 */
export async function setupTests() {
  await connectTestDB();
}

/**
 * Teardown after all tests
 */
export async function teardownTests() {
  await closeTestDB();
}

/**
 * Clear data between tests
 */
export async function resetTests() {
  await clearTestDB();
}
