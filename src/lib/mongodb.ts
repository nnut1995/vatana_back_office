import { MongoClient, type Db } from "mongodb";

// In serverless (Vercel) and dev with HMR, cache the client promise on the
// global object so a single connection pool is reused across invocations and
// reloads instead of opening a new one on every request.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Lazily create (once) and return the shared, connected MongoClient.
 *
 * The connection is established on first use rather than at import time, so
 * that importing this module during `next build` — when MONGODB_URI may be
 * absent — does not crash. The env var is validated only when a DB call runs.
 */
export function getClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

/** Returns the application database (name from MONGODB_DB, defaults to "vatana"). */
export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB || "vatana");
}
