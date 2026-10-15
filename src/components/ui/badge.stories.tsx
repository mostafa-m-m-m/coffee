import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PaymentBadge, StatusBadge } from "@/components/patterns/status-badge";
import { Badge } from "./badge";

const meta = { title: "Primitives/Badge", component: Badge } satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Neutral</Badge>
      <Badge tone="success" icon="check">
        Success
      </Badge>
      <Badge tone="warning" icon="warning">
        Warning
      </Badge>
      <Badge tone="danger" icon="close">
        Danger
      </Badge>
      <Badge tone="info" icon="dot">
        Info
      </Badge>
      <Badge tone="accent" icon="next">
        Accent
      </Badge>
    </div>
  ),
};

/** Order and payment states are text plus a symbol, never color alone. */
export const OrderAndPaymentStatuses: Story = {
  render: () => (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["UNPAID", "PAID", "FAILED", "REFUNDED"].map((s) => (
          <PaymentBadge key={s} status={s} />
        ))}
      </div>
    </div>
  ),
};
