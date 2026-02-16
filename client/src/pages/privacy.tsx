import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { Card } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function PrivacyPage() {
  usePageMeta({
    title: "Privacy Policy | Smoke City Supplies",
    description: "How we protect and handle your personal data at Smoke City Supplies.",
  });

  return (
    <SiteLayout>
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Privacy Policy</h1>
            <p className="mt-2 text-muted-foreground">Last updated: February 2026</p>
          </div>
          <BackButton fallback="/" />
        </div>

        <Card className="border-border/50 p-8 md:p-10 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Our Commitment to You</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Smoke City Supplies, we take your privacy seriously. This isn't just legal boilerplate—it's our promise that your personal information will be handled with care and respect. We only collect what we need to serve you better, and we'll never sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Order Information</h3>
                <p>When you place an order, we collect your name, email address, delivery address, and payment information (processed securely via Stripe).</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Contact Information</h3>
                <p>If you reach out via our contact form or email, we store your name, email, and message content to respond to your inquiry.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Technical Data</h3>
                <p>We automatically collect basic technical information like your IP address, browser type, and device information to improve site performance and security.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
              <li>Process and fulfill your orders</li>
              <li>Send order confirmations and shipping updates</li>
              <li>Respond to your questions and support requests</li>
              <li>Improve our website and services</li>
              <li>Detect and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use industry-standard security measures to protect your data. Payment information is handled by Stripe and never stored on our servers. All data transmissions are encrypted using SSL/TLS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Your Rights (UK GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Under UK data protection law, you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal obligations)</li>
              <li>Object to processing of your data</li>
              <li>Request data portability</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise any of these rights, email us at <a href="mailto:privacy@smokecitysupplies.com" className="text-primary hover:underline">privacy@smokecitysupplies.com</a> or call 07597783584.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to keep you logged in and remember your cart. We don't use tracking cookies or third-party analytics at this time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this privacy policy from time to time. We'll notify you of significant changes by posting a notice on the site or sending an email to registered customers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this privacy policy or how we handle your data, please reach out:
            </p>
            <div className="mt-4 space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Email:</strong> <a href="mailto:support@smokecitysupplies.com" className="text-primary hover:underline">support@smokecitysupplies.com</a></p>
              <p><strong className="text-foreground">Phone:</strong> <a href="tel:07597783584" className="text-primary hover:underline">07597783584</a></p>
              <p><strong className="text-foreground">Business:</strong> Smoke City Supplies, United Kingdom</p>
            </div>
          </section>
        </Card>
      </div>
    </SiteLayout>
  );
}
