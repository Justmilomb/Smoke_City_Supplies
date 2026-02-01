import React from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  ShoppingCart,
  Headphones,
  Truck,
  ShieldCheck,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCartCount } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

function NavLink({
  href,
  label,
  testId,
}: {
  href: string;
  label: string;
  testId: string;
}) {
  const [loc] = useLocation();
  const active = loc === href;

  return (
    <Link href={href}>
      <a
        data-testid={testId}
        className={
          "rounded-full px-4 py-2.5 text-sm transition hover:bg-muted " +
          (active
            ? "bg-muted text-foreground"
            : "text-muted-foreground")
        }
      >
        {label}
      </a>
    </Link>
  );
}

const publicNavLinks = [
  { href: "/catalog", label: "Shop", testId: "link-mobile-shop" },
  { href: "/catalog?vehicle=bike", label: "Bike", testId: "link-mobile-bike" },
  { href: "/catalog?vehicle=scooter", label: "Scooter", testId: "link-mobile-scooter" },
];
const adminNavLink = { href: "/admin", label: "Admin", testId: "link-mobile-admin" };

export default function SiteLayout({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const cartCount = useCartCount();
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const mobileNavLinks = user ? [...publicNavLinks, adminNavLink] : publicNavLinks;

  return (
    <div className="min-h-screen app-surface">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <a
                data-testid="link-home"
                className="group flex items-center gap-2 rounded-xl px-2.5 py-2 transition hover:bg-muted"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-primary-foreground shadow-sm">
                  <Truck className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <div className="leading-tight">
                  <div className="font-[var(--font-serif)] text-[15px] font-semibold tracking-tight">
                    Smoke City Supplies
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Bike + Scooter parts
                  </div>
                </div>
              </a>
            </Link>

            {/* Mobile hamburger menu */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  data-testid="button-mobile-menu"
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-10 w-10 rounded-full"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] rounded-r-2xl border-l border-border/60">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-2">
                  {mobileNavLinks.map(({ href, label, testId }) => (
                    <Link key={href} href={href}>
                      <a
                        data-testid={testId}
                        className="block rounded-xl px-4 py-3.5 text-base font-medium transition hover:bg-muted"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {label}
                      </a>
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <nav className="hidden items-center gap-1 md:flex">
              <NavLink href="/catalog" label="Shop" testId="link-shop" />
              <NavLink
                href="/catalog?vehicle=bike"
                label="Bike"
                testId="link-bike"
              />
              <NavLink
                href="/catalog?vehicle=scooter"
                label="Scooter"
                testId="link-scooter"
              />
              {user && <NavLink href="/admin" label="Admin" testId="link-admin" />}
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <div className="hidden w-full max-w-md md:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="input-search"
                  placeholder="Search parts, brands, sizes…"
                  className="h-10 rounded-full pl-9"
                />
              </div>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Badge
                data-testid="badge-promise"
                variant="secondary"
                className="rounded-full border border-border/60 bg-muted/50"
              >
                <Truck className="mr-1 h-3.5 w-3.5" /> Next-day
              </Badge>
              <Badge
                data-testid="badge-support"
                variant="secondary"
                className="rounded-full border border-border/60 bg-muted/50"
              >
                <Headphones className="mr-1 h-3.5 w-3.5" /> Friendly support
              </Badge>
              <Badge
                data-testid="badge-secure"
                variant="secondary"
                className="rounded-full border border-border/60 bg-muted/50"
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Secure checkout
              </Badge>
            </div>

            {right}

            <Link href="/cart">
              <Button
                data-testid="button-cart"
                variant="secondary"
                asChild
                className="relative h-10 rounded-full border border-border/60 bg-muted/50 hover:bg-muted"
              >
                <a>
                  <ShoppingCart className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Cart</span>
                  {cartCount > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs">
                      {cartCount}
                    </Badge>
                  )}
                </a>
              </Button>
            </Link>

            {user && (
              <Link href="/admin" className="md:hidden">
                <a>
                  <Button
                    data-testid="button-admin"
                    variant="secondary"
                    className="h-10 w-10 rounded-full border border-border/60 bg-muted/50 hover:bg-muted"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </a>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">{children}</main>

      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3 md:px-6 md:py-16">
          <div>
            <div className="font-[var(--font-serif)] text-base font-semibold tracking-tight">
              Smoke City Supplies
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Fast delivery, clear categories, and support that actually answers.
            </div>
          </div>

          <div className="text-sm">
            <div className="font-medium text-foreground">Help</div>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link href="/shipping">
                  <a
                    data-testid="link-help-shipping"
                    className="hover:text-foreground"
                  >
                    Shipping & Delivery
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/returns">
                  <a
                    data-testid="link-help-returns"
                    className="hover:text-foreground"
                  >
                    Returns
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a
                    data-testid="link-help-support"
                    className="hover:text-foreground"
                  >
                    Contact Support
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          {user && (
          <div className="text-sm">
            <div className="font-medium text-foreground">Business</div>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link href="/admin">
                  <a
                    data-testid="link-business-admin"
                    className="hover:text-foreground"
                  >
                    Admin dashboard
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/admin/parts">
                  <a data-testid="link-business-inventory" className="hover:text-foreground">
                    Inventory
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/admin/orders">
                  <a data-testid="link-business-orders" className="hover:text-foreground">
                    Orders
                  </a>
                </Link>
              </li>
            </ul>
          </div>
        )}
        </div>
      </footer>
    </div>
  );
}
