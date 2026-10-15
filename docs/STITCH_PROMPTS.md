# Stitch prompts — Ember Roastery (every screen)

**How to use**

1. Paste **PART 1 (Master prompt)** into Stitch first. It defines the brand, colors, type, components, languages, themes and breakpoints. Don't generate screens until Stitch has accepted it as the design system.
2. Then paste **one screen prompt from PART 3 at a time** (each one starts with "Using the Ember Roastery design system…" so it still works if Stitch forgets the earlier message — in that case paste PART 1 again before it).
3. For each screen, ask for the variants in **PART 2 (Output matrix)**: Arabic RTL + English LTR, light + dark, mobile + tablet + desktop. Stitch usually does best with one variant per generation: generate the _Arabic · Light · Desktop_ version first, approve it, then ask "same screen, English LTR" / "dark mode" / "mobile 390 px" so the variants stay consistent.
4. After all screens exist, paste **PART 4 (Prototype flows)** to link them.

---

# PART 1 — MASTER PROMPT (paste first)

```
You are designing the complete UI of "Ember Roastery" — a specialty-coffee online shop (storefront for customers) plus an admin dashboard (orders, products, customers, analytics) used by shop staff. Design EVERY screen for desktop, tablet and mobile, in Arabic (RTL, primary language) and English (LTR), each in light and dark theme. Quality bar: polished, production-ready, warm, trustworthy, modern — like a small premium roaster, not a generic SaaS template.

═══ BRAND ═══
Name: "ember" (lowercase wordmark) with tagline "ROASTERY" (uppercase, wide letter-spacing 0.38em, tiny, bold).
Logo: a tilted coffee bean (rotated 28°, tall ellipse ~20×33 proportion) with an S-shaped glowing "ember" crease down the middle (outer crease in ember orange #E4572E, thin inner heat core in glow #FFA15C). Bean fill: espresso #1C1612 on light backgrounds, crema #FAF6F1 on dark backgrounds. Wordmark typeface: Bricolage Grotesque, weight 800–900, letter-spacing −0.04em. Logo variants: horizontal (bean + wordmark + tagline), stacked (bean on top, wordmark below, centered), mark only (bean). Favicon: rounded-square espresso tile with the bean.
Personality: warm, crafted, confident, calm. Words: roasted, ember, crema, espresso. Never cold blue-grey corporate. Generous whitespace, soft warm neutrals, ONE bold accent (ember orange), photography-free (use generated bean artwork, see Product art).

═══ COLOR SYSTEM (use these exact hex values) ═══
LIGHT THEME
- Background (page): #FAF6F1  (crema)
- Surface / card: #FFFFFF
- Border / divider: #E6DCD1
- Text primary: #1C1612  (espresso)
- Text secondary / muted: #6B5748   (6.3:1 on background — never use anything lighter for readable text)
- Accent (primary buttons, links, active nav, chart line): #C2410C   · hover #A8360A · text on accent #FFFFFF (5.2:1)
- Glow (decorative highlights only, never text): #FFA15C
- Danger text/borders: #B91C1C
- Hero banner: background #1C1612, text #FAF6F1 (an espresso panel with a soft ember radial glow rgba(228,87,46,0.30) at the logo side)
DARK THEME
- Background: #17110D · Surface/card: #211914 · Border: #3A2C23
- Text primary: #F3ECE4 · Muted: #B8A394
- Accent: #E4572E (true ember) · hover #F0693F · text on accent #1C1612 (4.9:1)
- Danger: #F87171 · Hero panel: #261B15 with the same ember glow
- Logo bean fill: #FAF6F1; "ROASTERY" tagline in ember #E4572E.
DERIVED RAMPS (for tints/hover/disabled states — stay inside these, don't invent new hues)
- Ember: 50 #FFF3ED · 100 #FFE2D3 · 200 #FFC2A3 · 300 #FF9C6E · 400 #F0693F · 500 #E4572E · 600 #C2410C · 700 #A8360A · 800 #86290A · 900 #5E1D07
- Roast-brown neutrals: 50 #FAF6F1 · 100 #F2EAE0 · 200 #E6DCD1 · 300 #D2C2B2 · 400 #B8A394 · 500 #8C7464 · 600 #6B5748 · 700 #4A382C · 800 #33261D · 900 #211914 · 950 #17110D
ORDER STATUS COLORS (always show icon + text, never color alone; pill with 1px border, transparent/very light fill)
- Pending ◔ muted brown (#6B5748 light / #B8A394 dark)
- Paid ● blue (light #1D4ED8 / dark #93C5FD)
- Shipped ➤ violet (light #6D28D9 / dark #C4B5FD)
- Delivered ✓ green (light #15803D / dark #4ADE80)
- Cancelled ✕ red (light #B91C1C / dark #F87171)
- Refunded ↩ amber (light #B45309 / dark #FBBF24)
Positive/negative deltas: ▲ green (#15803D / #4ADE80), ▼ red (#B91C1C / #F87171), always with arrow + number.
CHART PALETTE (categorical, fixed order, never cycled; 2px gap/ring in the card color between touching fills)
- Light: #2A78D6 · #EB6834 · #1BAF7A · #EDA100 · #E87BA4 · #008300
- Dark: #3987E5 · #D95926 · #199E70 · #C98500 · #D55181 · #008300
- Single-series charts (sales over time, sales by category, top products) use the ACCENT color. The "previous period" comparison line is muted brown, dashed. Gridlines: 1px dashed using the border color, horizontal only. Axis text: muted, 12px.
Rules: every text/background pair ≥ 4.5:1 (WCAG AA); focus ring = 2px accent outline with 2px offset on every interactive element; hover = slightly darker accent / subtle surface tint; disabled = 50% opacity.

═══ TYPOGRAPHY ═══
- Wordmark/brand moments only: Bricolage Grotesque (800).
- English UI text: Geist (fallback Inter / system-ui). Arabic UI text: IBM Plex Sans Arabic (fallbacks: Noto Sans Arabic, Cairo, Segoe UI). Mixed lines must look balanced (similar x-height, same weight).
- Scale (mobile → desktop): Display/hero 30 → 40 bold · H1 24 → 30 bold · H2 20 → 22 semibold · H3/card title 16 semibold · Body 15–16 regular · Small/meta 13–14 · Caption 12. Line-height 1.5 body, 1.25 headings. Arabic gets +4–6% line-height. KPI numbers 24–28 semibold, tabular figures.
- Numbers: Western digits (0–9) for prices, quantities, order numbers and KPIs in BOTH languages (e.g. "$187.92", "#52600"). Dates: Arabic "١٢ أكتوبر ٢٠٢٦" optional, English "Oct 12, 2026". Currency: USD, symbol first, two decimals ("$18.00").

═══ SHAPE, SPACE, ELEVATION ═══
4px base grid. Radii: inputs/buttons 8px · cards/tables 12px · hero panel 16px · pills/badges fully rounded · bean artwork square corners. Borders 1px (border color). Shadows nearly flat: cards have only the 1px border; hover on product cards adds a soft warm shadow 0 6px 20px rgba(28,22,18,0.10); dialogs/drawers 0 20px 50px rgba(0,0,0,0.25) with a 50% espresso scrim. Page container max-width 1152px (store) centered with 16px mobile / 24px tablet / 32px desktop side padding; dashboard content fluid beside a 224px sidebar. Touch targets ≥ 44×44px on mobile.

═══ COMPONENT LIBRARY (design these as reusable components) ═══
Buttons: Primary (accent fill, 40px high, 14–15px semibold), Secondary (card fill + border), Ghost/text link (underline on hover), Destructive outline (danger text + border), Icon button (36–44px square), all with hover/focus/disabled/loading (spinner + "Saving…") states. Inputs: label ABOVE the field always (never placeholder-only), 40px high, border color → accent on focus, inline error text under the field in danger color with an alert icon, helper text in muted. Select, checkbox, radio-as-pill (for product variants: selected = accent fill with accent-fg text), toggle, date input, search input with clear button, quantity stepper (− 2 +). Badges/status pills (see colors). KPI card (label, big number, delta with arrow). Product card (square artwork, category in muted 12px, name 16 semibold, price "$18.00" or "from $18.00", "Out of stock/نفذ" ribbon). Data table (sticky header, sortable column buttons with ↕ ▲ ▼ indicator, zebra none, row hover tint, 52px rows desktop, compact on mobile, horizontal scroll only inside the table card). Pagination (prev/next + "Page 2 of 14" + rows-per-page select 10/25/50/100). Filter bar (search, date range with presets "Last 7 days / This month / Last 3 months", multi-status checkboxes, min/max total, "Clear filters"). Chart cards (title, one-line hint "Click a point to see that period's orders", legend on top when ≥2 series, tooltip with value + context, "View as table" disclosure). Empty state (bean illustration mark, one sentence, one primary action). Loading skeletons (pulsing blocks matching final layout so nothing shifts). Error state (bean mark, "Something went wrong", Retry + Home). Toasts/inline status messages (success green ✓, error red). Confirm dialog for destructive actions. Skip-to-content link. Theme toggle (☾/☀), cart badge, language switch (AR | EN).

═══ DIRECTION & LANGUAGE RULES ═══
- Arabic = RTL: mirror the entire layout (logo and primary nav on the RIGHT, cart/theme/account on the LEFT, sidebar on the RIGHT, table first column on the right, text aligned right, back/forward chevrons mirrored, progress/steppers flow right→left). English = LTR: exact mirror.
- Do NOT mirror: logos, charts' time axes (time flows left→right in charts in both languages, which is the Arabic-web norm), numbers, phone numbers, SKUs, emails, URLs, card numbers, code (these stay LTR inside RTL text, wrapped with correct bidi isolation).
- Language switch (AR | EN) in the header on every screen; also in the mobile drawer.
- Provide real, natural copy in both languages (see PART 5 copy deck). Arabic copy is Modern Standard with a friendly tone (the app uses light Egyptian-friendly phrasing in microcopy); English copy is concise, warm, plain.

═══ THEMES & BREAKPOINTS ═══
Light and Dark for every screen. Dark is NOT inverted light: backgrounds are warm espresso (#17110D/#211914), accent shifts to true ember, borders stay visible (#3A2C23), shadows replaced by borders.
Breakpoints to deliver: Mobile 390×844 · Tablet 768×1024 · Desktop 1360×900 (also check 1536 wide). Mobile specifics: store filters collapse behind a "Filters & sort" toggle; admin sidebar becomes a slide-in drawer (opens from the right in RTL / left in LTR) with a ☰ button, scrim, close ✕, Esc/scrim to dismiss; tables keep 4 key columns (number, date, status, total) and hide customer/items; two-column product grid; bottom-aligned sticky primary action where useful (add to cart, checkout).

═══ PRODUCT ART ═══
No photography. Product images are generated brand art: a rich roast-brown square (#2B1F18…#50382B variations) with a soft ember radial glow behind a crema bean with ember crease, and the product name set in a serif (Georgia-like) in crema at the bottom, up to 3 lines. Category tiles reuse the same bean motif.

═══ ACCESSIBILITY ═══
WCAG AA contrast everywhere, visible focus rings, labels on all inputs, status never by color alone (icon + text), charts have a "View as table" alternative, reduced-motion friendly (no essential animation), minimum 44px touch targets, semantic headings (one H1 per screen, cards under it use H2).

═══ DEMO DATA (use realistic values, no lorem ipsum) ═══
Products (English names, shown in both languages): "Ethiopia Yirgacheffe – Light Roast", "Colombia Huila – Medium Roast", "Kenya AA – Light Roast", "Brazil Cerrado – Medium Roast", "Guatemala Antigua – Light Roast", "Sumatra Mandheling – Medium Roast", "V60 Dripper", "AeroPress", "Gooseneck Kettle", "Burr Grinder", "Monthly Coffee Subscription". Variants: "250g – Whole bean", "250g – Medium grind", "500g – Whole bean", "1kg – Whole bean". Prices $8–$78 (beans $18/$33/$60). Categories: Whole Bean Coffee / Ground Coffee / Brewing Equipment / Subscriptions. People: "Sarah Ahmed", "Omar Hassan", "Nour El-Din", "Layla Mansour" with emails like sarah.ahmed@example.com. Orders #52600… totals $42–$423. Dashboard figures: Sales $1,300,420.28 (▲ 48.9%), Orders 6,920 (▲ 47.9%), Avg. order $187.92 (▲ 0.7%), New customers 43 (▲ 38.7%).

Deliver a consistent, componentized design system and all screens listed next.
```

