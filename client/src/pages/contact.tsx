import React from "react";
import { Mail, MessageSquare, Phone } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/use-page-meta";

const REAL_PHONE = "07597783587";
const FAKE_EMAIL = "help@smokecitysupplies.example";

function buildWhatsappUrl(number: string | null, text: string): string {
  if (!number) return "#";
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export default function ContactPage() {
  usePageMeta({
    title: "Contact",
    description: "Message Smoke City Supplies directly on WhatsApp or phone.",
    canonical: "/contact",
    keywords: ["motorcycle parts support", "WhatsApp support", "contact smoke city supplies"],
  });

  const [whatsappNumber, setWhatsappNumber] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.whatsappNumber === "string" && data.whatsappNumber.trim()) {
          setWhatsappNumber(data.whatsappNumber);
        }
      } catch {
        // Keep WhatsApp hidden if unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Contact Us</h1>
            <p className="mt-2 text-muted-foreground">
              Email or message us directly.
            </p>
          </div>
          <BackButton fallback="/" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Phone className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-semibold">Phone</h3>
            <a className="text-sm text-foreground hover:underline" href={`tel:${REAL_PHONE.replace(/\s/g, "")}`}>
              {REAL_PHONE}
            </a>
          </Card>

          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-semibold">WhatsApp</h3>
            <Button className="w-full" disabled={!whatsappNumber} asChild>
              <a href={buildWhatsappUrl(whatsappNumber, "Hi, I need help.")} target="_blank" rel="noopener noreferrer">
                Message us directly
              </a>
            </Button>
          </Card>

          <Card className="border-border/50 bg-muted/40 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Mail className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-semibold text-muted-foreground">Email (Disabled)</h3>
            <p className="text-sm text-muted-foreground">{FAKE_EMAIL}</p>
            <p className="mt-2 text-xs text-muted-foreground">Email is currently unavailable.</p>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
