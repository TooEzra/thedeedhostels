import { Router } from "express";
import { asyncHandler, HttpError, send } from "../lib/http";
import { isMonth, parseMonthParam } from "../lib/format";
import { requireStaff } from "../middleware/auth";
import { listPaymentsForMonth } from "../services/queries";
import { getHistory, getOccupancy, getRentRows, totalsFromRows } from "../services/rent";

const r = Router();
r.use(requireStaff);

function monthQuery(v: unknown): string {
  if (v !== undefined && !isMonth(String(v))) throw new HttpError(400, "Invalid month.");
  return parseMonthParam(v === undefined ? undefined : String(v));
}

/** Overview dashboard: rent roll, totals, last-6-month history and occupancy for one month. */
r.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const month = monthQuery(req.query.month);
    const [rows, history, occupancy] = await Promise.all([getRentRows(month), getHistory(6, month), getOccupancy()]);
    send(res, { month, rows, totals: totalsFromRows(month, rows), history, occupancy });
  }),
);

/** Payments page: rent roll plus every payment received for the month. */
r.get(
  "/roll",
  asyncHandler(async (req, res) => {
    const month = monthQuery(req.query.month);
    const [rows, payments] = await Promise.all([getRentRows(month), listPaymentsForMonth(month)]);
    send(res, { month, rows, totals: totalsFromRows(month, rows), payments });
  }),
);

export default r;