---

# PART 2 — OUTPUT MATRIX (ask for these variants for every screen)

| Dimension            | Values                                                        |
| -------------------- | ------------------------------------------------------------- |
| Language / direction | **Arabic · RTL** (primary) and **English · LTR**              |
| Theme                | **Light** and **Dark**                                        |
| Device               | **Mobile 390×844**, **Tablet 768×1024**, **Desktop 1360×900** |

Suggested order per screen: AR-Light-Desktop → AR-Light-Mobile → AR-Light-Tablet → AR-Dark (desktop + mobile) → EN-Light-Desktop → EN-Light-Mobile → EN-Dark.
Screens that need **state variants** are marked ⚑ below (loading skeleton, empty, error, filled/partial, read-only viewer).

Total: 21 core screens + state variants.

---

# PART 3 — SCREEN PROMPTS (paste one at a time)

Every prompt begins with the same sentence so it works standalone.

## STORE (customer-facing)

### S1 · Home `/`

```
Using the Ember Roastery design system (crema/espresso/ember, Arabic RTL + English LTR, light + dark, mobile 390 / tablet 768 / desktop 1360), design the STORE HOME page.
Header (sticky, card surface, 1px bottom border): horizontal logo (bean + "ember" + ROASTERY) at the start edge; nav link "المنتجات / Products"; at the end edge: Login link ("دخول / Log in") or user menu when signed in ("حسابي / My account", "لوحة التحكم / Dashboard" for staff, "خروج / Log out"), language switch AR|EN, theme toggle, cart link "🛒 العربة / Cart" with a small ember count badge. Mobile: logo + cart + a ☰ that opens a menu sheet containing all links, language and theme.
Hero: full-width 16px-radius espresso panel (#1C1612 light / #261B15 dark) with an ember radial glow and a LARGE crema bean (rotated 28°, ember crease + glow core) on the end side (hidden on mobile or shown small above the text). Headline (H1): "قهوة مختصة، محمصة بعناية" / "Specialty coffee, roasted with care"; subtext "بن من أفضل المزارع، وأدوات تحضير، واشتراكات توصلك لحد البيت." / "Beans from the best farms, brewing gear, and subscriptions delivered to your door."; primary button "تصفح المنتجات / Shop all products".
Sections below: (1) "التصنيفات / Categories": pill chips with a small bean icon — Whole Bean Coffee, Ground Coffee, Brewing Equipment, Subscriptions. (2) "الأكثر مبيعًا / Best sellers": 4 product cards (4 columns desktop, 2 columns mobile). (3) "وصل حديثًا / New arrivals": 4 product cards. Add a slim trust strip between sections: "شحن مجاني فوق $50 / Free shipping over $50 · محمّص طازج / Freshly roasted · دفع آمن / Secure payment".
Footer: centered logo, line "الدفع في هذا المتجر تجريبي (Stripe test mode)" / "Payments in this store run in test mode (Stripe test mode)", links Products · Cart · Account.
Include states: loading skeleton for the two product rows (cards with pulsing blocks). Show light + dark.
```

