import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import { currentMonth, monthOf, todayISO } from "../lib/format";
import { asyncHandler, HttpError, isDuplicateKey, objectIdString, oid, parse, send } from "../lib/http";
import { PAY_METHODS } from "../lib/types";
import { requireLandlord, requireStaff } from "../middleware/auth";
import { Payment, Tenant, type ITenant, type WithId } from "../models";

const r = Router();

const schema = z.object({
  tenantId: objectIdString("Choose a tenant."),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a valid month."),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount." }).int("Use whole shillings.").min(1, "Enter an amount.").max(1_000_000, "Amount is too large."),
  method: z.enum(PAY_METHODS),
  referenceCode: z.string().trim().max(40).optional(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the payment date."),
});

r.post(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const d = parse(schema, req.body);
    if (d.method !== "cash" && !d.referenceCode) throw new HttpError(400, "Enter the M-Pesa / bank reference code.");
    if (d.month > currentMonth()) throw new HttpError(400, "You can't record rent for a future month.");
    if (d.paidOn > todayISO()) throw new HttpError(400, "The payment date can't be in the future.");

    await connectDB();
    const tenant = await Tenant.findById(d.tenantId).lean<WithId<ITenant>>();
    if (!tenant) throw new HttpError(404, "Tenant not found.");
    if (d.month < monthOf(tenant.moveInDate)) throw new HttpError(400, "That month is before the tenant moved in.");

    try {
      await Payment.create({
        tenantId: tenant._id,
        month: d.month,
        amount: d.amount,
        method: d.method,
        referenceCode: d.referenceCode || undefined,
        paidOn: new Date(`${d.paidOn}T12:00:00+03:00`),
        recordedBy: req.user!.id,
      });
    } catch (e) {
      if (isDuplicateKey(e)) throw new HttpError(409, "That reference code has already been recorded.");
      throw e;
    }
    send(res, {}, 201);
  }),
);

/** Landlord only: caretakers can record payments but not delete them. */
r.delete(
  "/:id",
  requireLandlord,
  asyncHandler(async (req, res) => {
    await connectDB();
    await Payment.findByIdAndDelete(oid(req.params.id));
    send(res);
  }),
);

export default r;
