import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import { asyncHandler, HttpError, isDuplicateKey, oid, parse, send } from "../lib/http";
import { UNIT_TYPES } from "../lib/types";
import { requireLandlord, requireStaff } from "../middleware/auth";
import { Property, Tenant, Unit } from "../models";
import { listUnits } from "../services/queries";

const r = Router();

const schema = z.object({
  unitNumber: z.string().trim().min(1, "Enter a unit number.").max(12),
  type: z.enum(UNIT_TYPES),
  monthlyRent: z.coerce.number({ invalid_type_error: "Enter the monthly rent." }).int().min(500, "Rent looks too low.").max(500_000),
});

r.get(
  "/",
  requireStaff,
  asyncHandler(async (_req, res) => send(res, await listUnits())),
);

r.post(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const d = parse(schema, req.body);
    await connectDB();
    const property = await Property.findOne().lean();
    if (!property) throw new HttpError(409, "No property is set up yet. Run the seed script first.");
    try {
      await Unit.create({ ...d, propertyId: property._id, status: "vacant" });
    } catch (e) {
      if (isDuplicateKey(e)) throw new HttpError(409, "A unit with that number already exists.");
      throw e;
    }
    send(res, {}, 201);
  }),
);

r.patch(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = oid(req.params.id);
    const d = parse(schema, req.body);
    await connectDB();
    try {
      await Unit.findByIdAndUpdate(id, { unitNumber: d.unitNumber, type: d.type, monthlyRent: d.monthlyRent });
    } catch (e) {
      if (isDuplicateKey(e)) throw new HttpError(409, "A unit with that number already exists.");
      throw e;
    }
    send(res);
  }),
);

/** Landlord only; refused if the unit has ever had a tenant (keeps history intact). */
r.delete(
  "/:id",
  requireLandlord,
  asyncHandler(async (req, res) => {
    const id = oid(req.params.id);
    await connectDB();
    if (await Tenant.exists({ unitId: id })) throw new HttpError(409, "This unit has tenant history and can't be deleted.");
    await Unit.findOneAndDelete({ _id: id, status: "vacant" });
    send(res);
  }),
);

export default r;
