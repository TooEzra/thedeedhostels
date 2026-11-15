import { formatKES, monthLabel, normalizePhone } from "./format";

export function reminderMessage(name: string, unitNumber: string, month: string, balance: number) {
  const first = name.split(" ")[0];
  return (
    `Hello ${first}, this is a friendly reminder from THE DEED HOSTELS. ` +
    `Your rent for ${monthLabel(month)} (Unit ${unitNumber}) has an outstanding balance of ${formatKES(balance)}. ` +
    `Kindly settle it at your earliest convenience. Thank you.`
  );
}

/** Prefilled WhatsApp and SMS deep links (they open the user's own apps; nothing is sent from the server). */
export function reminderLinks(
  row: { name: string; phone: string; unitNumber: string; balance: number },
  month: string,
) {
  const phone = normalizePhone(row.phone);
  const text = encodeURIComponent(reminderMessage(row.name, row.unitNumber, month, row.balance));
  return {
    whatsapp: `https://wa.me/${phone}?text=${text}`,
    sms: `sms:+${phone}?body=${text}`,
  };
}