### S2 · Products listing `/products` ⚑

```
Using the Ember Roastery design system, design the PRODUCTS LISTING page.
Layout desktop: H1 "المنتجات / Products"; two columns — a 220px filter sidebar at the start edge and the results grid (3 columns) beside it. Sidebar form (labels above fields): Search "بحث / Search" (placeholder "اسم المنتج… / Product name…"), Category select (All / الكل + 4 categories), Price range two number inputs "أقل سعر ($) / Min price" and "أعلى سعر ($) / Max price", checkbox "المتوفر فقط / In stock only", Sort select "الترتيب / Sort by" (Newest الأحدث, Price: low to high السعر: من الأقل, Price: high to low السعر: من الأعلى, Name الاسم), buttons "تطبيق / Apply" (primary, grows) and "مسح / Clear" (secondary).
Results: small count line "20 منتج / 20 products", grid of product cards (square generated art, category in muted 12px, product name H2-styled 16 semibold, price "$18.00" or "from $18.00", "نفذ / Sold out" ribbon on unavailable ones), then pagination (numbered pages, current page filled with accent).
Mobile: filters collapse into a full-width toggle bar "⚙ الفلاتر والترتيب / Filters & sort" that expands the same form; grid is 2 columns.
Tablet: sidebar collapses to the toggle bar, grid 3 columns.
STATE VARIANTS: (a) loading skeleton (sidebar block + 12 skeleton cards, same footprint as results), (b) empty results: dashed-border panel, bean mark, "مفيش منتجات مطابقة للبحث. / No products match your search." + primary button "مسح الفلاتر / Clear filters", (c) filters applied example (Brewing Equipment, in stock, sorted by price low→high).
```

### S3 · Product detail `/products/[slug]`

```
Using the Ember Roastery design system, design the PRODUCT DETAIL page for "Ethiopia Yirgacheffe – Light Roast".
Desktop: two columns — large square product art (generated bean artwork) and the details column: category (muted), H1 product name, description paragraph (2–3 sentences about tasting notes), fieldset "اختر النوع / Choose a size" with radio-pill variants ("250g – Whole bean", "250g – Medium grind", "500g – Whole bean", "500g – Medium grind", "1kg – Whole bean", "1kg – Medium grind"; selected = accent fill; unavailable = 50% opacity with "نفذ / Out"), large price "$18.00" that changes with the selection, stock line ("متوفر / In stock" muted, "باقي 3 فقط / Only 3 left" amber, "نفذ من المخزون / Out of stock" danger), primary button "أضف للعربة / Add to cart" (full width on mobile, sticky bottom bar on mobile), and a live status line "اتضاف للعربة ✓ / Added to cart ✓" (green). Below: a "تفاصيل التحميص / Roast details" strip with 4 small attributes (Origin, Roast level, Process, Tasting notes) and a "منتجات مشابهة / You may also like" row of 4 cards.
Mobile: art on top (full width, square), then details; sticky bottom action bar with price + Add to cart.
STATE VARIANTS: default, a variant out of stock selected (button disabled, label "نفذ / Sold out"), max quantity already in cart ("وصلت للحد الأقصى المتاح / You've reached the maximum available"), and the "not found" product (reuse the 404 screen).
```

