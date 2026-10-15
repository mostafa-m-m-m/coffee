import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { directions, type Locale } from "@/i18n/config";
import { brand } from "@/lib/brand";

const c = brand.light;
// Mail clients ignore web fonts, so stay with fonts every system has (Arabic included).
const font = "'Segoe UI', Tahoma, Arial, sans-serif";

/** Shared frame of every email: brand wordmark, a white card on the warm background, the demo footer. */
export function EmailLayout({
  locale,
  preview,
  footer,
  children,
}: {
  locale: Locale;
  preview: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <Html lang={locale} dir={directions[locale]}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: c.background,
          margin: 0,
          padding: "24px 0",
          fontFamily: font,
          color: c.foreground,
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto" }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "0 0 16px",
              color: brand.logo.espresso,
            }}
          >
            {brand.shortName.toLowerCase()}
            <span style={{ color: brand.logo.ember }}>.</span>
          </Text>
          <Section
            style={{
              backgroundColor: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            {children}
          </Section>
          <Hr style={{ borderColor: c.border, margin: "20px 0 12px" }} />
          <Text style={{ fontSize: 12, color: c.muted, margin: 0 }}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  heading: { fontSize: 20, fontWeight: 700, margin: "0 0 12px" },
  text: { fontSize: 15, lineHeight: "24px", margin: "0 0 12px" },
  muted: { fontSize: 13, color: c.muted, margin: "16px 0 0" },
  button: {
    display: "inline-block",
    backgroundColor: c.accent,
    color: c.accentFg,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 15,
    padding: "10px 20px",
    borderRadius: 8,
    margin: "8px 0",
  },
  row: { fontSize: 14, margin: "0 0 6px" },
  border: c.border,
  muted_: c.muted,
} as const;
