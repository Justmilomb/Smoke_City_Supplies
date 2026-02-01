import React from "react";
import { Mail, Send } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ContactPage() {
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
      <div className="mx-auto max-w-2xl space-y-10 py-8">
        <div>
          <h1 className="font-[var(--font-serif)] text-3xl font-semibold tracking-tight text-foreground">
            Contact Support
          </h1>
          <p className="mt-2 text-muted-foreground">
            Have a question or need help? Send us a message and we’ll get back to you as soon as we can.
          </p>
        </div>

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
                className="rounded-xl"
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
                className="rounded-xl"
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
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="rounded-xl resize-none"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-xl"
          >
            {submitting ? (
              "Sending…"
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send message
              </>
            )}
          </Button>
        </form>

        <div className="flex items-start gap-4 rounded-xl border border-border/60 bg-muted/30 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Prefer email?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You can also reach us at support@smokecitysupplies.com. We typically respond within 1–2 business days.
            </p>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
