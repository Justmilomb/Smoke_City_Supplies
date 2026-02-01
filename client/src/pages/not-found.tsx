import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import BackButton from "@/components/site/BackButton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <SiteLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <Card className="w-full max-w-md border-border/50">
          <CardContent className="pt-6">
            <div className="mb-6 flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="mb-2 text-center text-2xl font-bold">404 Page Not Found</h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              The page you're looking for doesn't exist.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <BackButton fallback="/" />
              <Link href="/">
                <Button variant="outline" asChild>
                  <a>Go Home</a>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
