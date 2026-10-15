import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Button } from "./button";
import { Sheet } from "./sheet";

const meta = { title: "Primitives/Sheet" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ side }: { side: "end" | "bottom" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open {side} sheet</Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Edit shipping zone"
        closeLabel="Close"
        side={side}
      >
        <h2 className="text-lg font-semibold">Greater Cairo</h2>
        <p className="text-sm text-muted-foreground">
          Escape or a click on the backdrop closes it. Focus returns to the button.
        </p>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Done
        </Button>
      </Sheet>
    </>
  );
}

export const FromTheEnd: Story = { render: () => <Demo side="end" /> };
export const FromTheBottom: Story = { render: () => <Demo side="bottom" /> };
