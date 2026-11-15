import { Router } from "express";
import { asyncHandler, HttpError, send } from "../lib/http";
import { isMonth, monthLabel } from "../lib/format";
import { requireLandlord } from "../middleware/auth";
import { getHistory, getRentRows } from "../services/rent";

const r = Router();
r.use(requireLandlord); // financial reports are landlord-only

r.get(
  "/summary",
  asyncHandler(async (_req, res) => send(res, await getHistory(12))),
);

/** Spreadsheet apps execute cells starting with = + - @ as formulas; neutralise them. */
function cell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
const line = (cells: (string | number)[]) => cells.map(cell).join(",");

r.get(
  "/export",
  asyncHandler(async (req, res) => {
    const lines: string[] = [];
    let filename: string;

    if (req.query.type === "month") {
      const month = String(req.query.month ?? "");
      if (!isMonth(month)) throw new HttpError(400, "Invalid month.");
      const rows = await getRentRows(month);
      lines.push(line(["Unit", "Tenant", "Phone", "Rent (KES)", "Paid (KES)", "Balance (KES)", "Status"]));
      for (const x of rows) lines.push(line([x.unitNumber, x.name, x.phone, x.rent, x.paid, x.balance, x.status]));
      filename = `deed-hostels-rent-${month}.csv`;
    } else {
      const history = await getHistory(12);
      lines.push(line(["Month", "Expected (KES)", "Collected (KES)", "Outstanding (KES)", "Paid", "Partial", "Unpaid"]));
      for (const h of history) lines.push(line([monthLabel(h.month), h.expected, h.collected, h.outstanding, h.paid, h.partial, h.unpaid]));
      filename = "deed-hostels-income-summary.csv";
    }

    res
      .status(200)
      .set({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      })
      .send("﻿" + lines.join("\r\n")); // BOM so Excel opens UTF-8 correctly
  }),
);

export default r;
