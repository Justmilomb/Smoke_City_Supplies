import React from "react";
import { Mail, Phone, Send, MessageSquare } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/use-page-meta";
import { toast } from "sonner";

export default function ContactPage() {
  const supportPhone = "07950 827584";
  const supportEmail = "support@smokecitysupplies.com";

  usePageMeta({
    title: "Contact Us",
    description: "Contact Smoke City Supplies for motorcycle parts enquiries, support and orders. UK-based online store. Email and phone support.",
    keywords: "contact Smoke City Supplies, motorcycle parts enquiry, customer support, motorcycle parts help",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in name, email, and message.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Something went wrong.");
        return;
      }
      toast.success(data.message ?? "Message sent. We'll get back to you soon.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Contact Us
            </h1>
            <p className="mt-2 text-muted-foreground">
              Need help with a part or order? Call, email, or send us a message.
            </p>
            <p className="mt-3 hidden max-w-2xl text-sm text-muted-foreground md:block">
              Contact Smoke City Supplies for motorcycle parts enquiries, compatibility questions, and order support. We're a UK-based online store — no physical location — and deliver across the UK. Use the form below or call us.
            </p>
          </div>
          <BackButton fallback="/" />
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Card className="border-border/50 p-6 md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject (optional)</Label>
                <Input
                  id="contact-subject"
                  type="text"
                  placeholder="Order, returns, shipping…"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  placeholder="How can we help?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="rounded-lg resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full"
              >
                {submitting ? (
                  "Sending…"
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/50 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">Email Us</h3>
              <a href={`mailto:${supportEmail}`} className="text-sm text-primary hover:underline">
                {supportEmail}
              </a>
            </Card>

            <Card className="border-border/50 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Phone className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">Call Us</h3>
              <a href={`tel:${supportPhone.replace(/\s/g, "")}`} className="text-sm text-primary hover:underline">
                {supportPhone}
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                Mon-Sat, 9am-6pm
              </p>
            </Card>

            <Card className="border-border/50 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">Response Time</h3>
              <p className="text-sm text-muted-foreground">
                Most messages are answered within 24 hours.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
