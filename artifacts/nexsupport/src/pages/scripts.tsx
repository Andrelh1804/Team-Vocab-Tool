import React, { useState } from "react";
import { useListScripts } from "@workspace/api-client-react";
import {
  TerminalSquare,
  Search,
  Code2,
  Sparkles,
  Play,
  Copy
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const LanguageBadge = ({ lang }: { lang: string }) => {
  switch (lang) {
    case 'powershell': return <Badge className="bg-[#012456] text-white border-blue-400">PowerShell</Badge>;
    case 'bash': return <Badge className="bg-[#4EAA25] text-white border-green-400">Bash</Badge>;
    case 'python': return <Badge className="bg-[#FFD43B] text-black border-yellow-500">Python</Badge>;
    default: return <Badge variant="outline">CMD</Badge>;
  }
};

export function ScriptsLibrary() {
  const [search, setSearch] = useState("");
  const { data: scripts, isLoading } = useListScripts({ search: search || undefined });
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: t("scripts.copiedToClipboard") });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <TerminalSquare className="w-8 h-8 text-primary" />
            {t("scripts.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("scripts.subtitle")}</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Code2 className="w-4 h-4 mr-2" />
          {t("scripts.newScript")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("scripts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-card-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-auto pb-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 bg-card rounded-xl" />)
        ) : scripts?.length === 0 ? (
          <div className="col-span-full h-64 flex items-center justify-center rounded-xl border border-dashed border-card-border">
            <p className="text-muted-foreground">{t("scripts.noScripts")}</p>
          </div>
        ) : (
          scripts?.map((script) => (
            <Card key={script.id} className="border-card-border bg-card flex flex-col overflow-hidden hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-3 border-b border-border/50 bg-background/30">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {script.title}
                      {script.isAiGenerated && (
                        <Sparkles className="w-3.5 h-3.5 text-secondary" />
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">{script.description}</CardDescription>
                  </div>
                  <LanguageBadge lang={script.language} />
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col relative">
                <div className="bg-[#09090b] p-4 flex-1 overflow-y-auto max-h-[200px] font-mono text-sm text-green-400 whitespace-pre-wrap">
                  {script.content}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#09090b] to-transparent flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="h-8 bg-background/80 backdrop-blur" onClick={() => handleCopy(script.content)}>
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    {t("scripts.copy")}
                  </Button>
                  <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Play className="w-3.5 h-3.5 mr-2" />
                    {t("scripts.run")}
                  </Button>
                </div>
              </CardContent>
              {script.tags && script.tags.length > 0 && (
                <div className="p-3 border-t border-border/50 flex gap-2 flex-wrap bg-background/30">
                  {script.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-muted text-muted-foreground">{tag}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
