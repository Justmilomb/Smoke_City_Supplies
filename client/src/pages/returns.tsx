import { Link } from "wouter";
import { RotateCcw, Calendar, Package, Mail } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";

export default function ReturnsPage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl space-y-12 py-8">
        <div>
          <h1 className="font-[var(--font-serif)] text-3xl font-semibold tracking-tight text-foreground">
            Returns Policy
          </h1>
          <p className="mt-2 text-muted-foreground">
            Our commitment to making returns simple.
          </p>
        </div>

        <section className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Return window</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                You have 30 days from the delivery date to return most items for a full refund. Items must be unused and in original packaging.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">How to return</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Contact us to start a return. We’ll send you a prepaid return label. Pack the item securely, attach the label, and drop it off at any supported carrier location.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Refund process</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Refunds are processed within 5–7 business days after we receive your return. You’ll get the refund to the original payment method. Shipping costs are non-refundable unless the return is due to our error.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Conditions</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Opened or used parts may not be eligible for return due to safety and hygiene. Custom or special-order items may have different return terms. We’ll let you know when you contact us.
              </p>
            </div>
          </div>
        </section>

        <p className="text-sm text-muted-foreground">
          <Link href="/contact">
            <a className="underline hover:text-foreground">Contact support</a>
          </Link>{" "}
          to start a return or ask about your refund.
        </p>
      </div>
    </SiteLayout>
  );
}
