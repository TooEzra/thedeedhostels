import { Router } from "express";

const r = Router();

// Phase 2 placeholder: Safaricom will POST the STK Push result here.
// See src/services/mpesa.ts for the planned flow. Returns 501 until implemented.
r.post("/callback", (_req, res) => {
  res.status(501).json({ error: "M-Pesa callback is not implemented yet." });
});

export default r;
