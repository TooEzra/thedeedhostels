/**
 * M-Pesa Daraja STK Push, PHASE 2 HOOK (intentionally not implemented yet).
 *
 * Planned flow:
 *  1. Tenant taps "Pay with M-Pesa" -> API endpoint calls `initiateStkPush()`.
 *  2. Get an OAuth token from Daraja, then POST /mpesa/stkpush/v1/processrequest
 *     (BusinessShortCode, base64(shortcode+passkey+timestamp), Amount, PartyA = tenant phone,
 *     CallBackURL = MPESA_CALLBACK_URL).
 *  3. Persist a pending record keyed by CheckoutRequestID.
 *  4. Safaricom calls POST /api/mpesa/callback -> `recordMpesaCallback()` verifies the payload,
 *     and on ResultCode 0 creates a Payment { method: "mpesa", referenceCode: MpesaReceiptNumber }.
 *     The unique index on Payment.referenceCode makes this idempotent.
 *
 * Env vars are listed (commented) in .env.example.
 */

export interface StkPushRequest {
  tenantId: string;
  month: string; // YYYY-MM the payment applies to
  amount: number; // KES, whole shillings
  phone: string; // 2547XXXXXXXX
}

export interface StkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
}

export function mpesaConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL,
  );
}

export async function initiateStkPush(_req: StkPushRequest): Promise<StkPushResponse> {
  throw new Error("M-Pesa STK Push is not implemented yet (phase 2). See src/services/mpesa.ts.");
}

export async function recordMpesaCallback(_payload: unknown): Promise<void> {
  throw new Error("M-Pesa callback handling is not implemented yet (phase 2). See src/services/mpesa.ts.");
}
