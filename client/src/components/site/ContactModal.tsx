import React from "react";
import { Phone, Mail, MessageSquare, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const SUPPORT_PHONE = "07597783584";
const SUPPORT_EMAIL = "support@smokecitysupplies.com";
const OPENING_HOURS = "Mon–Sat 9am–6pm, Sun Closed";
const ONLINE_ONLY = "Online only — UK delivery";

export type ContactModalContextValue = {
  openWithPartNumber: (partNumber: string) => void;
  open: () => void;
};

const ContactModalContext = React.createContext<ContactModalContextValue | null>(null);

export function useContactModal(): ContactModalContextValue | null {
  return React.useContext(ContactModalContext);
}

export function ContactModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [partNumber, setPartNumber] = React.useState("");
  const openWithPartNumber = React.useCallback((pn: string) => {
    setPartNumber(pn);
    setOpen(true);
  }, []);
  const openModal = React.useCallback(() => {
    setPartNumber("");
    setOpen(true);
  }, []);
  const value = React.useMemo(
    () => ({ openWithPartNumber, open: openModal }),
    [openWithPartNumber, openModal]
  );
  return (
    <ContactModalContext.Provider value={value}>
      {children}
      <Button
        data-testid="button-contact-fab"
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg md:h-12 md:w-12"
        aria-label="Contact support"
        onClick={openModal}
      >
        <MessageSquare className="h-6 w-6 md:h-5 md:w-5" />
      </Button>
      <ContactModalContent
        open={open}
        onOpenChange={setOpen}
        initialPartNumber={partNumber}
      />
    </ContactModalContext.Provider>
  );
}

function ContactModalContent({
  open,
  onOpenChange,
  initialPartNumber = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPartNumber?: string;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [partNumber, setPartNumber] = React.useState(initialPartNumber);
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setPartNumber(initialPartNumber);
  }, [initialPartNumber, open]);

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
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: partNumber ? `Part: ${partNumber}` : "General enquiry",
          message: message.trim() + (partNumber ? `\n\nPart number: ${partNumber}` : ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Something went wrong.");
        return;
      }
      toast.success(data.message ?? "Message sent. We'll get back to you soon.");
      setName("");
      setEmail("");
      setPartNumber("");
      setMessage("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-3 text-sm">
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
              className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
            >
              <Phone className="h-4 w-4" />
              {SUPPORT_PHONE}
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
            >
              <Mail className="h-4 w-4" />
              {SUPPORT_EMAIL}
            </a>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>Live Chat — Coming soon</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{OPENING_HOURS}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{ONLINE_ONLY}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modal-name">Name</Label>
                <Input
                  id="modal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-email">Email</Label>
                <Input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-part">Part number (optional)</Label>
              <Input
                id="modal-part"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g. MCP-1001"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-message">Message</Label>
              <Textarea
                id="modal-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                rows={3}
                required
                className="rounded-lg"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send message"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
