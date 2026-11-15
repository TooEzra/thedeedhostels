import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import { asyncHandler, oid, parse, send } from "../lib/http";
import { requireAuth, requireLandlord, requireStaff } from "../middleware/auth";
import { Announcement } from "../models";
import { listAnnouncements } from "../services/queries";

const r = Router();

const schema = z.object({
  title: z.string().trim().min(3, "Add a short title.").max(120),
  body: z.string().trim().min(5, "Write the notice.").max(3000),
});

// Everyone signed in can read notices (tenants see them on their notice board).
r.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    send(res, await listAnnouncements(limit));
  }),
);

r.post(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const d = parse(schema, req.body);
    await connectDB();
    await Announcement.create({ ...d, authorId: req.user!.id, authorName: req.user!.name });
    send(res, {}, 201);
  }),
);

r.delete(
  "/:id",
  requireLandlord,
  asyncHandler(async (req, res) => {
    await connectDB();
    await Announcement.findByIdAndDelete(oid(req.params.id));
    send(res);
  }),
);

export default r;
