import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { config } from "../config";
import { HttpError } from "../lib/http";

/**
 * CSRF defence in depth (the session cookie is also SameSite=Lax): browsers always send an
 * Origin header on cross-site state-changing requests, so reject any whose origin isn't ours.
 * Requests with no Origin (curl, server-to-server such as Safaricom callbacks) pass through.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && !config.frontendUrls.includes(origin)) return next(new HttpError(403, "Request blocked."));
  next();
}

export function notFoundApi(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "Not found."));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    const error = err.code === "LIMIT_FILE_SIZE" ? "Photo is too large (max 5MB)." : "The upload didn't work. Please try again.";
    return res.status(400).json({ error });
  }
  if ((err as { type?: string })?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
