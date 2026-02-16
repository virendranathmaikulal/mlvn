import { NavLink, useLocation } from "react-router-dom";
import { Home, Mic, Phone, MessageCircle, Send, MessageSquare, ShoppingCart, FileText, Users, Settings, HelpCircle } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const voiceItems = [
  { title: "Voice Dashboard", url: "/dashboard/voice", icon: Home },
  { title: "Create Agent", url: "/create-agent", icon: Mic },
  { title: "Run Voice Campaign", url: "/campaigns/voice", icon: Phone },
];

const whatsappItems = [
  { title: "WhatsApp Dashboard", url: "/dashboard/whatsapp", icon: MessageCircle },
  { title: "Campaigns", url: "/campaigns/whatsapp", icon: Send },
  { title: "Conversations", url: "/whatsapp/conversations", icon: MessageSquare },
  { title: "Order Leads", url: "/whatsapp/leads", icon: ShoppingCart },
  { title: "Templates", url: "/whatsapp/templates", icon: FileText },
];

const sharedItems = [
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Support", url: "/support", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { profile } = useProfile();

  const hasVoice = profile?.has_voice_integration ?? false;
  const hasWhatsApp = profile?.has_whatsapp_integration ?? false;

  return (
    <Sidebar 
      className={`${isCollapsed ? "w-14" : "w-48"} transition-all duration-300`}
      collapsible="icon"
    >
      <SidebarContent className="bg-sidebar border-sidebar-border">
        <div className="p-2">
          <SidebarTrigger />
        </div>

        {/* Voice Section */}
        {hasVoice && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
              Voice Campaigns
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {voiceItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="transition-colors">
                      <NavLink 
                        to={item.url} 
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
                          }`
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* WhatsApp Section */}
        {hasWhatsApp && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
              WhatsApp
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {whatsappItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="transition-colors">
                      <NavLink 
                        to={item.url} 
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
                          }`
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Shared Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sharedItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="transition-colors">
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* No Features Message */}
        {!hasVoice && !hasWhatsApp && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No features enabled. Contact support.
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
