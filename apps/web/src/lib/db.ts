import { MongoClient, type Db } from "mongodb";
import mongoose from "mongoose";
import { env } from "@/lib/env";

/**
 * Cache the MongoClient on globalThis in development.
 * Next.js hot-module reloading frequently re-evaluates server modules, which creates
 * new client instances on every reload and quickly exhausts MongoDB Atlas M0 free tier
 * connection limits. Caching on globalThis guarantees a single connection pool.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

const uri = env.MONGODB_URI;
const dbName = env.MONGODB_DB;

let clientPromise: Promise<MongoClient>;

if (env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

/**
 * Connects to MongoDB via native driver and returns the client and default database.
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise;
  const db = client.db(dbName);
  return { client, db };
}

/**
 * Returns the raw native Db instance required by Better Auth MongoDB adapter.
 */
export async function getRawDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

/**
 * Connects Mongoose using the single database URI and cached connection.
 */
export async function connectMongoose(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  if (env.NODE_ENV === "development") {
    if (!global._mongoosePromise) {
      global._mongoosePromise = mongoose.connect(uri, { dbName });
    }
    return global._mongoosePromise;
  }

  return mongoose.connect(uri, { dbName });
}

export { clientPromise, mongoose };
