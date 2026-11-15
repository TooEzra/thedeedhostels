import mongoose, { Schema, model, models, type Model, type Types } from "mongoose";
import {
  PAY_METHODS,
  ROLES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  UNIT_TYPES,
  type PayMethod,
  type Role,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type UnitType,
} from "./lib/types";

export type WithId<T> = T & { _id: Types.ObjectId };

export interface IProfile {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
}
export interface IProperty {
  name: string;
  address: string;
  city: string;
}
export interface IUnit {
  propertyId: Types.ObjectId;
  unitNumber: string;
  type: UnitType;
  monthlyRent: number;
  status: "occupied" | "vacant";
}
export interface ITenant {
  profileId: Types.ObjectId;
  unitId: Types.ObjectId;
  phone: string;
  idNumber: string;
  moveInDate: Date;
  moveOutDate?: Date;
  isActive: boolean;
}
export interface IPayment {
  tenantId: Types.ObjectId;
  month: string;
  amount: number;
  method: PayMethod;
  referenceCode?: string;
  paidOn: Date;
  recordedBy?: Types.ObjectId;
}
export interface ITicket {
  tenantId: Types.ObjectId;
  category: TicketCategory;
  description: string;
  photoUrl?: string;
  priority: TicketPriority;
  status: TicketStatus;
  staffUnread: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface ITicketReply {
  ticketId: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string;
  authorRole: Role;
  message: string;
  createdAt: Date;
}
export interface IAnnouncement {
  title: string;
  body: string;
  authorId: Types.ObjectId;
  authorName: string;
  createdAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const PropertySchema = new Schema<IProperty>({
  name: { type: String, required: true },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
});

const UnitSchema = new Schema<IUnit>({
  propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
  unitNumber: { type: String, required: true, trim: true },
  type: { type: String, enum: UNIT_TYPES, required: true },
  monthlyRent: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["occupied", "vacant"], default: "vacant" },
});
UnitSchema.index({ propertyId: 1, unitNumber: 1 }, { unique: true });

const TenantSchema = new Schema<ITenant>(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true, unique: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    phone: { type: String, required: true, trim: true },
    idNumber: { type: String, required: true, trim: true },
    moveInDate: { type: Date, required: true },
    moveOutDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
TenantSchema.index({ unitId: 1, isActive: 1 });

const PaymentSchema = new Schema<IPayment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: PAY_METHODS, required: true },
    // Optional, but unique when present so one M-Pesa code can't be recorded twice.
    referenceCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    paidOn: { type: Date, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "Profile" },
  },
  { timestamps: true },
);
PaymentSchema.index({ tenantId: 1, month: 1 });
PaymentSchema.index({ month: 1 });

const TicketSchema = new Schema<ITicket>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    category: { type: String, enum: TICKET_CATEGORIES, required: true },
    description: { type: String, required: true, maxlength: 1500 },
    photoUrl: { type: String },
    priority: { type: String, enum: TICKET_PRIORITIES, default: "medium" },
    status: { type: String, enum: TICKET_STATUSES, default: "open" },
    staffUnread: { type: Boolean, default: true },
  },
  { timestamps: true },
);
TicketSchema.index({ status: 1, staffUnread: 1 });

const TicketReplySchema = new Schema<ITicketReply>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ROLES, required: true },
    message: { type: String, required: true, maxlength: 1500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 3000 },
    authorId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    authorName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

function get<T>(name: string, schema: Schema<T>): Model<T> {
  return (models[name] as Model<T> | undefined) ?? model<T>(name, schema);
}

export const Profile = get<IProfile>("Profile", ProfileSchema);
export const Property = get<IProperty>("Property", PropertySchema);
export const Unit = get<IUnit>("Unit", UnitSchema);
export const Tenant = get<ITenant>("Tenant", TenantSchema);
export const Payment = get<IPayment>("Payment", PaymentSchema);
export const Ticket = get<ITicket>("Ticket", TicketSchema);
export const TicketReply = get<ITicketReply>("TicketReply", TicketReplySchema);
export const Announcement = get<IAnnouncement>("Announcement", AnnouncementSchema);

export { mongoose };
