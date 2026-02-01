import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export function withAdminGuard<P extends object>(Component: React.ComponentType<P>) {
  return function AdminGuarded(props: P) {
    const { user, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    React.useEffect(() => {
      if (!isLoading && !user) setLocation("/admin/login");
    }, [user, isLoading, setLocation]);

    if (isLoading) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      );
    }
    if (!user) return null;
    return <Component {...props} />;
  };
}
