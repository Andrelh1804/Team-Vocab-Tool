import React, { useState } from "react";
import { useListDevices } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  Laptop,
  Server,
  Router,
  Wifi,
  Printer,
  Shield,
  Monitor,
  HardDrive
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  Body,
  Cell,
  Head,
  Header,
  Row,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'notebook': return <Laptop className="w-4 h-4 text-primary" />;
    case 'desktop': return <Monitor className="w-4 h-4 text-primary" />;
    case 'server': return <Server className="w-4 h-4 text-secondary" />;
    case 'router':
    case 'switch': return <Router className="w-4 h-4 text-purple-500" />;
    case 'ap': return <Wifi className="w-4 h-4 text-blue-400" />;
    case 'firewall': return <Shield className="w-4 h-4 text-destructive" />;
    case 'printer': return <Printer className="w-4 h-4 text-muted-foreground" />;
    default: return <HardDrive className="w-4 h-4 text-muted-foreground" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  switch (status) {
    case 'online': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{t("common.online")}</Badge>;
    case 'offline': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{t("common.offline")}</Badge>;
    case 'warning': return <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">{t("common.warning")}</Badge>;
    default: return <Badge variant="outline" className="bg-muted text-muted-foreground">{t("common.unknown")}</Badge>;
  }
};

export function DevicesList() {
  const [search, setSearch] = useState("");
  const { data: devices, isLoading } = useListDevices({ search: search || undefined });
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "pt" ? ptBR : undefined;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t("devices.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("devices.subtitle")}</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          {t("devices.addDevice")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("devices.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-card-border"
          />
        </div>
        <Button variant="outline" className="border-card-border bg-card">
          <Filter className="w-4 h-4 mr-2" />
          {t("common.filters")}
        </Button>
      </div>

      <div className="rounded-md border border-card-border bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <Header>
              <Row className="border-card-border hover:bg-transparent">
                <Head>{t("devices.hostname")}</Head>
                <Head>{t("devices.status")}</Head>
                <Head>{t("devices.ipAddress")}</Head>
                <Head>{t("devices.os")}</Head>
                <Head>{t("devices.user")}</Head>
                <Head>{t("devices.lastSeen")}</Head>
                <Head className="w-[50px]"></Head>
              </Row>
            </Header>
            <Body>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <Row key={i} className="border-card-border">
                    <Cell><Skeleton className="h-5 w-32" /></Cell>
                    <Cell><Skeleton className="h-5 w-16" /></Cell>
                    <Cell><Skeleton className="h-5 w-24" /></Cell>
                    <Cell><Skeleton className="h-5 w-24" /></Cell>
                    <Cell><Skeleton className="h-5 w-24" /></Cell>
                    <Cell><Skeleton className="h-5 w-20" /></Cell>
                    <Cell></Cell>
                  </Row>
                ))
              ) : devices?.length === 0 ? (
                <Row>
                  <Cell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {t("devices.noDevices")}
                  </Cell>
                </Row>
              ) : (
                devices?.map((device) => (
                  <Row key={device.id} className="border-card-border hover:bg-accent/50 group transition-colors">
                    <Cell className="font-medium text-white">
                      <Link href={`/devices/${device.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        <TypeIcon type={device.type} />
                        <div>
                          <div>{device.hostname || device.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{device.macAddress}</div>
                        </div>
                      </Link>
                    </Cell>
                    <Cell>
                      <StatusBadge status={device.status} />
                    </Cell>
                    <Cell className="font-mono text-xs text-muted-foreground">
                      {device.ipAddress}
                    </Cell>
                    <Cell className="text-sm">
                      {device.operatingSystem || '-'}
                    </Cell>
                    <Cell className="text-sm">
                      {device.assignedUser || '-'}
                    </Cell>
                    <Cell className="text-sm text-muted-foreground whitespace-nowrap">
                      {device.lastSeen ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true, locale: dateLocale }) : t("common.never")}
                    </Cell>
                    <Cell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </Cell>
                  </Row>
                ))
              )}
            </Body>
          </Table>
        </div>
      </div>
    </div>
  );
}
