import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "smoke-city-cookie-consent";
const ADSENSE_CLIENT = "ca-pub-3409799477060976";

type ConsentValue = "accepted" | "declined" | null;

function getConsent(): ConsentValue {
  try {
    return localStorage.getItem(CONSENT_KEY) as ConsentValue;
  } catch {
    return null;
  }
}

function setConsent(value: "accepted" | "declined") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // localStorage unavailable
  }
}

function loadAdSense() {
  if (document.querySelector(`script[data-ad-client="${ADSENSE_CLIENT}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-ad-client", ADSENSE_CLIENT);
  document.head.appendChild(script);
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (consent === "accepted") {
      loadAdSense();
    } else if (consent === null) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    setConsent("accepted");
    setVisible(false);
    loadAdSense();
  };

  const decline = () => {
    setConsent("declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">We use cookies</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to show you relevant ads and improve your experience.
                By clicking "Accept", you consent to the use of cookies for advertising purposes.
                You can change your preference at any time. See our{" "}
                <a href="/privacy" className="text-primary hover:underline">privacy policy</a> for details.
              </p>
            </div>
            <button
              onClick={decline}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3 mt-4 ml-14">
            <Button size="sm" className="h-9 rounded-lg px-5 text-xs font-semibold" onClick={accept}>
              Accept
            </Button>
            <Button size="sm" variant="outline" className="h-9 rounded-lg px-5 text-xs" onClick={decline}>
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
