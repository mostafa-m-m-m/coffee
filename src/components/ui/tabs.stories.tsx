import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tabs } from "./tabs";

const meta = { title: "Primitives/Tabs", component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tabs: [
      {
        id: "description",
        label: "Description",
        content: <p>Bright and floral, with a tea-like body.</p>,
      },
      {
        id: "brewing",
        label: "Brewing guide",
        content: <p>Filter: medium grind, 1:16, 94 °C, about 3 minutes.</p>,
      },
      {
        id: "shipping",
        label: "Shipping",
        content: <p>We deliver across Egypt in 2 to 5 days.</p>,
      },
    ],
  },
};
