import mongoose from "mongoose";
import { config } from "./config";

interface Cache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}
const cache: Cache = { conn: null, promise: null };

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }
  return cache.conn;
}
