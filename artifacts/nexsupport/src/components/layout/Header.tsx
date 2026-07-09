import { Bell, Search, Languages, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps = {}) {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "en", label: "English" },
    { code: "pt", label: "Português" },
  ];

  return (
    <header className="h-16 flex items-center justify-between gap-2 px-3 sm:px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
      <button
        onClick={onMenuClick}
        className="md:hidden flex items-center justify-center w-9 h-9 shrink-0 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center w-full max-w-md min-w-0">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("header.searchPlaceholder")}
            className="pl-9 bg-card border-card-border focus-visible:ring-primary h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground font-mono text-xs uppercase px-2 sm:px-3"
            >
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline">{i18n.language === "pt" ? "PT" : "EN"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={i18n.language === lang.code ? "bg-primary/10 text-primary" : ""}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive border-[1.5px] border-background" />
        </button>
      </div>
    </header>
  );
}