### S4 · Cart `/cart` ⚑

```
Using the Ember Roastery design system, design the CART page.
Desktop: H1 "العربة / Your cart". Two columns: a list card (each line: 80px square art, product name link, variant muted, unit price, quantity stepper − n +, line total, "حذف / Remove" text button in danger color) and an order-summary card (sticky): "ملخص الطلب / Order summary", rows "المجموع / Subtotal", "الشحن / Shipping" ("مجاني / Free" over $50, otherwise $5.00), total row bold "الإجمالي / Total", a free-shipping progress hint ("باقي $12.00 للشحن المجاني / $12.00 away from free shipping"), primary full-width button "إتمام الشراء / Checkout".
STATE VARIANTS: (a) filled with 3 lines, (b) a line with a stock problem: red inline alert under the line "المتاح 2 فقط / Only 2 available", "+" disabled, and the Checkout button disabled with the message "عدّل الكميات أو احذف المنتجات غير المتاحة قبل المتابعة. / Adjust quantities or remove unavailable items before continuing.", (c) an unavailable product row ("منتج لم يعد متاحًا / No longer available" + Remove), (d) EMPTY: dashed panel with bean mark, "العربة فاضية. / Your cart is empty." and button "ابدأ التسوق / Start shopping", (e) loading skeleton, (f) error with Retry ("حاول تاني / Try again").
Mobile: lines stack as cards; summary becomes a sticky bottom bar with total + Checkout.
```

### S5 · Checkout `/checkout` ⚑

```
Using the Ember Roastery design system, design the CHECKOUT page (signed-in customer).
Desktop: H1 "إتمام الشراء / Checkout". Left/start column: section "عنوان الشحن / Shipping address" as a 2-column form with labels above fields — Full name "الاسم الكامل", Phone "الهاتف", Address "العنوان" (full width), Address line 2 "تفاصيل إضافية (اختياري)", City "المدينة", Postal code "الرمز البريدي"; inline per-field errors appear after the user leaves a field (e.g. "رقم الهاتف غير صحيح / Invalid phone number") with an alert icon; primary button "الدفع / Pay" (becomes "جاري التحويل للدفع… / Redirecting to payment…" with spinner). Right/end column: order summary card with each line (name — variant ×qty, line total), shipping row, bold total, and a small tinted note: "وضع تجريبي: استخدم كارت Stripe 4242 4242 4242 4242 وأي تاريخ مستقبلي وأي CVC. / Test mode: use Stripe card 4242 4242 4242 4242, any future date, any CVC." (card number in LTR monospace). Show a small lock icon + "دفع آمن عبر Stripe / Secure payment by Stripe".
STATE VARIANTS: (a) clean form prefilled with the saved default address, (b) validation errors shown on 3 fields, (c) server error banner "الدفع غير مُفعّل / Payments unavailable" or stock error with "راجع العربة / Review cart" link, (d) VIEWER account: panel "حساب المشاهدة للاستعراض فقط ولا يمكنه إتمام الشراء. سجّل دخول بحساب عميل أو أنشئ حساب جديد. / The viewer account is read-only and can't check out. Sign in with a customer account or create one.", (e) empty cart message, (f) loading skeleton.
Mobile: summary collapses into an expandable "عرض ملخص الطلب / Show order summary" accordion at the top; Pay button sticky at bottom.
```

### S6 · Order confirmation `/checkout/success` ⚑

```
Using the Ember Roastery design system, design the ORDER CONFIRMATION page. Centered card (max 560px). Three states: (1) CONFIRMED — large green check inside an ember-glow circle, H1 "شكرًا! تم تأكيد أوردرك ✓ / Thank you! Your order is confirmed ✓", line "رقم الأوردر: #52600 — الحالة: مدفوع / Order #52600 — Status: Paid", itemised list card (name — variant ×qty, price), shipping, bold total, buttons "أوردراتي / My orders" (primary) and "متابعة التسوق / Continue shopping" (secondary); (2) CONFIRMING — "جاري تأكيد الدفع… / Confirming your payment…" with an animated ember progress ring and a note it refreshes automatically; (3) FAILED/REFUNDED — danger-toned alert "تعذّر إتمام الأوردر — للأسف المنتج نفذ أثناء الدفع، وتم رد المبلغ كاملًا. / We couldn't complete your order — an item sold out during payment, and you've been fully refunded." with a "تصفح المنتجات / Browse products" button. Mobile: full-width card, sticky bottom buttons.
```

### S7 · Account `/account`

```
Using the Ember Roastery design system, design the ACCOUNT page for a signed-in customer. H1 "حسابي / My account". Three stacked sections (on desktop use a 2-column layout: left narrow column "بياناتي" + addresses, right wide column orders): (1) "بياناتي / My details": name input (editable), email (read-only, muted), "حفظ / Save" button and a green "اتحفظ ✓ / Saved ✓" confirmation; (2) "أوردراتي / My orders": list card where each row shows "#52600", status pill (icon + text), date, total, and a muted one-line summary of items ("Ethiopia Yirgacheffe (250g) ×2، V60 Dripper ×1"); empty state "لسه مفيش أوردرات. / No orders yet." with a "تسوق الآن / Shop now" button; (3) "عناويني / My addresses": address cards (name, line1/line2, city + postal code, phone, "(افتراضي) / (Default)" tag, "حذف / Delete" danger text button) plus an "Add address" form (same 6 fields as checkout, "إضافة العنوان / Add address"). Include loading skeleton and field-error states. Mobile: sections stack, orders as compact cards.
```

