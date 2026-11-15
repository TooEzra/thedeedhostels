import { randomBytes } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";

/** An error that should be shown to the client with a specific status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const NOT_ALLOWED = () => new HttpError(403, "You don't have permission to do that.");

/** Express 4 doesn't catch rejected promises, so wrap every async handler. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Success envelope: { data }. Errors are { error } (see middleware/errors.ts). */
export function send(res: Response, data: unknown = {}, status = 200) {
  res.status(status).json({ data });
}

/** Validate input with zod; the first issue becomes a 400 message the UI can show directly. */
export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? "Please check the form and try again.");
  return r.data;
}

const OBJECT_ID = /^[a-f0-9]{24}$/;
export const objectIdString = (message = "Invalid selection.") => z.string().regex(OBJECT_ID, message);

/** Route param that must be a Mongo id; anything else is simply "not found". */
export function oid(v: unknown): string {
  if (typeof v !== "string" || !OBJECT_ID.test(v)) throw new HttpError(404, "Not found.");
  return v;
}

export function isDuplicateKey(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

/** 10-char temporary password without look-alike characters. */
export function tempPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
}

/** Tiny in-memory limiter (per server instance). Swap for Redis when running multiple instances. */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  b.n += 1;
  return b.n > max;
}
export function clearRateLimit(key: string) {
  buckets.delete(key);
}
