import React from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Menu, Phone, ArrowUp } from "lucide-react";
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
import { Logo } from "./Logo";

const HEADER_PHONE = "07597783584";

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
  const path = loc.indexOf("?") >= 0 ? loc.slice(0, loc.indexOf("?")) : loc;
  const active = path === href;

  return (
    <Link
      href={href}
      data-testid={testId}
      className={
        "px-4 py-2 text-sm font-medium transition-colors " +
        (active
          ? "text-foreground border-b-2 border-primary"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </Link>
  );
}

const publicNavLinks = [
  { href: "/", label: "Home", testId: "link-mobile-home" },
  { href: "/store", label: "Parts", testId: "link-mobile-parts" },
  { href: "/contact", label: "Contact", testId: "link-mobile-contact" },
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
  const [loc, setLoc] = useLocation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const mobileNavLinks = user ? [...publicNavLinks, adminNavLink] : publicNavLinks;

  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const search = loc.indexOf("?") >= 0 ? loc.slice(loc.indexOf("?")) : "";
    const q = new URLSearchParams(search).get("q") ?? "";
    setSearchQuery(q);
  }, [loc]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const path = loc.indexOf("?") >= 0 ? loc.slice(0, loc.indexOf("?")) : loc;
    const base = path === "/" ? "/store" : path || "/store";
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    setLoc(params.toString() ? `${base}?${params.toString()}` : base);
  };

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: "Smoke City Supplies",
        url: siteUrl,
        logo: `${siteUrl}/favicon.png`,
        description: "Your trusted online source for motorcycle parts in the UK. Genuine parts and expert advice.",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+44-7597-783584",
          contactType: "customer service",
          email: "support@smokecitysupplies.com",
          areaServed: "GB",
          availableLanguage: "English",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: "Smoke City Supplies",
        url: siteUrl,
        description: "Genuine motorcycle parts, UK delivery. Shop brakes, engine, suspension, exhaust and more.",
        publisher: { "@id": `${siteUrl}#organization` },
        inLanguage: "en-GB",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/store?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 md:px-6 lg:px-8 md:flex-row md:items-center md:justify-between md:gap-6 md:py-4">
          <div className="flex items-center justify-between gap-4 md:justify-start">
            <Link href="/" data-testid="link-home" className="group shrink-0 transition-opacity hover:opacity-80">
              <Logo size="md" showText className="hidden sm:flex" />
              <Logo size="sm" showText={false} className="sm:hidden" />
            </Link>

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
                    <Link
                      key={href}
                      href={href}
                      data-testid={testId}
                      className="block rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-muted"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <nav className="hidden items-center gap-1 md:flex">
              <NavLink href="/" label="Home" testId="link-home-nav" />
              <NavLink href="/store" label="Parts" testId="link-parts" />
              <NavLink href="/contact" label="Contact" testId="link-contact" />
              {user && <NavLink href="/admin" label="Admin" testId="link-admin" />}
            </nav>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 w-full max-w-xl mx-auto md:mx-0 md:max-w-2xl"
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="input-search"
                type="search"
                placeholder="Search parts, brands, part numbers…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-base md:h-10"
                aria-label="Search parts"
              />
            </div>
          </form>

          <div className="flex items-center justify-end gap-2 md:gap-3 shrink-0">
            <a
              href={`tel:${HEADER_PHONE.replace(/\s/g, "")}`}
              className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              data-testid="link-phone"
            >
              <Phone className="h-4 w-4" />
              <span>{HEADER_PHONE}</span>
            </a>
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

      {showBackToTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-20 right-6 z-30 h-11 w-11 rounded-full shadow-md md:bottom-6 md:right-24"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      <footer className="border-t bg-muted/30 mt-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 md:grid-cols-4 md:px-6 lg:px-8">
          <div className="md:col-span-2">
            <Logo size="md" />
            <p className="text-sm text-muted-foreground max-w-md mt-4 mb-3">
              Run by Karl, bringing back old-fashioned service to the motorcycle parts industry. Genuine parts, real expertise, and personal care.
            </p>
            <p className="text-xs text-muted-foreground">
              UK delivery only. All prices in GBP (£).
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-muted-foreground max-w-xs">
              <div>
                <div className="font-medium text-foreground mb-1">Hours</div>
                <div>Mon–Sat 9am–6pm</div>
              </div>
              <div>
                <div className="font-medium text-foreground mb-1">Delivery</div>
                <div>UK-wide shipping</div>
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold text-sm mb-4">Customer Service</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/shipping" className="hover:text-foreground transition-colors">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-foreground transition-colors">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {user && (
            <div>
              <div className="font-semibold text-sm mb-4">Admin</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/admin" className="hover:text-foreground transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/admin/parts" className="hover:text-foreground transition-colors">
                    Inventory
                  </Link>
                </li>
                <li>
                  <Link href="/admin/orders" className="hover:text-foreground transition-colors">
                    Orders
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
        <div className="border-t mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              © {new Date().getFullYear()} Smoke City Supplies. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground text-center sm:text-right">
              Built with care by Karl. Real service, every time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
