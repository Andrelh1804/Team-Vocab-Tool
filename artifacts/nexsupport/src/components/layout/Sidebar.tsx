import { Link, useLocation } from "wouter";
import { 
  Activity, 
  AlertTriangle, 
  Bot, 
  Cpu, 
  HardDrive, 
  LayoutDashboard, 
  Settings, 
  TerminalSquare, 
  TicketCheck, 
  Workflow
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Executive", icon: LayoutDashboard },
  { href: "/technical", label: "Technical", icon: Activity },
  { href: "/devices", label: "Devices", icon: HardDrive },
  { href: "/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/ai", label: "AI Assistant", icon: Bot },
  { href: "/scripts", label: "Scripts", icon: TerminalSquare },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <div className="flex items-center gap-2 text-primary">
          <Cpu className="w-8 h-8" />
          <h1 className="font-bold text-xl tracking-tight text-white">NexSupport<span className="text-primary">AI</span></h1>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && item.href !== "/technical" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1 h-4 rounded-full bg-primary" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            OP
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">Operator</span>
            <span className="text-xs text-sidebar-foreground/50">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
