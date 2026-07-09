import React from "react";
import { useListUsers, UserRole } from "@workspace/api-client-react";
import { Settings as SettingsIcon, Users, Shield, Database, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const RoleBadge = ({ role }: { role: string }) => {
  switch (role) {
    case 'admin': return <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Admin</Badge>;
    case 'technician': return <Badge className="bg-secondary/20 text-secondary hover:bg-secondary/30 border-none">Technician</Badge>;
    default: return <Badge variant="outline" className="text-muted-foreground">Viewer</Badge>;
  }
};

export function Settings() {
  const { data: users, isLoading } = useListUsers();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-muted-foreground" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Platform configuration and access control</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-card border border-card-border mb-4">
          <TabsTrigger value="users" className="data-[state=active]:bg-background">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-background">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-background">
            <Database className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="border-card-border bg-card">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage access and roles for your support team.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-muted-foreground">Loading users...</div>
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
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base text-white">Require Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Enforce 2FA for all admin and technician roles.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base text-white">Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">Automatically log out inactive users after 30 minutes.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
