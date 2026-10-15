import {
  Document,
  Ellipse,
  G,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { brand } from "@/lib/brand";

/** The logo's bean + wordmark, drawn natively so the PDF carries the brand without an image asset. */
function Brand() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
      <Svg width={28} height={28} viewBox="0 0 80 80">
        <G transform="translate(40 40) rotate(28)">
          <Ellipse cx={0} cy={0} rx={20} ry={33} fill={brand.logo.espresso} />
          <Path
            d="M 0 -27 C 10 -13 -10 13 0 27"
            stroke={brand.logo.ember}
            strokeWidth={5.2}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M 0 -19 C 7 -9 -7 9 0 19"
            stroke={brand.logo.glow}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={{ marginLeft: 8 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 15, color: brand.logo.espresso }}>
          ember
        </Text>
        <Text
          style={{
            fontFamily: "Helvetica-Bold",
            fontSize: 6,
            letterSpacing: 2.4,
            color: brand.light.muted,
          }}
        >
          ROASTERY
        </Text>
      </View>
    </View>
  );
}

type Kpis = { salesCents: number; orders: number; aovCents: number; newCustomers: number };
export type ReportData = {
  from: string;
  to: string; // inclusive, ISO date
  current: Kpis;
  previous: Kpis;
  series: { date: string; salesCents: number }[];
  categories: { name: string; salesCents: number; units: number }[];
  topProducts: { name: string; salesCents: number; units: number }[];
};

// The built-in PDF fonts have no Arabic glyphs/shaping, so the report is in English.
const c = {
  ink: brand.light.foreground,
  muted: brand.light.muted,
  line: brand.light.border,
  accent: brand.light.accent, // brand ember, the AA-safe shade
  up: brand.light.success,
  down: brand.light.danger,
};
const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: c.ink, fontFamily: "Helvetica" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", color: c.accent },
  sub: { color: c.muted, marginTop: 2, marginBottom: 16 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  kpis: { flexDirection: "row", gap: 8 },
  kpi: { flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 4, padding: 8 },
  kpiLabel: { color: c.muted, fontSize: 8 },
  kpiValue: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    paddingVertical: 4,
  },
  th: { fontFamily: "Helvetica-Bold", color: c.muted },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: c.muted,
    textAlign: "center",
  },
});

const egp = (cents: number) =>
  `EGP ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (cur: number, prev: number) => {
  if (prev === 0) return { text: "n/a vs previous period", color: c.muted };
  const v = ((cur - prev) / prev) * 100;
  return {
    text: `${v >= 0 ? "+" : ""}${v.toFixed(1)}% vs previous period`,
    color: v >= 0 ? c.up : c.down,
  };
};

function Kpi({
  label,
  value,
  cur,
  prev,
}: {
  label: string;
  value: string;
  cur: number;
  prev: number;
}) {
  const p = pct(cur, prev);
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={{ fontSize: 7, color: p.color, marginTop: 2 }}>{p.text}</Text>
    </View>
  );
}

function BarChart({ data }: { data: { date: string; salesCents: number }[] }) {
  const W = 520;
  const H = 110;
  const max = Math.max(1, ...data.map((d) => d.salesCents));
  const gap = 1;
  const bw = Math.max(1, (W - gap * (data.length - 1)) / Math.max(1, data.length));
  return (
    <Svg width={W} height={H}>
      <Rect x={0} y={H - 0.5} width={W} height={0.5} fill={c.line} />
      {data.map((d, i) => {
        const h = (d.salesCents / max) * (H - 8);
        return (
          <Rect key={d.date} x={i * (bw + gap)} y={H - h} width={bw} height={h} fill={c.accent} />
        );
      })}
    </Svg>
  );
}

function Table({ head, rows, widths }: { head: string[]; rows: string[][]; widths: number[] }) {
  return (
    <View>
      <View style={s.row}>
        {head.map((h, i) => (
          <Text
            key={h}
            style={[s.th, { width: `${widths[i]}%`, textAlign: i === 0 ? "left" : "right" }]}
          >
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.row} wrap={false}>
          {r.map((cell, i) => (
            <Text key={i} style={{ width: `${widths[i]}%`, textAlign: i === 0 ? "left" : "right" }}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function SalesReport({ data }: { data: ReportData }) {
  const { current: cur, previous: prev } = data;
  return (
    <Document title={`Sales report ${data.from} to ${data.to}`}>
      <Page size="A4" style={s.page}>
        <Brand />
        <Text style={s.h1}>Sales report</Text>
        <Text style={s.sub}>
          {data.from} to {data.to}
        </Text>

        <View style={s.kpis}>
          <Kpi
            label="Sales"
            value={egp(cur.salesCents)}
            cur={cur.salesCents}
            prev={prev.salesCents}
          />
          <Kpi label="Orders" value={String(cur.orders)} cur={cur.orders} prev={prev.orders} />
          <Kpi
            label="Avg. order value"
            value={egp(cur.aovCents)}
            cur={cur.aovCents}
            prev={prev.aovCents}
          />
          <Kpi
            label="New customers"
            value={String(cur.newCustomers)}
            cur={cur.newCustomers}
            prev={prev.newCustomers}
          />
        </View>

        <Text style={s.h2}>Sales over time</Text>
        <BarChart data={data.series} />

        <Text style={s.h2}>Sales by category</Text>
        <Table
          head={["Category", "Units", "Sales"]}
          widths={[60, 15, 25]}
          rows={data.categories.map((x) => [x.name, String(x.units), egp(x.salesCents)])}
        />

        <Text style={s.h2}>Top products</Text>
        <Table
          head={["Product", "Units", "Sales"]}
          widths={[60, 15, 25]}
          rows={data.topProducts.map((x) => [x.name, String(x.units), egp(x.salesCents)])}
        />

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
