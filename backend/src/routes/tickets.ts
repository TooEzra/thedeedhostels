import { Router } from "express";
import { z } from "zod";
import { connectDB } from "../db";
import { asyncHandler, HttpError, oid, parse, send } from "../lib/http";
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketStatus } from "../lib/types";
import { requireLandlord, requireStaff } from "../middleware/auth";
import { Ticket, TicketReply, type ITicket, type WithId } from "../models";
import { countAttention, getTicket, listTickets } from "../services/queries";
import { addReply } from "../services/tickets";
import { deleteUpload } from "../services/uploads";

const r = Router();
r.use(requireStaff);

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = TICKET_STATUSES.find((s) => s === req.query.status) as TicketStatus | undefined;
    const priority = TICKET_PRIORITIES.find((p) => p === req.query.priority) as TicketPriority | undefined;
    send(res, await listTickets({ status, priority }));
  }),
);

/** Sidebar badge: tickets that are still open or that staff haven't looked at yet. */
r.get(
  "/attention",
  asyncHandler(async (_req, res) => send(res, { count: await countAttention() })),
);

r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const t = await getTicket(oid(req.params.id));
    if (!t) throw new HttpError(404, "Request not found.");
    send(res, t);
  }),
);

const replySchema = z.object({ message: z.string().trim().min(1, "Write a message first.").max(1500) });

r.post(
  "/:id/replies",
  asyncHandler(async (req, res) => {
    const d = parse(replySchema, req.body);
    await connectDB();
    const ticket = await Ticket.findById(oid(req.params.id)).lean<WithId<ITicket>>();
    if (!ticket) throw new HttpError(404, "Request not found.");
    await addReply(ticket, req.user!, d.message);
    send(res, {}, 201);
  }),
);

const updateSchema = z.object({ status: z.enum(TICKET_STATUSES).optional(), priority: z.enum(TICKET_PRIORITIES).optional() });

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const d = parse(updateSchema, req.body);
    await connectDB();
    await Ticket.findByIdAndUpdate(oid(req.params.id), {
      ...(d.status ? { status: d.status } : {}),
      ...(d.priority ? { priority: d.priority } : {}),
      staffUnread: false,
    });
    send(res);
  }),
);

r.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await connectDB();
    await Ticket.updateOne({ _id: oid(req.params.id), staffUnread: true }, { staffUnread: false });
    send(res);
  }),
);

r.delete(
  "/:id",
  requireLandlord,
  asyncHandler(async (req, res) => {
    const id = oid(req.params.id);
    await connectDB();
    const t = await Ticket.findByIdAndDelete(id);
    if (t) {
      await TicketReply.deleteMany({ ticketId: id });
      await deleteUpload(t.photoUrl);
    }
    send(res);
  }),
);

export default r;