### S8 · Login `/login` and S9 · Register `/register`

```
Using the Ember Roastery design system, design the LOGIN and REGISTER screens.
Layout: centered column (max 384px) on the crema/espresso page background, STACKED logo on top (clickable, goes home), H1, form, links. Desktop may add a decorative end-side panel (espresso with ember glow and a large crema bean) occupying 45% of the width; on mobile the panel disappears.
LOGIN: H1 "تسجيل الدخول / Log in"; fields Email "الإيميل / Email", Password "كلمة المرور / Password" (with show/hide eye); primary button "دخول / Log in"; below it a secondary full-width button "جرّب الداشبورد (حساب مشاهدة) / Try the dashboard (read-only demo)" with a small "demo" tag; link "معندكش حساب؟ سجّل دلوقتي / No account? Sign up". Error banner variant "الإيميل أو كلمة المرور غير صحيحة / Incorrect email or password" and per-field validation variant ("أدخل كلمة المرور / Enter your password").
REGISTER: H1 "إنشاء حساب / Create account"; fields Name "الاسم", Email, Password with a rule hint "8 حروف على الأقل وفيها رقم / At least 8 characters including a number" and a strength meter (ember → green); primary "إنشاء الحساب / Create account"; link "عندك حساب؟ سجّل دخول / Already have an account? Log in". Error variants: "الإيميل ده مسجل قبل كده / This email is already registered", "كلمة المرور 8 حروف على الأقل / Password must be at least 8 characters".
```

### S10 · 404 and S11 · Error

```
Using the Ember Roastery design system, design the 404 NOT FOUND page and the generic ERROR page. Centered composition inside the store layout: a large logo bean mark (80px), H1 ("الصفحة دي مش موجودة / This page doesn't exist" | "حصل خطأ غير متوقع / Something went wrong"), supporting sentence ("ممكن يكون الرابط اتغير أو المنتج اتشال من المتجر. / The link may have changed or the product was removed." | "جرّب تاني، ولو المشكلة استمرت ارجع للصفحة الرئيسية. / Try again; if it persists, go back home." plus a small monospace "Error code: abc123"), and two buttons (404: "تصفح المنتجات / Browse products" primary + "الرئيسية / Home" secondary; Error: "حاول تاني / Try again" primary + "الرئيسية / Home"). Also design the admin-area error variant inside the dashboard shell with a button "نظرة عامة / Overview".
```

---

## ADMIN DASHBOARD (staff-facing)

### A0 · Dashboard shell (appears on every admin screen)

```
Using the Ember Roastery design system, design the ADMIN SHELL used by every dashboard screen.
Desktop: fixed 224px sidebar at the START edge (right in Arabic, left in English), card surface with an end border: horizontal logo at the top, nav items with icon + label and a filled-accent active state — "نظرة عامة / Overview" 📊, "الأوردرات / Orders" 🧾, "المنتجات / Products" ☕, "العملاء / Customers" 👥, "التحليلات / Analytics" 📈 — and at the bottom a muted link "← العودة للمتجر / Back to store". Top bar (card surface, bottom border): on mobile a ☰ button; a pill "وضع المشاهدة — التعديل غير متاح / View-only mode — editing disabled" (amber outline) shown only for the VIEWER role; at the end edge the user name, theme toggle, language switch, "خروج / Log out". Main content area: 24–32px padding, page H1 + optional action button on the opposite side.
Mobile/tablet: sidebar becomes a slide-in drawer (from the start edge) opened by ☰ — shows a dialog titled "القائمة / Menu" with logo, close ✕, the same nav, scrim over the page, Esc/scrim dismiss, focus trapped. Include the drawer-open and drawer-closed frames.
Roles: ADMIN sees all action buttons; VIEWER sees the same screens with edit controls hidden/disabled and the amber view-only pill.
```

### A1 · Overview `/admin` ⚑

```
Using the Ember Roastery design system and the admin shell, design the DASHBOARD OVERVIEW.
Header row: H1 "نظرة عامة / Overview" and a segmented period selector "آخر 7 أيام / Last 7 days | آخر 30 يوم / Last 30 days (selected) | آخر 3 شهور / Last 3 months".
Row 1 — 4 KPI cards (4 columns desktop, 2 tablet, 1 mobile): "المبيعات / Sales" $1,300,420.28 ▲48.9%, "الأوردرات / Orders" 6,920 ▲47.9%, "متوسط قيمة الأوردر / Avg. order value" $187.92 ▲0.7%, "عملاء جدد / New customers" 43 ▲38.7%, each with "عن الفترة السابقة / vs. previous period" (and a variant with a negative ▼ red delta and a variant with "no data for the previous period").
Row 2 — card "المبيعات اليومية / Daily sales": smooth single line chart in accent color (2px, no dots, active dot with card-colored ring), dashed horizontal gridlines, y-axis in $ (e.g. $20k…$80k), x-axis dates (time flows left→right even in Arabic), hover tooltip (date, sales, orders), and a "عرض البيانات كجدول / View data as table" disclosure.
Row 3 — two cards: (wide) "آخر الأوردرات / Latest orders" — 8 rows with order number link, customer, status pill, date, total, plus "عرض الكل / View all" link; (narrow) "تنبيهات المخزون / Stock alerts" — rows "Product — variant" with pills "✕ نفذ / Out" (red) or "⚠ باقي 3 / 3 left" (amber), empty variant "كل الأصناف مخزونها كافٍ ✓ / All items are well stocked ✓".
STATE VARIANTS: loading skeletons for KPIs + chart, error card with Retry, and the data auto-refreshes every 30 s (tiny "آخر تحديث / Updated 14:07" caption). Mobile: KPIs 1 column (or 2×2 compact), chart full width 220px tall, recent orders as stacked cards.
```

### A2 · Orders list `/admin/orders` ⚑

