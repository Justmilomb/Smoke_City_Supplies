import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, ArrowLeft, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import BackButton from "@/components/site/BackButton";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API = "/api";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  subject?: string;
  partNumber?: string;
  message: string;
  status: string;
  replyBody?: string;
  repliedAt?: string;
  adminNotes?: string;
  createdAt: string;
};

async function fetchEnquiries(): Promise<Enquiry[]> {
  const res = await fetch(`${API}/contact-submissions`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load enquiries");
  return res.json();
}

async function sendReply(id: string, replyBody: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API}/contact-submissions/${id}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ replyBody }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Failed to send reply");
  return data;
}

export default function AdminEnquiries() {
  usePageMeta({ title: "Enquiries", description: "View and reply to contact form submissions." });
  const queryClient = useQueryClient();
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["contact-submissions"],
    queryFn: fetchEnquiries,
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const selected = selectedId ? enquiries.find((e) => e.id === selectedId) : null;

  const handleSendReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    try {
      const result = await sendReply(selectedId, replyText.trim());
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
      toast.success(result.message);
      setReplyText("");
      setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const mailtoLink = selected
    ? `mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(`Re: ${selected.subject ?? "Your enquiry"}`)}&body=${encodeURIComponent(
        "Re: " + (selected.message || "").slice(0, 400) + "\n\n---\n"
      )}`
    : "#";

  const newCount = enquiries.filter((e) => e.status === "new").length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Loading enquiries…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Enquiries
            </h1>
            <p className="mt-2 text-muted-foreground">
              Contact form submissions. Reply from here (sends email) or from your own Gmail/Outlook using the link below.
            </p>
            {newCount > 0 && (
              <Badge variant="default" className="mt-2">
                {newCount} new
              </Badge>
            )}
          </div>
          <BackButton fallback="/admin" />
        </div>

        <Card className="border-border/50 overflow-hidden">
          {enquiries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No enquiries yet. Submissions from the contact form will appear here.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {enquiries.map((enq) => (
                <li key={enq.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{enq.name}</span>
                      <span className="text-sm text-muted-foreground">{enq.email}</span>
                      {enq.status === "new" && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                      {enq.status === "replied" && (
                        <Badge variant="outline" className="text-xs">Replied</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {enq.subject ?? "No subject"}
                      {enq.partNumber && ` · Part: ${enq.partNumber}`}
                    </div>
                    <div className="text-sm mt-1 line-clamp-2 text-muted-foreground">
                      {enq.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(enq.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setSelectedId(enq.id);
                      setReplyText("");
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    View & reply
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enquiry from {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Email:</span>{" "}
                  <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                    {selected.email}
                  </a>
                </p>
                {selected.subject && (
                  <p><span className="text-muted-foreground">Subject:</span> {selected.subject}</p>
                )}
                {selected.partNumber && (
                  <p><span className="text-muted-foreground">Part:</span> {selected.partNumber}</p>
                )}
                <p><span className="text-muted-foreground">Date:</span> {new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {selected.message}
              </div>
              {selected.repliedAt && selected.replyBody && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm whitespace-pre-wrap">
                  <div className="text-xs text-muted-foreground mb-1">Your reply ({new Date(selected.repliedAt).toLocaleString()}):</div>
                  {selected.replyBody}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Reply (sends email to customer)</label>
                <Textarea
                  placeholder="Type your reply…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="rounded-lg"
                  disabled={sending}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Sending…" : "Send reply (email)"}
                </Button>
                <Button variant="outline" asChild>
                  <a href={mailtoLink} target="_blank" rel="noopener noreferrer" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Reply from Gmail/Outlook
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If SMTP is not configured, &quot;Send reply&quot; will only save the reply. Use &quot;Reply from Gmail/Outlook&quot; to email the customer from your own inbox.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
