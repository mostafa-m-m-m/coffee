import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "./card";

const meta = { title: "Primitives/Card", component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Order summary</CardTitle>
      </CardHeader>
      <CardContent>Two items, shipped to Cairo in 2 days.</CardContent>
    </Card>
  ),
};

export const Loading: Story = {
  render: () => (
    <Card className="max-w-sm space-y-3 p-4" aria-busy="true">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </Card>
  ),
};