```
Using the Ember Roastery design system and the admin shell, design the ORDERS page — the main data table (50,000+ rows, server-side paging).
Top: H1 "الأوردرات / Orders". Filter card (desktop, one wrapped row): Search "بحث (رقم، اسم، إيميل) / Search (number, name, email)"; From/To date inputs; preset buttons "آخر 7 أيام / Last 7 days", "الشهر ده / This month", "آخر 3 شهور / Last 3 months"; Total from/to ($); Status multi-select as a checkbox group (قيد الانتظار Pending, مدفوع Paid, تم الشحن Shipped, تم التسليم Delivered, ملغي Cancelled, مُسترد Refunded); "مسح الفلاتر / Clear filters". Mobile: the whole card collapses behind a "⚙ الفلاتر (مفعّلة) / Filters (active)" toggle.
Toolbar row: left/start = bulk-action bar (appears only when rows are selected, accent-outlined: "25 محدد / 25 selected", status select, "تطبيق على المحدد / Apply to selected", "إلغاء التحديد / Clear selection"); right/end = "آخر تحديث 05:49 م / Updated 5:49 PM", "الأعمدة / Columns" dropdown with checkboxes, "⬇ تصدير CSV / Export CSV". Optional drill-down chips "التصنيف: equipment ✕ / Category: equipment ✕".
Table card: columns [☐ select-all] · رقم Number (link, underlined) · التاريخ Date · العميل Customer (name + muted email) · الأصناف Items · الحالة Status (pill) · الإجمالي Total. Sortable headers with ↕/▲/▼ (current: Date ▼). 25 rows with realistic data. Footer: "50,000 أوردر — صفحة 1 من 2,000 / 50,000 orders — page 1 of 2,000", rows-per-page select, "السابق / Previous", "التالي / Next".
STATE VARIANTS: (a) default; (b) rows selected + bulk bar; (c) filters active (status Paid + date range) with "Clear filters"; (d) skeleton loading rows; (e) refetching (rows at 60% opacity); (f) empty "مفيش أوردرات مطابقة. / No matching orders." + Clear filters button; (g) error with "حاول تاني / Try again"; (h) bulk result message "تم تحديث 22 — تم تخطي 3: لا يمكن تغيير الحالة من PENDING إلى SHIPPED / Updated 22 — skipped 3: can't change status from PENDING to SHIPPED" (amber); (i) VIEWER: no checkboxes/bulk controls.
Mobile (390): show only Number, Date, Status, Total columns; the table scrolls horizontally inside its card only if needed; sticky header.
```

### A3 · Order detail `/admin/orders/[id]`

```
Using the Ember Roastery design system and the admin shell, design the ORDER DETAIL page. Header: H1 "أوردر #52600 / Order #52600", status pill, date. Desktop two columns: wide card "الأصناف / Items" (rows: product — variant ×qty, line price; then subtotal, shipping (or "مجاني / Free"), bold total) and a narrow column of cards: (1) "الحالة / Status": a select listing ONLY the allowed next statuses and a primary "تطبيق / Apply" button, a success line "اتحدّثت الحالة ✓ / Status updated ✓", an error line (e.g. invalid transition), and for destructive options (Cancelled, Refunded) a confirm dialog "تأكيد تغيير الحالة إلى "ملغي"؟ سيتم إرجاع المخزون. / Change status to Cancelled? Stock will be restored."; for final states the text "لا توجد تغييرات متاحة على هذه الحالة / No further changes available"; VIEWER sees "وضع المشاهدة: التعديل غير متاح / View-only: editing unavailable". (2) "العميل / Customer": name, email. (3) "عنوان الشحن / Shipping address": name, lines, city + postal, phone (LTR). Footer link "← كل الأوردرات / ← All orders". Add a vertical status timeline variant (Pending → Paid → Shipped → Delivered) with the current step in accent. Mobile: single column, status card first.
```

### A4 · Products list `/admin/products`

```
Using the Ember Roastery design system and the admin shell, design the ADMIN PRODUCTS list. H1 "المنتجات / Products" with primary button "+ منتج جديد / + New product" (hidden for VIEWER). Table card: Product (name link + "3 أنواع / 3 variants" muted), Category (hidden on mobile), Price (single "$17.00" or range "$16.00 – $30.00", LTR), Stock (total, with amber "⚠ منخفض / Low" tag when any variant is at/below its threshold), Status ("● ظاهر / Visible" green or "○ مخفي / Hidden" muted), and an "تعديل / Edit" (or "عرض / View" for viewers) link. Include empty state ("لسه مفيش منتجات. / No products yet." + "أضف أول منتج / Add your first product"), skeleton and mobile variants.
```

### A5 · Product form `/admin/products/new` and `/admin/products/[id]`

```
Using the Ember Roastery design system and the admin shell, design the PRODUCT FORM (create and edit) and the INVENTORY adjuster.
Card 1 "تفاصيل المنتج / Product details" (2-column grid): Name "اسم المنتج", Slug "الرابط (slug)" (LTR, auto-suggested from the name), Description textarea "الوصف", Category select "التصنيف", checkbox "ظاهر في المتجر / Visible in store", Image URLs textarea "روابط الصور (رابط في كل سطر) / Image URLs (one per line)" with small thumbnail previews.
Card 2 "الأنواع (Variants) / Variants": a dynamic list. Each row (grid on desktop, stacked card on mobile): Name "الاسم" (placeholder "250 جم - طحن متوسط / 250g – medium grind"), SKU, Price ($), Stock "المخزون الافتتاحي / Opening stock" (read-only with "(للقراءة) / read-only" label once saved), Low-stock threshold "حد التنبيه", and a ✕ remove button (only for unsaved rows); "+ إضافة نوع / + Add variant" button; per-field error messages under each input in danger color (e.g. "اسم النوع مطلوب / Variant name required", "السعر لازم يكون أكبر من صفر / Price must be greater than zero", "الـ SKU مطلوب / SKU required", "الـ SKU مستخدم في منتج آخر / SKU already used").
Actions: primary "إنشاء المنتج / Create product" / "حفظ التغييرات / Save changes" (with saving spinner), danger-outline "إخفاء المنتج / Hide product" (confirm dialog: "إخفاء المنتج من المتجر؟ الأوردرات القديمة هتفضل زي ما هي. / Hide this product from the store? Past orders stay intact."), success "اتحفظ ✓ / Saved ✓".
Card 3 (edit only) "تعديل المخزون / Adjust stock" with the helper "كل تعديل يتسجل في سجل المخزون مع السبب. / Every change is logged with a reason.": one row per variant — name + "الحالي: 285 / Current: 285", number input "المخزون الجديد / New stock", text input "السبب / Reason" (placeholder "مثلًا: جرد، تالف / e.g. recount, damaged"), "حفظ / Save", result text "اتسجل -6 ✓ / Logged -6 ✓". Optional collapsed "سجل المخزون / Stock history" table (date, change, reason, note).
VIEWER variant: all fields disabled, no action buttons. Mobile: single column, sticky bottom Save bar.
```

