import type { Types } from "mongoose";
import { Ticket, TicketReply, type ITicket, type WithId } from "../models";
import type { AuthUser } from "../lib/types";

/**
 * Add a reply to a ticket and update its flags:
 *  - a tenant follow-up flags the ticket for staff and re-opens it if it was resolved;
 *  - a staff reply clears the unread flag and moves an open ticket to "in progress".
 * Callers are responsible for checking the user may reply to this ticket.
 */
export async function addReply(ticket: WithId<ITicket>, user: AuthUser, message: string): Promise<void> {
  await TicketReply.create({
    ticketId: ticket._id as Types.ObjectId,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    message,
  });
  if (user.role === "tenant") {
    await Ticket.findByIdAndUpdate(ticket._id, { staffUnread: true, ...(ticket.status === "resolved" ? { status: "open" } : {}) });
  } else {
    await Ticket.findByIdAndUpdate(ticket._id, { staffUnread: false, ...(ticket.status === "open" ? { status: "in_progress" } : {}) });
  }
}
