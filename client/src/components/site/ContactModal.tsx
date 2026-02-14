import React from "react";
import { createPortal } from "react-dom";
import { Phone, Mail, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REAL_PHONE = "07597783587";
const FAKE_EMAIL = "help@smokecitysupplies.example";
const ONLINE_ONLY = "Online only - UK delivery";

function whatsAppUrl(number: string | null, text = ""): string {
  if (!number) return "#";
  const base = `https://wa.me/${number}`;
  if (!text.trim()) return base;
  return `${base}?text=${encodeURIComponent(text.trim())}`;
}

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
  const fab = (
    <div
      className="fixed z-[100]"
      style={{ position: "fixed", left: "auto", right: "1.5rem", bottom: "1.5rem", top: "auto" }}
    >
      <Button
        data-testid="button-contact-fab"
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg ring-2 ring-primary/20 hover:ring-primary/40 md:h-12 md:w-12"
        aria-label="Contact support"
        onClick={openModal}
      >
        <MessageSquare className="h-6 w-6 md:h-5 md:w-5" />
      </Button>
    </div>
  );

  return (
    <ContactModalContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" && createPortal(fab, document.body)}
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
  const [whatsappNumber, setWhatsappNumber] = React.useState<string | null>(null);
  const message = initialPartNumber
    ? `Hi, question about part ${initialPartNumber}.`
    : "Hi, I need help.";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <a
            href={`tel:${REAL_PHONE.replace(/\s/g, "")}`}
            className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
          >
            <Phone className="h-4 w-4" />
            {REAL_PHONE}
          </a>

          {whatsappNumber ? (
            <a
              href={whatsAppUrl(whatsappNumber, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
            >
              <MessageSquare className="h-4 w-4" />
              Message us directly on WhatsApp
            </a>
          ) : (
            <div className="text-sm text-muted-foreground">WhatsApp temporarily unavailable</div>
          )}

          <div className="rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="font-medium">Email (Disabled)</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{FAKE_EMAIL}</div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-4 w-4" />
            <span>{ONLINE_ONLY}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