### A6 · Customers `/admin/customers`

```
Using the Ember Roastery design system and the admin shell, design the CUSTOMERS page. H1 "العملاء / Customers"; search card (name or email) with "مسح / Clear". Table: Customer (name + muted email), Orders count, Lifetime spend "إجمالي الإنفاق / Total spent" (bold, $), Last purchase "آخر شراء / Last purchase" (date or "—"), Joined "انضم في / Joined" (hidden below desktop). Sortable headers (default: spend ▼). Pagination "500 عميل — صفحة 1 من 20 / 500 customers — page 1 of 20". Variants: skeleton, empty ("مفيش عملاء مطابقين / No matching customers" + Clear search), error + Retry, mobile (Customer + Spend + Last purchase).
```

### A7 · Analytics `/admin/analytics` ⚑

```
Using the Ember Roastery design system and the admin shell, design the ANALYTICS page — the data-visualization showpiece.
Controls card (one wrapped row): From/To date inputs, preset buttons "7 أيام / 7 days · 30 يوم / 30 days · 3 شهور / 3 months · 12 شهر / 12 months", Granularity select "التجميع / Group by" (تلقائي Auto, يومي Daily, أسبوعي Weekly, شهري Monthly), and at the end edge two export buttons: secondary "⬇ CSV أوردرات الفترة / ⬇ CSV orders for the period" and primary "⬇ تقرير PDF / ⬇ PDF report".
KPI row: the same 4 KPI cards as Overview with deltas vs the previous period.
Chart 1 (full width) "المبيعات عبر الزمن / Sales over time" + hint "اضغط على نقطة لعرض أوردرات هذه الفترة / Click a point to see that period's orders": two lines — current period (accent, solid 2px) and previous period (muted brown, dashed 2px) with legend on top ("الفترة الحالية / Current period", "الفترة السابقة / Previous period"), tooltip showing date, sales, orders and previous-period value; y-axis in $, x-axis dates.
Chart 2 (half) "المبيعات حسب التصنيف / Sales by category": vertical bars in accent, 4px rounded top corners, y-axis $ (e.g. up to $1,200,000), category labels below, hover tooltip (sales, units), hint "اضغط على عمود… / Click a bar…".
Chart 3 (half) "الأكثر مبيعًا (أعلى 10) / Top 10 products": HORIZONTAL bars in accent, product names (English, truncated with …) on the start side, value axis $ below, tooltip (sales, units).
Chart 4 (full width) "توزيع حالات الأوردرات أسبوعيًا / Order status mix by week": stacked vertical bars, one segment per status using the categorical chart palette in this fixed order — Pending #2A78D6, Paid #EB6834, Shipped #1BAF7A, Delivered #EDA100, Cancelled #E87BA4, Refunded #008300 (dark theme uses the dark variants) — with a 2px card-colored gap between segments, legend on top with status names, tooltip listing all six counts for that week.
Under charts 2–4: a "عرض كجدول / View as table" disclosure listing rows as links (keyboard access to the same drill-down).
STATE VARIANTS: each chart card with loading skeleton, error + Retry, and "مفيش بيانات في الفترة دي. / No data for this period."; a hover state with tooltip; a "clicked bar → Orders page filtered" annotation. Mobile: charts stack full width, controls collapse into two rows, exports become a full-width button pair.
```

### A8 · PDF sales report (print layout, English only)

```
Using the Ember Roastery brand (espresso, crema, ember #C2410C accent, Helvetica-style type), design the A4 PORTRAIT "Sales report" PDF page. Top-left: bean mark + "ember ROASTERY" wordmark. Title "Sales report" in ember, subtitle with the date range "2026-09-13 to 2026-10-12". Row of 4 KPI boxes (Sales, Orders, Avg. order value, New customers) each with the % change vs the previous period in green/red text. Section "Sales over time": a compact bar chart of daily sales in ember. Section "Sales by category": a 3-column table (Category, Units, Sales). Section "Top products": a 3-column table (Product, Units, Sales). Footer centered "Page 1 of 1". Light only, print-friendly (no dark theme), thin #E6DCD1 rules.
```

---

# PART 4 — PROTOTYPE FLOWS (paste after the screens exist)

```
Link the generated screens into these clickable flows (keep the language and theme of the frame you start from):
1. Shopper: Home → Products → (apply filters) → Product detail → Add to cart (toast) → Cart → Checkout (guest is sent to Login first, then returned) → [Stripe test payment, out of scope: show a placeholder frame] → Order confirmation → My account (new order at the top).
2. Sign-up: Login → "Sign up" → Register → Home (signed in).
3. Reviewer: Login → "Try the dashboard" → Overview → Orders (filter by status, sort, next page) → Order detail → Analytics → click a category bar → Orders (filtered chip) → Customers.
4. Admin: Orders → select rows → bulk change status → result message; Products → New product → validation errors → success → Edit → Adjust stock → "Hide product".
5. Mobile: open drawer (☰) → navigate → drawer closes; Products "Filters & sort" toggle open/close.
6. Language/theme: the AR|EN switch and the ☾/☀ toggle swap the same screen between the four variants (AR-light, AR-dark, EN-light, EN-dark) without changing scroll position.
```

