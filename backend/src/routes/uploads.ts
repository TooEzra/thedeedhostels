import { Router } from "express";
import { connectDB } from "../db";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { Tenant, Ticket } from "../models";
import { readUpload, UPLOAD_NAME_RE } from "../services/uploads";

const r = Router();

// Photos are private: staff can see all, a tenant only the photos on their own tickets.
r.get(
  "/:name",
  requireAuth,
  asyncHandler(async (req, res) => {
    const name = req.params.name;
    if (!UPLOAD_NAME_RE.test(name)) throw new HttpError(404, "Not found.");

    if (req.user!.role === "tenant") {
      await connectDB();
      const tenant = await Tenant.findOne({ profileId: req.user!.id }, "_id").lean();
      const owns = tenant && (await Ticket.exists({ photoUrl: name, tenantId: tenant._id }));
      if (!owns) throw new HttpError(404, "Not found.");
    }

    const file = await readUpload(name);
    if (!file) throw new HttpError(404, "Not found.");
    res
      .status(200)
      .set({ "Content-Type": file.type, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" })
      .send(file.buf);
  }),
);

export default r;
