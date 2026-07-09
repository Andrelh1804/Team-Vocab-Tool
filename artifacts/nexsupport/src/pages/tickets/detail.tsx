import React, { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetTicket,
  useListTicketComments,
  useAddTicketComment,
  useUpdateTicket,
  TicketStatus
} from "@workspace/api-client-react";
import {
  ArrowLeft,
  Send,
  Clock,
  User,
  MessageSquare,
  HardDrive,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const PriorityBadge = ({ priority }: { priority: string }) => {
  const { t } = useTranslation();
  switch (priority) {
    case 'critical': return <Badge variant="destructive">{t("common.critical")}</Badge>;
    case 'high': return <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">{t("common.high")}</Badge>;
    case 'medium': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">{t("common.medium")}</Badge>;
    default: return <Badge variant="outline" className="bg-muted text-muted-foreground">{t("common.low")}</Badge>;
  }
};

export function TicketDetail() {
  const { id } = useParams();
  const ticketId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "pt" ? ptBR : undefined;

  const { data: ticket, isLoading: isTicketLoading } = useGetTicket(ticketId, {
    query: { enabled: !!ticketId, queryKey: ['ticket', ticketId] }
  });

  const { data: comments, isLoading: isCommentsLoading } = useListTicketComments(ticketId, {
    query: { enabled: !!ticketId, queryKey: ['ticketComments', ticketId] }
  });

  const addComment = useAddTicketComment({
    mutation: {
      onSuccess: () => {
        setCommentText("");
        queryClient.invalidateQueries({ queryKey: ['ticketComments', ticketId] });
      }
    }
  });

  const updateTicket = useUpdateTicket({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      }
    }
  });

  if (isTicketLoading || !ticket) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-card" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[500px] lg:col-span-2 bg-card rounded-xl" />
          <Skeleton className="h-[500px] bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  const handleStatusChange = (newStatus: TicketStatus) => {
    updateTicket.mutate({ id: ticketId, data: { status: newStatus } });
  };

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    addComment.mutate({
      id: ticketId,
      data: {
        content: commentText,
        authorName: t("common.operator"),
        isInternal: false
      }
    });
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0 w-full">
          <Link href="/tickets">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xl font-mono text-primary font-bold">TKT-{ticket.id.toString().padStart(4, '0')}</span>
              <h1 className="text-2xl font-bold tracking-tight text-white break-words">{ticket.title}</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {t("tickets.created")} {format(new Date(ticket.createdAt), "MMM d, yyyy HH:mm")} · {ticket.reporterName}
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-center w-full sm:w-auto">
          <Select value={ticket.status} onValueChange={(val) => handleStatusChange(val as TicketStatus)}>
            <SelectTrigger className="w-full sm:w-[160px] bg-card border-card-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{t("tickets.open")}</SelectItem>
              <SelectItem value="in_progress">{t("tickets.inProgress")}</SelectItem>
              <SelectItem value="pending">{t("common.pending")}</SelectItem>
              <SelectItem value="resolved">{t("common.resolved")}</SelectItem>
              <SelectItem value="closed">{t("tickets.closed")}</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Bot className="w-4 h-4 mr-2" />
            {t("tickets.aiSuggestion")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          <Card className="border-card-border bg-card shrink-0">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-lg">{t("tickets.description")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-white/90 leading-relaxed whitespace-pre-wrap">
              {ticket.description || t("tickets.noDescription")}
            </CardContent>
          </Card>

          <Card className="border-card-border bg-card flex-1 flex flex-col min-h-0">
            <CardHeader className="py-3 border-b border-border/50 shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {t("tickets.conversation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {isCommentsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : comments?.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground italic">
                  {t("tickets.noComments")}
                </div>
              ) : (
                comments?.map((comment) => (
                  <div key={comment.id} className={`flex gap-4 ${comment.isInternal ? 'ml-8' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className={`flex-1 rounded-lg p-3 ${comment.isInternal ? 'bg-secondary/10 border border-secondary/20' : 'bg-background border border-border'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-white">{comment.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: dateLocale })}
                        </span>
                      </div>
                      <p className="text-sm text-white/80">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="p-4 border-t border-border/50 shrink-0 bg-background/50">
              <div className="flex gap-3 w-full">
                <Textarea
                  placeholder={t("tickets.commentPlaceholder")}
                  className="resize-none h-10 min-h-[40px] bg-card border-card-border focus-visible:ring-primary"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                  onClick={handlePostComment}
                  disabled={!commentText.trim() || addComment.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-card-border bg-card">
            <CardHeader>
              <CardTitle>{t("tickets.ticketDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-col gap-1 py-2 border-b border-border/50">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("tickets.priority")}</span>
                <div><PriorityBadge priority={ticket.priority} /></div>
              </div>
              <div className="flex flex-col gap-1 py-2 border-b border-border/50">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("tickets.category")}</span>
                <span className="text-white font-medium">{ticket.category}</span>
              </div>
              {ticket.deviceName && (
                <div className="flex flex-col gap-1 py-2 border-b border-border/50">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("tickets.relatedDevice")}</span>
                  <Link href={`/devices/${ticket.deviceId}`}>
                    <span className="text-primary hover:underline flex items-center gap-1 font-mono cursor-pointer">
                      <HardDrive className="w-3.5 h-3.5" />
                      {ticket.deviceName}
                    </span>
                  </Link>
                </div>
              )}
              <div className="flex flex-col gap-1 py-2 border-b border-border/50">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("tickets.assignee")}</span>
                <span className="text-white flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                  {ticket.assigneeName || t("tickets.unassigned")}
                </span>
              </div>
              <div className="flex flex-col gap-1 py-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">{t("tickets.slaDeadline")}</span>
                <span className="text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-secondary" />
                  {ticket.slaDeadline ? format(new Date(ticket.slaDeadline), "MMM d, HH:mm") : t("tickets.noSla")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
