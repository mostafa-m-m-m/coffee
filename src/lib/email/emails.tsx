import { Button, Hr, Section, Text } from "@react-email/components";
import type { Locale } from "@/i18n/config";
import { VAT_RATE, RESET_TOKEN_HOURS, VERIFY_TOKEN_HOURS } from "@/lib/config";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { pick } from "@/lib/i18n/localized";
import { createToken } from "@/lib/services/auth-tokens";
import { siteUrl } from "@/lib/site";
import { emailContext, type EmailContext } from "./context";
import { EmailLayout, emailStyles as s } from "./layout";
import { sendEmail } from "./send";

type Recipient = { id: string; email: string; name: string; locale: Locale };

const link = (locale: Locale, path: string) => `${siteUrl()}/${locale}${path}`;

function LinkEmail({
  ctx,
  locale,
  kind,
  name,
  url,
  expiresNote,
}: {
  ctx: EmailContext;
  locale: Locale;
  kind: "verify" | "reset";
  name: string;
  url: string;
  expiresNote?: string;
}) {
  const { t } = ctx;
  return (
    <EmailLayout locale={locale} preview={t(`${kind}.subject`)} footer={t("footer")}>
      <Text style={s.heading}>{t(`${kind}.heading`)}</Text>
      <Text style={s.text}>{t("greeting", { name })}</Text>
      <Text style={s.text}>
        {t(kind === "reset" ? "reset.text" : "verify.text", { hours: RESET_TOKEN_HOURS })}
      </Text>
      <Button href={url} style={s.button}>
        {t(`${kind}.button`)}
      </Button>
      {expiresNote && <Text style={s.muted}>{expiresNote}</Text>}
      <Text style={s.muted}>{t("ignore")}</Text>
    </EmailLayout>
  );
}

export async function sendVerifyEmail(user: Recipient) {
  const ctx = emailContext(user.locale);
  const token = await createToken(user.id, "verify", VERIFY_TOKEN_HOURS);
  return sendEmail({
    to: user.email,
    type: "verify",
    subject: ctx.t("verify.subject"),
    react: (
      <LinkEmail
        ctx={ctx}
        locale={user.locale}
        kind="verify"
        name={user.name}
        url={link(user.locale, `/verify-email?token=${token}`)}
      />
    ),
  });
}

export async function sendResetEmail(user: Recipient) {
  const ctx = emailContext(user.locale);
  const token = await createToken(user.id, "reset", RESET_TOKEN_HOURS);
  return sendEmail({
    to: user.email,
    type: "reset",
    subject: ctx.t("reset.subject"),
    react: (
      <LinkEmail
        ctx={ctx}
        locale={user.locale}
        kind="reset"
        name={user.name}
        url={link(user.locale, `/reset-password?token=${token}`)}
      />
    ),
  });
}

async function loadOrder(orderId: string) {
  return db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true, name: true } } },
  });
}
type LoadedOrder = Awaited<ReturnType<typeof loadOrder>>;

type Address = {
  fullName?: string;
  governorate?: string;
  area?: string;
  street?: string;
  building?: string;
};

