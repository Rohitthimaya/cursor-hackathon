/**
 * MongoDB connection for Jethalal.
 * Stores messages and group state for long-term memory.
 */

let cachedDb: Awaited<ReturnType<typeof connect>> = null;

async function connect() {
  const url = process.env.MONGO_URL;
  if (!url) return null;
  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(url);
    await client.connect();
    return client.db("jethalal");
  } catch (e) {
    console.error("[MongoDB] Connection failed:", e);
    return null;
  }
}

export async function getMongoClient() {
  if (cachedDb) return cachedDb;
  cachedDb = await connect();
  return cachedDb;
}
