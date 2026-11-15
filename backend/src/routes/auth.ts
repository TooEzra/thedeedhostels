import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import { connectDB } from "../db";
import { asyncHandler, clearRateLimit, HttpError, isDuplicateKey, parse, rateLimited, send } from "../lib/http";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "../lib/jwt";
import { requireAuth, requireStaff } from "../middleware/auth";
import { Profile, type IProfile, type WithId } from "../models";

const r = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(200),
});

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const cookieOptions = () =>
  ({
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    path: "/",
  }) as const;

r.post(
  "/login",
  asyncHandler(async (req, res) => {
    const d = parse(loginSchema, req.body);
    const emailKey = `login:e:${d.email}`;
    if (rateLimited(`login:ip:${req.ip}`, 30, 10 * 60_000) || rateLimited(emailKey, 6, 10 * 60_000)) {
      throw new HttpError(429, "Too many attempts. Please wait a few minutes and try again.");
    }

    await connectDB();
    const p = await Profile.findOne({ email: d.email }).lean<WithId<IProfile>>();
    const valid = await bcrypt.compare(d.password, p?.passwordHash ?? DUMMY_HASH);
    if (!p || !valid || !p.isActive) throw new HttpError(401, "Incorrect email or password.");

    clearRateLimit(emailKey);
    const token = await signSession({ sub: String(p._id), role: p.role });
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_MAX_AGE * 1000 });
    send(res, {
      user: { id: String(p._id), name: p.name, email: p.email, role: p.role },
      redirectTo: p.role === "tenant" ? "/tenant" : "/admin",
    });
  }),
);

r.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  send(res);
});

r.get("/me", requireAuth, (req, res) => send(res, req.user));

const pwSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(100)
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/\d/, "Include at least one number."),
  })
  .refine((v) => v.current !== v.next, { message: "Choose a different password from your current one.", path: ["next"] });

r.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const d = parse(pwSchema, req.body);
    await connectDB();
    const p = await Profile.findById(req.user!.id);
    if (!p || !(await bcrypt.compare(d.current, p.passwordHash))) throw new HttpError(400, "Your current password is incorrect.");
    p.passwordHash = await bcrypt.hash(d.next, 10);
    await p.save();
    send(res);
  }),
);

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().regex(/^(\+?254|0)?[17]\d{8}$/, "Enter a valid Kenyan phone number, e.g. 0712345678."),
  currentPassword: z.string().max(200).optional(),
});

/** Landlord / caretaker edit their own profile. Changing the sign-in email requires the current password. */
r.patch(
  "/profile",
  requireStaff,
  asyncHandler(async (req, res) => {
    const d = parse(profileSchema, req.body);
    await connectDB();
    const p = await Profile.findById(req.user!.id);
    if (!p || !p.isActive) throw new HttpError(401, "Please sign in.");

    if (d.email !== p.email && (!d.currentPassword || !(await bcrypt.compare(d.currentPassword, p.passwordHash)))) {
      throw new HttpError(400, "Enter your current password to change your email.");
    }
    p.name = d.name;
    p.email = d.email;
    p.phone = d.phone;
    try {
      await p.save();
    } catch (e) {
      if (isDuplicateKey(e)) throw new HttpError(409, "An account with that email already exists.");
      throw e;
    }
    send(res, { id: String(p._id), name: p.name, email: p.email, phone: p.phone, role: p.role });
  }),
);

export default r;
