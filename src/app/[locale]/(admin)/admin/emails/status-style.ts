/** Badge colors per email status, from the theme tokens (same look as the payment badges). */
export const EMAIL_STATUS_STYLE = {
  sent: "border-success text-success",
  failed: "border-danger text-danger",
  logged_only: "border-border text-muted",
} as const;
