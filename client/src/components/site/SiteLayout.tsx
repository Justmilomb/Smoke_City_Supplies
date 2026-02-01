import React from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  ShoppingCart,
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
  const active = loc === href || (href !== "/catalog" && loc.startsWith(href));

  return (
    <Link href={href}>
      <a
        data-testid={testId}
        className={
          "px-4 py-2 text-sm font-medium transition-colors " +
          (active
            ? "text-foreground border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground")
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/">
              <a
                data-testid="link-home"
                className="flex items-center gap-3 group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm group-hover:shadow-md transition-shadow">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="font-[var(--font-serif)] text-lg font-bold tracking-tight text-foreground">
                    Smoke City Supplies
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Premium Parts & Accessories
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
                  className="md:hidden h-9 w-9"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-1">
                  {mobileNavLinks.map(({ href, label, testId }) => (
                    <Link key={href} href={href}>
                      <a
                        data-testid={testId}
                        className="block rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-muted"
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

          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="hidden w-full max-w-sm lg:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="input-search"
                  placeholder="Search parts, brands, sizes…"
                  className="h-9 w-full rounded-lg border bg-background pl-9 pr-4"
                />
              </div>
            </div>

            {right}

            <Link href="/cart">
              <Button
                data-testid="button-cart"
                variant="outline"
                size="sm"
                className="relative h-9 gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1.5 text-xs font-semibold">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {user && (
              <Link href="/admin" className="md:hidden">
                <Button
                  data-testid="button-admin"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8 md:py-12">{children}</main>

      <footer className="border-t bg-muted/30 mt-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 md:grid-cols-4 md:px-6 lg:px-8">
          <div className="md:col-span-2">
            <div className="font-[var(--font-serif)] text-lg font-bold tracking-tight mb-2">
              Smoke City Supplies
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Your trusted source for premium bike and scooter parts. Fast shipping, expert support, and quality you can count on.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm mb-4">Customer Service</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/shipping">
                  <a className="hover:text-foreground transition-colors">
                    Shipping & Delivery
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/returns">
                  <a className="hover:text-foreground transition-colors">
                    Returns & Refunds
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="hover:text-foreground transition-colors">
                    Contact Support
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          {user && (
            <div>
              <div className="font-semibold text-sm mb-4">Admin</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/admin">
                    <a className="hover:text-foreground transition-colors">
                      Dashboard
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/parts">
                    <a className="hover:text-foreground transition-colors">
                      Inventory
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/orders">
                    <a className="hover:text-foreground transition-colors">
                      Orders
                    </a>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
        <div className="border-t mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Smoke City Supplies. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
