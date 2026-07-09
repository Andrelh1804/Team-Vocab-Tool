import React from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Settings as SettingsIcon, Users, Shield, Database, Bell, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const RoleBadge = ({ role }: { role: string }) => {
  const { t } = useTranslation();
  switch (role) {
    case 'admin': return <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">{t("common.admin")}</Badge>;
    case 'technician': return <Badge className="bg-secondary/20 text-secondary hover:bg-secondary/30 border-none">{t("common.technician")}</Badge>;
    default: return <Badge variant="outline" className="text-muted-foreground">{t("common.viewer")}</Badge>;
  }
};

export function Settings() {
  const { data: users, isLoading } = useListUsers();
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "en", label: "English" },
    { code: "pt", label: "Português" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-muted-foreground" />
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-card border border-card-border mb-4">
          <TabsTrigger value="users" className="data-[state=active]:bg-background">
            <Users className="w-4 h-4 mr-2" />
            {t("settings.users")}
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-background">
            <Shield className="w-4 h-4 mr-2" />
            {t("settings.security")}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-background">
            <Database className="w-4 h-4 mr-2" />
            {t("settings.integrations")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
            <Bell className="w-4 h-4 mr-2" />
            {t("settings.notifications")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="border-card-border bg-card">
            <CardHeader>
              <CardTitle>{t("settings.teamMembers")}</CardTitle>
              <CardDescription>{t("settings.teamMembersDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-muted-foreground">{t("settings.loadingUsers")}</div>
                ) : (
                  users?.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <RoleBadge role={user.role} />
                        <Switch checked={user.isActive} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-card-border bg-card">
            <CardHeader>
              <CardTitle>{t("settings.securitySettings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base text-white">{t("settings.require2fa")}</Label>
                  <p className="text-sm text-muted-foreground">{t("settings.require2faDesc")}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base text-white">{t("settings.sessionTimeout")}</Label>
                  <p className="text-sm text-muted-foreground">{t("settings.sessionTimeoutDesc")}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base text-white flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    {t("settings.language")}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-card-border w-36 justify-between">
                      {i18n.language === "pt" ? "Português" : "English"}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
