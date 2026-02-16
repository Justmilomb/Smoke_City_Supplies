import React from "react";
import { useLocation } from "wouter";

type RouteScrollPolicy = "top" | "keep" | "restore";
type RouteScrollRule = {
  match: RegExp;
  onPush: RouteScrollPolicy;
  onPop: RouteScrollPolicy;
};

const SCROLL_KEY_PREFIX = "scroll-pos:";

const routeRules: RouteScrollRule[] = [
  // Keep in-page position for query-only updates and restore for browser history on list pages.
  { match: /^\/store(?:\/)?$/, onPush: "top", onPop: "restore" },
  { match: /^\/catalog(?:\/)?$/, onPush: "top", onPop: "restore" },
];

function pathnameFromLocation(loc: string): string {
  const idx = loc.indexOf("?");
  if (idx === -1) return loc || "/";
  return loc.slice(0, idx) || "/";
}

function findRule(pathname: string): RouteScrollRule | undefined {
  return routeRules.find((r) => r.match.test(pathname));
}

function storageKey(loc: string): string {
  return `${SCROLL_KEY_PREFIX}${loc}`;
}

function saveScrollForLocation(loc: string): void {
  const path = pathnameFromLocation(loc);
  if (!findRule(path)) return;
  try {
    sessionStorage.setItem(storageKey(loc), String(window.scrollY || 0));
  } catch {
    // ignore storage errors
  }
}

function restoreScrollForLocation(loc: string): boolean {
  try {
    const raw = sessionStorage.getItem(storageKey(loc));
    if (!raw) return false;
    const y = Number(raw);
    if (!Number.isFinite(y)) return false;
    window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
    return true;
  } catch {
    return false;
  }
}

export default function NavigationScrollManager() {
  const [loc] = useLocation();
  const previousLocRef = React.useRef(loc);
  const initializedRef = React.useRef(false);
  const nextNavigationIsPopRef = React.useRef(false);

  React.useEffect(() => {
    const prevRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const onPopState = () => {
      nextNavigationIsPopRef.current = true;
    };

    // Keep latest list-page position while scrolling.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        saveScrollForLocation(previousLocRef.current);
      });
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
      window.history.scrollRestoration = prevRestoration;
    };
  }, []);

  React.useEffect(() => {
    const prevLoc = previousLocRef.current;
    const prevPath = pathnameFromLocation(prevLoc);
    const nextPath = pathnameFromLocation(loc);

    if (!initializedRef.current) {
      initializedRef.current = true;
      previousLocRef.current = loc;
      return;
    }

    // Save where we were before handling route transition.
    saveScrollForLocation(prevLoc);

    const isSamePath = prevPath === nextPath;
    const isPop = nextNavigationIsPopRef.current;
    nextNavigationIsPopRef.current = false;

    if (isSamePath) {
      previousLocRef.current = loc;
      return;
    }

    const nextRule = findRule(nextPath);
    const policy: RouteScrollPolicy = isPop ? (nextRule?.onPop ?? "top") : (nextRule?.onPush ?? "top");

    if (policy === "restore") {
      const restored = restoreScrollForLocation(loc);
      if (!restored) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    } else if (policy === "top") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    // "keep" intentionally does nothing.

    previousLocRef.current = loc;
  }, [loc]);

  return null;
}

