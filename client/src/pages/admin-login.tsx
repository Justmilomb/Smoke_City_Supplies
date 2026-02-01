import React from "react";
import { useLocation } from "wouter";
import { Lock } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, isLoading, login, isLoggingIn } = useAuth();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && user) setLocation("/admin");
  }, [user, isLoading, setLocation]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Enter username and password");
      return;
    }
    try {
      await login(username.trim(), password);
      toast.success("Signed in");
      setLocation("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <SiteLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lock className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Sign In
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to manage your store
            </p>
          </div>
          <Card className="border-border/50 p-8">
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 rounded-lg"
                  placeholder="admin"
                  disabled={isLoggingIn}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-lg"
                  placeholder="••••••••"
                  disabled={isLoggingIn}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Default credentials: username <strong>admin</strong>, password <strong>admin</strong>
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
