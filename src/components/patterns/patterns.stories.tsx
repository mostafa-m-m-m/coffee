import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Price } from "@/components/price";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { KpiCard } from "./kpi-card";
import { PageHeader } from "./page-header";
import { Timeline } from "./timeline";

const meta = { title: "Patterns/Overview" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const KpiCards: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Sales"
        value={<Price cents={130070700} />}
        change={30}
        trend={[3, 5, 4, 8, 6, 9, 12, 10]}
      />
      <KpiCard label="Orders" value="370" change={-12.4} trend={[9, 8, 8, 6, 7, 5, 6, 4]} />
      <KpiCard label="Average order value" value={<Price cents={351542} />} change={0} />
      <KpiCard label="New customers" value="6" change={null} />
    </div>
  ),
};

export const EmptyStates: Story = {
  render: () => (
    <div className="grid max-w-xl gap-4">
      <EmptyState
        title="No products match your search."
        hint="Try a shorter word or clear the filters."
        action={<Button variant="secondary">Clear filters</Button>}
      />
      <EmptyState title="No orders yet." />
    </div>
  ),
};

export const Header: Story = {
  render: () => (
    <PageHeader
      title="Orders"
      intro="Everything customers have ordered. Filters stay in the address bar."
      actions={
        <>
          <Button variant="secondary">Export CSV</Button>
          <Button>New order</Button>
        </>
      }
    />
  ),
};

export const OrderTimeline: Story = {
  render: () => (
    <Timeline
      label="Order progress"
      items={[
        { id: "1", title: "Order placed", meta: "Oct 12, 10:04 · Customer" },
        { id: "2", title: "Payment received", meta: "Oct 12, 10:05 · System" },
        { id: "3", title: "Shipped", meta: "Oct 13, 09:30 · Admin" },
        { id: "4", title: "Delivered", done: false },
      ]}
    />
  ),
};

export const ProductCards: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-3">
      <ProductCard
        p={{
          name: "Ethiopia Yirgacheffe",
          slug: "ethiopia-yirgacheffe",
          image: "/logo-mark.svg",
          category: { name: "Single origin" },
          origin: "Ethiopia",
          tastingNotes: ["floral", "citrus", "honey"],
          minPrice: 36000,
          maxPrice: 72000,
          inStock: true,
        }}
      />
      <ProductCard
        p={{
          name: "Colombia Huila",
          slug: "colombia-huila",
          image: "/logo-mark.svg",
          category: { name: "Single origin" },
          origin: "Colombia",
          tastingNotes: ["caramel", "cocoa"],
          minPrice: 32000,
          maxPrice: 32000,
          inStock: false,
        }}
      />
    </div>
  ),
};