function OrderConfirmedEmail({ ctx, order }: { ctx: EmailContext; order: LoadedOrder }) {
  const { t, tCommon, f } = ctx;
  const locale = order.locale;
  const a = order.shippingAddress as Address;
  const gov = a.governorate ? tCommon(`governorates.${a.governorate}` as never) : "";
  const number = String(order.orderNumber);
  return (
    <EmailLayout
      locale={locale}
      preview={t("orderConfirmed.subject", { number })}
      footer={t("footer")}
    >
      <Text style={s.heading}>{t("orderConfirmed.heading")}</Text>
      <Text style={s.text}>{t("greeting", { name: order.user.name })}</Text>
      <Text style={s.text}>{t("orderConfirmed.text", { number })}</Text>

      <Text style={{ ...s.row, fontWeight: 700, marginTop: 16 }}>{t("orderConfirmed.items")}</Text>
      {order.items.map((i) => (
        <Text key={i.id} style={s.row}>
          {pick(i.productName, locale)} — {pick(i.variantName, locale)} ×{" "}
          {f.number(i.quantity, "integer")}
          {" · "}
          {money(f, i.unitPriceCents * i.quantity)}
        </Text>
      ))}
      <Hr style={{ borderColor: s.border, margin: "12px 0" }} />
      <Text style={s.row}>
        {t("orderConfirmed.subtotal")}: {money(f, order.subtotalCents)}
      </Text>
      <Text style={s.row}>
        {t("orderConfirmed.shipping")}:{" "}
        {order.shippingCents === 0
          ? t("orderConfirmed.freeShipping")
          : money(f, order.shippingCents)}
      </Text>
      <Text style={{ ...s.row, color: s.muted_ }}>
        {t("orderConfirmed.vat", { rate: VAT_RATE })}: {money(f, order.vatCents)}
      </Text>
      <Text style={{ ...s.row, fontWeight: 700, fontSize: 16 }}>
        {t("orderConfirmed.total")}: {money(f, order.totalCents)}
      </Text>

      <Section>
        <Text style={s.row}>
          {order.paymentMethod === "COD"
            ? t("orderConfirmed.payCourier", { amount: money(f, order.totalCents) })
            : t("orderConfirmed.paidByCard")}
        </Text>
        <Text style={s.muted}>
          {t("orderConfirmed.deliverTo")}:{" "}
          {[a.fullName, a.building, a.street, a.area, gov]
            .filter(Boolean)
            .join(tCommon("listSeparator"))}
        </Text>
      </Section>
      <Button href={link(locale, "/account")} style={s.button}>
        {t("orderConfirmed.view")}
      </Button>
    </EmailLayout>
  );
}

function SimpleOrderEmail({
  ctx,
  order,
  kind,
}: {
  ctx: EmailContext;
  order: LoadedOrder;
  kind: "shipped" | "apology";
}) {
  const { t } = ctx;
  const number = String(order.orderNumber);
  return (
    <EmailLayout
      locale={order.locale}
      preview={t(`${kind}.subject`, { number })}
      footer={t("footer")}
    >
      <Text style={s.heading}>{t(`${kind}.heading`)}</Text>
      <Text style={s.text}>{t("greeting", { name: order.user.name })}</Text>
      <Text style={s.text}>{t(`${kind}.text`, { number })}</Text>
      {kind === "shipped" && (
        <Button href={link(order.locale, "/account")} style={s.button}>
          {t("orderConfirmed.view")}
        </Button>
      )}
    </EmailLayout>
  );
}

/** "It's back" email to one person waiting for a variant (see services/back-in-stock). */
export async function sendBackInStock(subscriberId: string) {
  const sub = await db.subscriber.findUniqueOrThrow({
    where: { id: subscriberId },
    include: { variant: { include: { product: { select: { slug: true, name: true } } } } },
  });
  if (!sub.variant) return "failed" as const;
  const ctx = emailContext(sub.locale);
  const { t } = ctx;
  const values = {
    name: pick(sub.variant.product.name, sub.locale),
    variant: pick(sub.variant.name, sub.locale),
  };
  return sendEmail({
    to: sub.email,
    type: "back_in_stock",
    subject: t("backInStock.subject", values),
    react: (
      <EmailLayout
        locale={sub.locale}
        preview={t("backInStock.subject", values)}
        footer={t("footer")}
      >
        <Text style={s.heading}>{t("backInStock.heading")}</Text>
        <Text style={s.text}>{t("backInStock.text", values)}</Text>
        <Button href={link(sub.locale, `/products/${sub.variant.product.slug}`)} style={s.button}>
          {t("backInStock.button")}
        </Button>
      </EmailLayout>
    ),
  });
}

export async function sendOrderConfirmed(orderId: string) {
  const order = await loadOrder(orderId);
  const ctx = emailContext(order.locale);
  return sendEmail({
    to: order.user.email,
    type: "order_confirmed",
    subject: ctx.t("orderConfirmed.subject", { number: String(order.orderNumber) }),
    react: <OrderConfirmedEmail ctx={ctx} order={order} />,
    orderId,
  });
}

export async function sendOrderUpdate(orderId: string, kind: "shipped" | "apology") {
  const order = await loadOrder(orderId);
  const ctx = emailContext(order.locale);
  return sendEmail({
    to: order.user.email,
    type: kind,
    subject: ctx.t(`${kind}.subject`, { number: String(order.orderNumber) }),
    react: <SimpleOrderEmail ctx={ctx} order={order} kind={kind} />,
    orderId,
  });
}
