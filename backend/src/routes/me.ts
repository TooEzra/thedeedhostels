import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { connectDB } from "../db";
import { asyncHandler, HttpError, oid, parse, rateLimited, send } from "../lib/http";
import { TICKET_CATEGORIES } from "../lib/types";
import { requireTenant } from "../middleware/auth";
import { Profile, Tenant, Ticket, type ITicket, type WithId } from "../models";
import { getPaymentForTenant, getUnitForTenant, listTicketsWithReplies } from "../services/queries";
import { getTenantLedger } from "../services/rent";
import { addReply } from "../services/tickets";
import { MAX_PHOTO_BYTES, saveTicketPhoto } from "../services/uploads";

/**
 * Everything a tenant can see or do, under /api/me. The tenant is taken from the session
 * (`req.tenant`) and every query below is scoped by it; ids from the client are never trusted
 * to say whose data to return.
 */
const r = Router();
r.use(requireTenant);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 10 } });

r.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const t = req.tenant!;
    send(res, {
      name: req.user!.name,
      email: req.user!.email,
      phone: t.phone,
      moveInDate: t.moveInDate.toISOString(),
      unit: await getUnitForTenant(t),
    });
  }),
);

const phoneSchema = z.object({ phone: z.string().trim().regex(/^(\+?254|0)?[17]\d{8}$/, "Enter a valid Kenyan phone number.") });

r.put(
  "/phone",
  asyncHandler(async (req, res) => {
    const d = parse(phoneSchema, req.body);
    await connectDB();
    await Promise.all([Tenant.findByIdAndUpdate(req.tenant!._id, { phone: d.phone }), Profile.findByIdAndUpdate(req.user!.id, { phone: d.phone })]);
    send(res);
  }),
);

r.get(
  "/ledger",
  asyncHandler(async (req, res) => send(res, await getTenantLedger(req.tenant!))),
);

r.get(
  "/payments/:id",
  asyncHandler(async (req, res) => {
    const payment = await getPaymentForTenant(oid(req.params.id), req.tenant!._id);
    if (!payment) throw new HttpError(404, "Payment not found.");
    send(res, { payment, unit: await getUnitForTenant(req.tenant!), tenantName: req.user!.name });
  }),
);

r.get(
  "/tickets",
  asyncHandler(async (req, res) => send(res, await listTicketsWithReplies(req.tenant!._id))),
);

const ticketSchema = z.object({
  category: z.enum(TICKET_CATEGORIES, { errorMap: () => ({ message: "Choose a category." }) }),
  description: z.string().trim().min(10, "Please describe the issue (at least 10 characters).").max(1500),
  urgent: z.boolean(),
});

/** Multipart because of the optional photo. */
r.post(
  "/tickets",
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    if (rateLimited(`ticket:${req.user!.id}`, 10, 60 * 60_000)) throw new HttpError(429, "You've sent a lot of requests. Please try again later.");
    const d = parse(ticketSchema, {
      category: req.body?.category,
      description: req.body?.description,
      urgent: req.body?.urgent === "on" || req.body?.urgent === "true",
    });

    let photoUrl: string | undefined;
    if (req.file && req.file.size > 0) {
      const saved = await saveTicketPhoto(req.file.buffer);
      if ("error" in saved) throw new HttpError(400, saved.error);
      photoUrl = saved.name;
    }

    await connectDB();
    await Ticket.create({
      tenantId: req.tenant!._id,
      category: d.category,
      description: d.description,
      priority: d.urgent ? "high" : "medium",
      photoUrl,
    });
    send(res, {}, 201);
  }),
);

r.post(
  "/tickets/:id/replies",
  asyncHandler(async (req, res) => {
    const { message } = parse(z.object({ message: z.string().trim().min(1, "Write a message first.").max(1500) }), req.body);
    await connectDB();
    // Scoped by tenantId: a tenant can only reply on their own tickets.
    const ticket = await Ticket.findOne({ _id: oid(req.params.id), tenantId: req.tenant!._id }).lean<WithId<ITicket>>();
    if (!ticket) throw new HttpError(404, "Request not found.");
    await addReply(ticket, req.user!, message);
    send(res, {}, 201);
  }),
);

export default r;
