import {
  ArrowRight,
  Check,
  ChartLine,
  Circle,
  CircleDashed,
  Coffee,
  History,
  LayoutDashboard,
  Mail,
  Menu,
  Monitor,
  Moon,
  Package,
  Receipt,
  RotateCcw,
  Search,
  ShoppingCart,
  Sun,
  Truck,
  TriangleAlert,
  Users,
  X,
  type LucideProps,
} from "lucide-react";

/**
 * The icon set: Lucide's thin line icons, and only these. Icons are decorative (`aria-hidden`);
 * a control that holds only an icon needs an `aria-label`. The glyphs follow the text color.
 */
export const icons = {
  overview: LayoutDashboard,
  orders: Receipt,
  products: Coffee,
  customers: Users,
  analytics: ChartLine,
  inventory: Package,
  activity: History,
  shipping: Truck,
  emails: Mail,
  cart: ShoppingCart,
  search: Search,
  menu: Menu,
  close: X,
  check: Check,
  warning: TriangleAlert,
  sun: Sun,
  moon: Moon,
  system: Monitor,
  next: ArrowRight,
  refund: RotateCcw,
  pending: CircleDashed,
  dot: Circle,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.75,
  ...props
}: { name: IconName } & LucideProps) {
  const Component = icons[name];
  return <Component aria-hidden size={size} strokeWidth={strokeWidth} {...props} />;
}
