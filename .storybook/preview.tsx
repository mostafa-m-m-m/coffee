import { withThemeByClassName } from "@storybook/addon-themes";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useEffect } from "react";
import { directions } from "../src/i18n/config";
import { formatsFor } from "../src/i18n/formats";
import { messages } from "../src/i18n/messages";
import { brandCss } from "../src/lib/brand";
import { STORE_TIME_ZONE } from "../src/lib/config";
import "../src/app/globals.css";

/** The design tokens, injected the same way the root layout does it. */
const Tokens: Decorator = (Story) => (
  <>
    <style dangerouslySetInnerHTML={{ __html: brandCss() }} />
    <Story />
  </>
);

/** Language toolbar: sets `lang` and `dir` on the document, so Arabic stories mirror for real. */
const Language: Decorator = (Story, ctx) => {
  const locale = (ctx.globals.locale ?? "en") as "ar" | "en";
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = directions[locale];
  }, [locale]);
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      formats={formatsFor(locale)}
      timeZone={STORE_TIME_ZONE}
    >
      <div
        className="min-h-24 bg-background p-4 text-foreground"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <Story />
      </div>
    </NextIntlClientProvider>
  );
};

const preview: Preview = {
  globalTypes: {
    locale: {
      description: "Language",
      toolbar: {
        title: "Language",
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "ar", title: "العربية" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: "en" },
  decorators: [
    withThemeByClassName({ themes: { light: "", dark: "dark" }, defaultTheme: "light" }),
    Language,
    Tokens,
  ],
  parameters: {
    layout: "padded",
    controls: { expanded: true },
    a11y: { test: "error" },
    backgrounds: { disable: true },
  },
};

export default preview;
