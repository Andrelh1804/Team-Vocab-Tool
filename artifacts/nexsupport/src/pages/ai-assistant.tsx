import React, { useState, useRef, useEffect } from "react";
import { useAiChat } from "@workspace/api-client-react";
import {
  Bot,
  Send,
  User,
  TerminalSquare,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  scripts?: any[];
  suggestions?: string[];
}

export function AiAssistant() {
  const { t } = useTranslation();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t("ai.greeting"),
      suggestions: [
        t("ai.suggestions.memoryDevices"),
        t("ai.suggestions.restartSpooler"),
        t("ai.suggestions.criticalAlerts"),
      ]
    }
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const chatMutation = useAiChat({
    mutation: {
      onSuccess: (reply) => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: reply.response,
          scripts: reply.scripts,
          suggestions: reply.suggestions
        }]);
      }
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  // Update greeting when language changes
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: t("ai.greeting"),
      suggestions: [
        t("ai.suggestions.memoryDevices"),
        t("ai.suggestions.restartSpooler"),
        t("ai.suggestions.criticalAlerts"),
      ]
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const handleSend = (text: string = input) => {
    if (!text.trim() || chatMutation.isPending) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput("");

    chatMutation.mutate({
      data: { message: text }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-secondary" />
          {t("ai.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("ai.subtitle")}</p>
      </div>

      <Card className="flex-1 border-card-border bg-card overflow-hidden flex flex-col shadow-2xl">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="flex flex-col gap-2">
                <div className={`rounded-xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-background border border-border text-foreground rounded-tl-sm'
                }`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-white/90">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {msg.scripts && msg.scripts.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {msg.scripts.map((script: any, i: number) => (
                      <div key={i} className="border border-card-border bg-[#0f111a] rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-card-border">
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                            <TerminalSquare className="w-3.5 h-3.5" />
                            {script.language}
                          </span>
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-primary hover:text-primary-foreground hover:bg-primary">
                            {t("ai.runScript")}
                          </Button>
                        </div>
                        <pre className="p-3 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
                          {script.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                {msg.suggestions && msg.suggestions.length > 0 && idx === messages.length - 1 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.suggestions.map((sug, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-card cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors py-1.5"
                        onClick={() => handleSend(sug)}
                      >
                        {sug}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-4 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-background border border-border rounded-xl rounded-tl-sm p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-secondary animate-spin" />
                <span className="text-sm text-muted-foreground animate-pulse">{t("ai.analyzing")}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>

        <div className="p-4 border-t border-card-border bg-background/50">
          <div className="relative flex items-center">
            <Textarea
              placeholder={t("ai.inputPlaceholder")}
              className="min-h-[52px] h-[52px] resize-none pr-12 py-3 bg-[#0a0a0a] border-card-border focus-visible:ring-secondary/50 rounded-xl"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg shadow-[0_0_15px_rgba(255,176,0,0.2)]"
              disabled={!input.trim() || chatMutation.isPending}
              onClick={() => handleSend()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground font-mono">{t("ai.disclaimer")}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
