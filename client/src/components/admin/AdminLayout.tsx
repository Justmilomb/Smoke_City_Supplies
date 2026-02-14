import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, FolderTree, Plus, ShoppingBag, Menu, Printer, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders & labels", icon: ShoppingBag },
  { href: "/admin/orders/labels", label: "Print labels", icon: Printer },
  { href: "/admin/enquiries", label: "Enquiries", icon: Mail },
  { href: "/admin/parts", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/new", label: "Add product", icon: Plus },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const [loc] = useLocation();
  const path = loc.indexOf("?") >= 0 ? loc.slice(0, loc.indexOf("?")) : loc;
  const active = path === href || (href !== "/admin" && path.startsWith(href));

  return (
    <Link href={href}>
      <a
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  usePageMeta({
    title: "Admin",
    description: "Store administration panel",
    canonical: "/admin",
    noIndex: true,
  });

  const sidebar = (
    <nav className="flex flex-col gap-1 p-3">
      {adminNavItems.map(({ href, label, icon }) => (
        <NavItem key={href} href={href} label={label} icon={icon} />
      ))}
      <div className="mt-4 border-t pt-4">
        <Link href="/store">
          <a
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            Back to store
          </a>
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <SheetHeader className="p-4 pb-0">
                <SheetTitle>Admin</SheetTitle>
              </SheetHeader>
              {sidebar}
            </SheetContent>
          </Sheet>
          <Link href="/admin">
            <a className="font-semibold text-foreground hover:opacity-80">Admin</a>
          </Link>
          <div className="flex-1 md:hidden" />
          <Link href="/store">
            <Button variant="outline" size="sm" className="gap-2 hidden md:inline-flex">
              <ShoppingBag className="h-4 w-4" />
              Back to store
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:block">
          <div className="sticky top-14 py-4">
            {sidebar}
          </div>
        </aside>
        <main className="flex-1 min-w-0 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
