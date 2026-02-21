/**
 * MongoDB connection for Jethalal.
 * Stores messages and group state for long-term memory.
 */

// Placeholder for MongoDB client - wire up when MONGO_URL is set
export async function getMongoClient() {
  const url = process.env.MONGO_URL;
  if (!url) return null;

  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(url);
  await client.connect();
  return client.db("jethalal");
}
