/**
 * The two ready-made accounts of the demo store. The seed creates them verified, with this shared
 * password, so a reviewer can look around with one click. The password is public on purpose:
 * the customer account cannot change its password and the viewer account cannot change any data.
 */
export const DEMO_PASSWORD = "Password123";

export const DEMO_ACCOUNTS = {
  customer: { email: "customer@coffee.test", landing: "/account" },
  viewer: { email: "viewer@coffee.test", landing: "/admin" },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;
