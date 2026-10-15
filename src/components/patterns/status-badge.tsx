import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/validations/admin-orders";

// Status is always shown as text + a symbol, never by color alone.
const ORDER = {
  PENDING: { icon: "pending", tone: "neutral" },
  CONFIRMED: { icon: "dot", tone: "info" },
  SHIPPED: { icon: "next", tone: "accent" },
  DELIVERED: { icon: "check", tone: "success" },
  CANCELLED: { icon: "close", tone: "danger" },
} as const;

const PAYMENT = {
  UNPAID: { icon: "warning", tone: "warning" },
  PAID: { icon: "check", tone: "success" },
  FAILED: { icon: "close", tone: "danger" },
  REFUNDED: { icon: "refund", tone: "neutral" },
} as const;

const isOrderStatus = (s: string): s is (typeof ORDER_STATUSES)[number] =>
  (ORDER_STATUSES as readonly string[]).includes(s);
const isPaymentStatus = (s: string): s is (typeof PAYMENT_STATUSES)[number] =>
  (PAYMENT_STATUSES as readonly string[]).includes(s);

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Common.status");
  const s = isOrderStatus(status) ? ORDER[status] : ORDER.PENDING;
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {isOrderStatus(status) ? t(status) : status}
    </Badge>
  );
}

/** Payment state next to the order state: a cash-on-delivery order is confirmed but unpaid. */
export function PaymentBadge({ status }: { status: string }) {
  const t = useTranslations("Common.paymentStatus");
  const s = isPaymentStatus(status) ? PAYMENT[status] : PAYMENT.UNPAID;
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {isPaymentStatus(status) ? t(status) : status}
    </Badge>
  );
}
