import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import { todayISO } from "../lib/format";
import { asyncHandler, HttpError, isDuplicateKey, objectIdString, oid, parse, send, tempPassword } from "../lib/http";
import { requireLandlord, requireStaff } from "../middleware/auth";
import { Payment, Profile, Tenant, Ticket, TicketReply, Unit, type ITenant, type ITicket, type WithId } from "../models";
import { listTenants } from "../services/queries";
import { deleteUpload } from "../services/uploads";

const r = Router();
r.use(requireStaff);

const phone = z.string().trim().regex(/^(\+?254|0)?[17]\d{8}$/, "Enter a valid Kenyan phone number, e.g. 0712345678.");
const fields = {
  name: z.string().trim().min(2, "Enter the tenant's full name.").max(80),
  phone,
  idNumber: z.string().trim().min(5, "Enter the ID / passport number.").max(20),
  unitId: objectIdString("Choose a unit."),
  moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the move-in date."),
};
const createSchema = z.object({ ...fields, email: z.string().trim().toLowerCase().email("Enter a valid email address.") });
const updateSchema = z.object(fields);

r.get(
  "/",
  asyncHandler(async (_req, res) => send(res, await listTenants())),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const d = parse(createSchema, req.body);
    await connectDB();

    // Atomically claim the unit so two caretakers can't assign it at the same time.
    const claimed = await Unit.findOneAndUpdate({ _id: d.unitId, status: "vacant" }, { status: "occupied" });
    if (!claimed) throw new HttpError(409, "That unit is not available.");

    const password = tempPassword();
    let profileId: unknown;
    try {
      const profile = await Profile.create({
        name: d.name,
        email: d.email,
        phone: d.phone,
        role: "tenant",
        passwordHash: await bcrypt.hash(password, 10),
      });
      profileId = profile._id;
      await Tenant.create({
        profileId: profile._id,
        unitId: d.unitId,
        phone: d.phone,
        idNumber: d.idNumber,
        moveInDate: new Date(`${d.moveInDate}T00:00:00+03:00`),
      });
    } catch (e) {
      await Unit.findByIdAndUpdate(d.unitId, { status: "vacant" });
      if (profileId) await Profile.findByIdAndDelete(profileId);
      if (isDuplicateKey(e)) throw new HttpError(409, "An account with that email already exists.");
      throw e;
    }
    send(res, { email: d.email, password }, 201);
  }),
);

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = oid(req.params.id);
    const d = parse(updateSchema, req.body);
    await connectDB();
    const tenant = await Tenant.findById(id).lean<WithId<ITenant>>();
    if (!tenant || !tenant.isActive) throw new HttpError(404, "Tenant not found.");

    if (String(tenant.unitId) !== d.unitId) {
      const claimed = await Unit.findOneAndUpdate({ _id: d.unitId, status: "vacant" }, { status: "occupied" });
      if (!claimed) throw new HttpError(409, "That unit is not available.");
      await Unit.findByIdAndUpdate(tenant.unitId, { status: "vacant" });
    }
    await Tenant.findByIdAndUpdate(tenant._id, {
      unitId: d.unitId,
      phone: d.phone,
      idNumber: d.idNumber,
      moveInDate: new Date(`${d.moveInDate}T00:00:00+03:00`),
    });
    await Profile.findByIdAndUpdate(tenant.profileId, { name: d.name, phone: d.phone });
    send(res);
  }),
);

/** Moving out keeps the tenant's payment history; the account is deactivated and the unit freed. */
r.post(
  "/:id/move-out",
  asyncHandler(async (req, res) => {
    const id = oid(req.params.id);
    await connectDB();
    const tenant = await Tenant.findOneAndUpdate(
      { _id: id, isActive: true },
      { isActive: false, moveOutDate: new Date(`${todayISO()}T12:00:00+03:00`) },
    );
    if (!tenant) throw new HttpError(404, "Tenant not found.");
    await Profile.findByIdAndUpdate(tenant.profileId, { isActive: false });
    await Unit.findByIdAndUpdate(tenant.unitId, { status: "vacant" });
    send(res);
  }),
);

r.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const id = oid(req.params.id);
    await connectDB();
    const tenant = await Tenant.findOne({ _id: id, isActive: true }).lean<WithId<ITenant>>();
    if (!tenant) throw new HttpError(404, "Tenant not found.");
    const password = tempPassword();
    await Profile.findByIdAndUpdate(tenant.profileId, { passwordHash: await bcrypt.hash(password, 10) });
    send(res, { password });
  }),
);

/**
 * Landlord only. Permanently deletes a tenant who has already moved out, together with their
 * login, payments, requests, replies and photos. Active tenants must be moved out first.
 */
r.delete(
  "/:id",
  requireLandlord,
  asyncHandler(async (req, res) => {
    const id = oid(req.params.id);
    await connectDB();
    const tenant = await Tenant.findById(id).lean<WithId<ITenant>>();
    if (!tenant) throw new HttpError(404, "Tenant not found.");
    if (tenant.isActive) throw new HttpError(409, "Move the tenant out before deleting their record.");

    const tickets = await Ticket.find({ tenantId: id }).lean<WithId<ITicket>[]>();
    await TicketReply.deleteMany({ ticketId: { $in: tickets.map((t) => t._id) } });
    await Promise.all(tickets.map((t) => deleteUpload(t.photoUrl)));
    await Ticket.deleteMany({ tenantId: id });
    await Payment.deleteMany({ tenantId: id });
    await Tenant.findByIdAndDelete(id);
    await Profile.findByIdAndDelete(tenant.profileId);
    send(res);
  }),
);

export default r;
