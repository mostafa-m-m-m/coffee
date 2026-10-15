import { db } from "@/lib/db";
import { sendBackInStock } from "@/lib/email/emails";

/**
 * Emails everyone waiting for a variant that has stock again, once each. Safe to call after any
 * change that can add stock (a dashboard edit, a cancelled order): it looks at who is waiting and
 * what is in stock now, so running it twice sends nothing twice.
 */
export async function notifyBackInStock() {
  const waiting = await db.subscriber.findMany({
    where: {
      source: "back-in-stock",
      notifiedAt: null,
      variant: { stock: { gt: 0 }, isArchived: false },
    },
    select: { id: true },
  });
  let sent = 0;
  for (const { id } of waiting) {
    // claim before sending: two runs at once must not both email the same person
    const claimed = await db.subscriber.updateMany({
      where: { id, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    if (claimed.count === 0) continue;
    await sendBackInStock(id);
    sent += 1;
  }
  return sent;
}
