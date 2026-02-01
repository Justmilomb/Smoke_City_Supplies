import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: "text-base", sub: "text-[10px]" },
    md: { icon: 38, text: "text-lg", sub: "text-xs" },
    lg: { icon: 52, text: "text-2xl", sub: "text-sm" },
  };

  const { icon, text, sub } = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect x="2" y="2" width="20" height="20" className="fill-primary" />
        <rect x="26" y="2" width="20" height="20" className="fill-background stroke-primary" strokeWidth="2" />
        <rect x="2" y="26" width="20" height="20" className="fill-background stroke-primary" strokeWidth="2" />
        <rect x="26" y="26" width="20" height="20" className="fill-primary" />
        <rect x="14" y="14" width="20" height="20" className="fill-background" />
        <path d="M18 18H30V30H18V18Z" className="fill-primary" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight ${text}`}>
            SMOKE CITY
          </span>
          <span className={`font-medium text-muted-foreground tracking-widest uppercase ${sub}`}>
            Supplies
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" className="fill-primary" />
      <rect x="26" y="2" width="20" height="20" className="fill-background stroke-primary" strokeWidth="2" />
      <rect x="2" y="26" width="20" height="20" className="fill-background stroke-primary" strokeWidth="2" />
      <rect x="26" y="26" width="20" height="20" className="fill-primary" />
      <rect x="14" y="14" width="20" height="20" className="fill-background" />
      <path d="M18 18H30V30H18V18Z" className="fill-primary" />
    </svg>
  );
}
