import { Link } from "wouter";
import { RotateCcw, Calendar, Package, Mail, CheckCircle2 } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function ReturnsPage() {
  usePageMeta({
    title: "Returns Policy",
    description: "Returns and refunds for motorcycle parts. UK returns policy. Smoke City Supplies — hassle-free returns.",
  });
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Returns Policy
            </h1>
            <p className="mt-2 text-muted-foreground">
              Simple, hassle-free returns when you need them
            </p>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              Our returns policy covers motorcycle parts ordered from Smoke City Supplies in the UK. If an item isn't right, you can return it within 30 days for a refund. See below for conditions and how to start a return.
            </p>
          </div>
          <BackButton fallback="/" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Return Window</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You have 30 days from the delivery date to return most items for a full refund. Items must be unused and in original packaging.
            </p>
          </Card>

          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RotateCcw className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">How to Return</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Contact us to start a return. We'll send you a prepaid return label. Pack the item securely, attach the label, and drop it off at any supported carrier location.
            </p>
          </Card>

          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Refund Process</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Refunds are processed within 5–7 business days after we receive your return. You'll get the refund to the original payment method. Shipping costs are non-refundable unless the return is due to our error.
            </p>
          </Card>

          <Card className="border-border/50 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Conditions</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Opened or used parts may not be eligible for return due to safety and hygiene. Custom or special-order items may have different return terms. We'll let you know when you contact us.
            </p>
          </Card>
        </div>

        <Card className="mt-8 border-border/50 bg-primary/5 p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Ready to Return?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Contact our support team to start your return or ask questions about our refund policy.
              </p>
              <Link href="/contact">
                <Button variant="outline" size="sm" asChild>
                  <a>Contact Support</a>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </SiteLayout>
  );
}
