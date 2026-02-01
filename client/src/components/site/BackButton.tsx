import { useLocation } from "wouter";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallback?: string;
  variant?: "arrow" | "x";
  className?: string;
}

export default function BackButton({ fallback = "/", variant = "arrow", className = "" }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(fallback);
    }
  };

  const Icon = variant === "x" ? X : ArrowLeft;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-2 ${className}`}
      aria-label="Go back"
    >
      <Icon className="h-4 w-4" />
      {variant === "arrow" && <span className="hidden sm:inline">Back</span>}
    </Button>
  );
}
