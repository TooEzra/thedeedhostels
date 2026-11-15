import { Router } from "express";
import announcements from "./announcements";
import auth from "./auth";
import caretakers from "./caretakers";
import me from "./me";
import mpesa from "./mpesa";
import payments from "./payments";
import rent from "./rent";
import reports from "./reports";
import tenants from "./tenants";
import tickets from "./tickets";
import units from "./units";
import uploads from "./uploads";

/** All API routes, mounted under /api by app.ts. */
const api = Router();
api.use("/auth", auth);
api.use("/rent", rent); //            staff: rent roll + overview
api.use("/payments", payments); //    staff record, landlord delete
api.use("/tenants", tenants); //      staff
api.use("/units", units); //          staff (landlord delete)
api.use("/tickets", tickets); //      staff complaints inbox
api.use("/announcements", announcements);
api.use("/caretakers", caretakers); // landlord
api.use("/reports", reports); //      landlord
api.use("/me", me); //                tenant self-service
api.use("/uploads", uploads);
api.use("/mpesa", mpesa); //          phase 2 (stub)

export default api;
