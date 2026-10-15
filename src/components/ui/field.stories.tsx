import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Field, Input, Select, Textarea } from "./field";

const meta = { title: "Primitives/Field" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  render: () => (
    <div className="grid max-w-sm gap-4">
      <Field id="n" label="Full name" hint="As it should appear on the invoice">
        <Input id="n" placeholder="Mona Hassan" />
      </Field>
      <Field id="p" label="Mobile number">
        <Input id="p" placeholder="01xxxxxxxxx" inputMode="numeric" dir="ltr" />
      </Field>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="grid max-w-sm gap-4">
      <Field id="e" label="Mobile number" error="Enter a valid Egyptian mobile number">
        <Input id="e" invalid defaultValue="0123" dir="ltr" />
      </Field>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field id="d" label="Email" className="max-w-sm">
      <Input id="d" disabled defaultValue="customer@coffee.test" dir="ltr" />
    </Field>
  ),
};

export const SelectAndTextarea: Story = {
  render: () => (
    <div className="grid max-w-sm gap-4">
      <Field id="g" label="Governorate">
        <Select id="g" defaultValue="C">
          <option value="C">Cairo</option>
          <option value="GZ">Giza</option>
          <option value="ALX">Alexandria</option>
        </Select>
      </Field>
      <Field id="t" label="Delivery notes">
        <Textarea id="t" placeholder="Anything the courier should know" />
      </Field>
    </div>
  ),
};
