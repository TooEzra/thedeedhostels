import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import { asyncHandler, HttpError, isDuplicateKey, oid, parse, send, tempPassword } from "../lib/http";
import { requireLandlord } from "../middleware/auth";
import { Profile } from "../models";
import { listCaretakers } from "../services/queries";

const r = Router();
r.use(requireLandlord);

const schema = z.object({
  name: z.string().trim().min(2, "Enter the caretaker's name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().regex(/^(\+?254|0)?[17]\d{8}$/, "Enter a valid Kenyan phone number."),
});

r.get(
  "/",
  asyncHandler(async (_req, res) => send(res, await listCaretakers())),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const d = parse(schema, req.body);
    await connectDB();
    const password = tempPassword();
    try {
      await Profile.create({ ...d, role: "caretaker", passwordHash: await bcrypt.hash(password, 10) });
    } catch (e) {
      if (isDuplicateKey(e)) throw new HttpError(409, "An account with that email already exists.");
      throw e;
    }
    send(res, { email: d.email, password }, 201);
  }),
);

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { active } = parse(z.object({ active: z.boolean() }), req.body);
    await connectDB();
    await Profile.updateOne({ _id: oid(req.params.id), role: "caretaker" }, { isActive: active });
    send(res);
  }),
);

r.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    await connectDB();
    const password = tempPassword();
    const result = await Profile.updateOne({ _id: oid(req.params.id), role: "caretaker" }, { passwordHash: await bcrypt.hash(password, 10) });
    if (!result.matchedCount) throw new HttpError(404, "Caretaker not found.");
    send(res, { password });
  }),
);

export default r;
