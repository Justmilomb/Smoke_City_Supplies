import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { Card } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function TermsPage() {
  usePageMeta({
    title: "Terms of Service | Smoke City Supplies",
    description: "Terms and conditions for using Smoke City Supplies.",
  });

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Terms of Service</h1>
            <p className="mt-2 text-muted-foreground">Last updated: February 2026</p>
          </div>
          <BackButton fallback="/" />
        </div>

        <Card className="border-border/50 p-8 md:p-10 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Welcome</h2>
            <p className="text-muted-foreground leading-relaxed">
              Thanks for choosing Smoke City Supplies. These terms are designed to be fair and straightforward—no hidden surprises. By using our site and services, you agree to these terms. If something doesn't make sense, reach out to Karl directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Orders & Pricing</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                All prices are listed in GBP (£) and include VAT where applicable. Shipping costs are calculated at checkout based on delivery location.
              </p>
              <p>
                When you place an order, you're making an offer to purchase. We'll confirm acceptance by email. We reserve the right to refuse or cancel orders at our discretion (e.g., if pricing errors occur or stock is unavailable).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Payment</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Stripe for secure payment processing. By providing payment information, you confirm you have the right to use that payment method. Payment is due at the time of order.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Delivery</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                We ship to UK addresses only. Delivery times are estimates and not guaranteed—delays can happen (though we'll always do our best). Once dispatched, you'll receive tracking information.
              </p>
              <p>
                Risk of loss passes to you upon delivery. Please inspect packages upon receipt and report any damage or missing items within 48 hours.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Returns & Refunds</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                You have 14 days from receipt to return unused, unopened parts in original packaging. Some items (custom orders, electrical parts that have been opened) may not be returnable—check our full returns policy.
              </p>
              <p>
                To initiate a return, contact us first. We'll issue refunds within 14 days of receiving the returned item. Return shipping costs are the customer's responsibility unless the item is defective or we sent the wrong part.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              Parts are covered by manufacturer warranties where applicable. We sell genuine OEM and quality aftermarket parts, but we don't manufacture them. If a part is defective, contact us and we'll work with you to resolve it—either through warranty claim or return.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We provide parts, not installation services. It's your responsibility to ensure correct installation and compatibility. We're not liable for installation errors, consequential damages, or misuse of parts. Our liability is limited to the purchase price of the item.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on this site (text, images, logos) is owned by Smoke City Supplies or licensed to us. Don't copy, reproduce, or distribute our content without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms are governed by the laws of England and Wales. Any disputes will be resolved in UK courts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Continued use of the site after changes means you accept the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about these terms or need help with an order:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Email:</strong> <a href="mailto:support@smokecitysupplies.com" className="text-primary hover:underline">support@smokecitysupplies.com</a></p>
              <p><strong className="text-foreground">Phone:</strong> <a href="tel:07597783584" className="text-primary hover:underline">07597783584</a></p>
              <p><strong className="text-foreground">Hours:</strong> Mon-Sat 9am-6pm GMT</p>
            </div>
          </section>

          <section className="bg-primary/5 p-6 rounded-lg border-2 border-primary/20">
            <p className="text-foreground font-medium">
              Remember: You're not just a customer—you're a fellow rider. If something goes wrong or you have concerns, talk to Karl. We'll sort it out together.
            </p>
          </section>
        </Card>
      </div>
    </SiteLayout>
  );
}
