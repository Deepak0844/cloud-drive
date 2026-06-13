import fs from "fs";
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
  const storagePath = process.env.NAS_STORAGE_PATH;
  if (storagePath && storagePath.includes("test-storage")) {
    await fs.promises.rm(storagePath, { recursive: true, force: true });
  }
}

/**
 * Clear data between tests
 */
export async function resetTests() {
  await clearTestDB();
}
