import type { NextFunction, Request, Response } from "express";
import { connectDB } from "../db";
import { HttpError } from "../lib/http";
import { SESSION_COOKIE, verifySession } from "../lib/jwt";
import { Profile, Tenant, type IProfile, type ITenant, type WithId } from "../models";
import type { AuthUser } from "../lib/types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenant?: WithId<ITenant>;
    }
  }
}

/**
 * Resolve the signed-in user for every request. The JWT only proves *who* the user is;
 * role and active-state are always re-read from the database so a demoted or deactivated
 * account loses access immediately.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const s = await verifySession(req.cookies?.[SESSION_COOKIE]);
    if (s) {
      await connectDB();
      const p = await Profile.findById(s.sub).lean<WithId<IProfile>>();
      if (p && p.isActive) {
        req.user = { id: String(p._id), name: p.name, email: p.email, role: p.role, phone: p.phone };
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Please sign in."));
  next();
}

export function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Please sign in."));
  if (req.user.role === "tenant") return next(new HttpError(403, "You don't have permission to do that."));
  next();
}

export function requireLandlord(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Please sign in."));
  if (req.user.role !== "landlord") return next(new HttpError(403, "Only the landlord can do that."));
  next();
}

/**
 * Tenant "row-level security": routes behind this middleware get `req.tenant`, derived from the
 * session. Every tenant-facing query must be scoped by it, never by an id sent from the browser.
 */
export async function requireTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(new HttpError(401, "Please sign in."));
    if (req.user.role !== "tenant") return next(new HttpError(403, "You don't have permission to do that."));
    const tenant = await Tenant.findOne({ profileId: req.user.id, isActive: true }).lean<WithId<ITenant>>();
    if (!tenant) return next(new HttpError(403, "No active tenancy found for this account."));
    req.tenant = tenant;
    next();
  } catch (e) {
    next(e);
  }
}
