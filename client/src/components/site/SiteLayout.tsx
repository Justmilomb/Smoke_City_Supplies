import React from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Menu, Phone, ArrowUp, Home, Package, Mail, Settings, MessageSquare } from "lucide-react";
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

const DEFAULT_HEADER_PHONE = "07597783587";

const publicNavItems = [
  { href: "/", label: "Home", icon: Home, testId: "link-mobile-home" },
  { href: "/store", label: "Parts", icon: Package, testId: "link-mobile-parts" },
  { href: "/contact", label: "Contact", icon: Mail, testId: "link-mobile-contact" },
];
const adminNavItem = { href: "/admin", label: "Admin", icon: Settings, testId: "link-mobile-admin" };

function StoreNavItem({
  href,
  label,
  icon: Icon,
  testId,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  testId: string;
  onClick?: () => void;
}) {
  const [loc] = useLocation();
  const path = loc.indexOf("?") >= 0 ? loc.slice(0, loc.indexOf("?")) : loc;
  const active =
    href === "/" ? path === "/" : path === href || (path.startsWith(href) && href.length > 1);

  return (
    <Link href={href}>
      <a
        data-testid={testId}
        onClick={onClick}
        className={
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
          (active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </a>
    </Link>
  );
}

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
  const [headerPhone, setHeaderPhone] = React.useState(DEFAULT_HEADER_PHONE);
  const [whatsappNumber, setWhatsappNumber] = React.useState<string | null>(null);
  const navItems = user ? [...publicNavItems, adminNavItem] : publicNavItems;

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

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.supportPhone === "string" && data.supportPhone.trim()) setHeaderPhone(data.supportPhone);
        if (typeof data.whatsappNumber === "string" && data.whatsappNumber.trim()) setWhatsappNumber(data.whatsappNumber);
      } catch {
        // Keep defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        description: "Your trusted online source for motorcycle parts in the UK. Genuine parts and expert advice.",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+44-7597-783587",
          contactType: "customer service",
          email: "support@smokecitysupplies.com",
          areaServed: "GB",
        },
      },
      {
        "@type": "WebSite",
        name: "Smoke City Supplies",
        url: siteUrl,
        description: "Genuine motorcycle parts, UK delivery. Shop brakes, engine, suspension, exhaust and more.",
        publisher: { "@id": `${siteUrl}#organization` },
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
              <a>
                <span className="hidden sm:inline-flex"><Logo size="md" showText /></span>
                <span className="sm:hidden inline-flex"><Logo size="sm" showText={false} /></span>
              </a>
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
              <SheetContent side="left" className="w-[260px] p-0">
                <SheetHeader className="p-4 pb-0">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-3">
                  {navItems.map(({ href, label, icon, testId }) => (
                    <StoreNavItem
                      key={href}
                      href={href}
                      label={label}
                      icon={icon}
                      testId={testId}
                      onClick={() => setMobileNavOpen(false)}
                    />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
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
              href={`tel:${headerPhone.replace(/\s/g, "")}`}
              className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              data-testid="link-phone"
            >
              <Phone className="h-4 w-4" />
              <span>{headerPhone}</span>
            </a>
            {whatsappNumber ? (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I need help with parts.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
            ) : null}
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

      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:block">
          <div className="sticky top-14 py-4">
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map(({ href, label, icon, testId }) => (
                <StoreNavItem key={href} href={href} label={label} icon={icon} testId={testId} />
              ))}
            </nav>
          </div>
        </aside>
        <main className="flex-1 min-w-0 mx-auto max-w-5xl px-4 py-8 md:px-6 lg:px-8 md:py-12">{children}</main>
      </div>

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
              Your trusted online source for motorcycle parts in the UK. Genuine parts from quality brands with expert support.
            </p>
            <p className="text-xs text-muted-foreground">
              UK delivery only. All prices in GBP (£).
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-muted-foreground max-w-xs">
              <div>
                <div className="font-medium text-foreground mb-1">Online only</div>
                <div>UK delivery — no physical store</div>
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