---

# PART 5 — COPY DECK (so nothing is invented)

| Key                                                           | Arabic                                                                                                                                      | English                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand                                                         | ember · ROASTERY                                                                                                                            | ember · ROASTERY                                                                                                                                |
| Nav: products / cart / log in / account / dashboard / log out | المنتجات / العربة / دخول / حسابي / لوحة التحكم / خروج                                                                                       | Products / Cart / Log in / My account / Dashboard / Log out                                                                                     |
| Hero title                                                    | قهوة مختصة، محمصة بعناية                                                                                                                    | Specialty coffee, roasted with care                                                                                                             |
| Hero sub                                                      | بن من أفضل المزارع، وأدوات تحضير، واشتراكات توصلك لحد البيت.                                                                                | Beans from the best farms, brewing gear, and subscriptions delivered to your door.                                                              |
| CTA                                                           | تصفح المنتجات                                                                                                                               | Shop all products                                                                                                                               |
| Sections                                                      | التصنيفات · الأكثر مبيعًا · وصل حديثًا                                                                                                      | Categories · Best sellers · New arrivals                                                                                                        |
| Filters                                                       | بحث · التصنيف · أقل سعر ($) · أعلى سعر ($) · المتوفر فقط · الترتيب · تطبيق · مسح                                                            | Search · Category · Min price ($) · Max price ($) · In stock only · Sort by · Apply · Clear                                                     |
| Sort options                                                  | الأحدث · السعر: من الأقل · السعر: من الأعلى · الاسم                                                                                         | Newest · Price: low to high · Price: high to low · Name                                                                                         |
| Stock                                                         | متوفر · باقي N فقط · نفذ من المخزون · نفذ                                                                                                   | In stock · Only N left · Out of stock · Sold out                                                                                                |
| Product                                                       | اختر النوع · أضف للعربة · اتضاف للعربة ✓                                                                                                    | Choose a size · Add to cart · Added to cart ✓                                                                                                   |
| Cart                                                          | العربة · العربة فاضية. · ابدأ التسوق · ملخص الطلب · المجموع · الشحن · مجاني · الإجمالي · إتمام الشراء · حذف                                 | Your cart · Your cart is empty. · Start shopping · Order summary · Subtotal · Shipping · Free · Total · Checkout · Remove                       |
| Checkout fields                                               | الاسم الكامل · الهاتف · العنوان · تفاصيل إضافية (اختياري) · المدينة · الرمز البريدي · الدفع                                                 | Full name · Phone · Address · Address line 2 (optional) · City · Postal code · Pay                                                              |
| Validation                                                    | الاسم قصير جدًا · رقم الهاتف غير صحيح · اكتب العنوان بالتفصيل · اكتب المدينة · الرمز البريدي غير صحيح                                       | Name is too short · Invalid phone number · Enter the full address · Enter the city · Invalid postal code                                        |
| Auth                                                          | تسجيل الدخول · إنشاء حساب · الإيميل · كلمة المرور · الاسم · دخول · إنشاء الحساب · جرّب الداشبورد (حساب مشاهدة)                              | Log in · Create account · Email · Password · Name · Log in · Create account · Try the dashboard (read-only demo)                                |
| Auth errors                                                   | الإيميل أو كلمة المرور غير صحيحة · البريد الإلكتروني غير صحيح · كلمة المرور 8 حروف على الأقل · لازم تحتوي على رقم · الإيميل ده مسجل قبل كده | Incorrect email or password · Invalid email · Password must be at least 8 characters · Must include a number · This email is already registered |
| Statuses                                                      | قيد الانتظار · مدفوع · تم الشحن · تم التسليم · ملغي · مُسترد                                                                                | Pending · Paid · Shipped · Delivered · Cancelled · Refunded                                                                                     |
| Admin nav                                                     | نظرة عامة · الأوردرات · المنتجات · العملاء · التحليلات · العودة للمتجر                                                                      | Overview · Orders · Products · Customers · Analytics · Back to store                                                                            |
| KPIs                                                          | المبيعات · الأوردرات · متوسط قيمة الأوردر · عملاء جدد · عن الفترة السابقة                                                                   | Sales · Orders · Avg. order value · New customers · vs. previous period                                                                         |
| Table                                                         | رقم · التاريخ · العميل · الأصناف · الحالة · الإجمالي · السابق · التالي · الصفوف · الأعمدة · تصدير CSV · مسح الفلاتر                         | Number · Date · Customer · Items · Status · Total · Previous · Next · Rows · Columns · Export CSV · Clear filters                               |
| Viewer                                                        | وضع المشاهدة — التعديل غير متاح                                                                                                             | View-only mode — editing disabled                                                                                                               |
| States                                                        | جاري التحميل… · حاول تاني · حصل خطأ غير متوقع · مفيش أوردرات مطابقة. · مفيش بيانات في الفترة دي.                                            | Loading… · Try again · Something went wrong · No matching orders. · No data for this period.                                                    |
| Footer                                                        | الدفع في هذا المتجر تجريبي (Stripe test mode)                                                                                               | Payments in this store run in test mode (Stripe test mode)                                                                                      |

---

# PART 6 — QUALITY CHECKLIST (ask Stitch to self-verify, or check yourself)

- [ ] Every screen exists in AR-RTL and EN-LTR, light and dark, mobile/tablet/desktop.
- [ ] Only the palette above is used; one ember accent per view; no stock-blue SaaS look.
- [ ] Layouts are truly mirrored in RTL; numbers, emails, SKUs, phone numbers stay LTR; chart time axes run left→right.
- [ ] Status is always icon + text; deltas always arrow + number; charts have a table alternative.
- [ ] Every data screen has loading, empty, error (and viewer/read-only where relevant) states.
- [ ] Labels above inputs, inline errors in danger color, visible focus rings, 44px touch targets on mobile.
- [ ] Logo: bean rotated 28° with S-crease; cream bean on dark, espresso bean on light; tagline "ROASTERY" spaced.
- [ ] Skeletons match final layout (no layout shift); mobile filters collapse; admin sidebar becomes a drawer.
