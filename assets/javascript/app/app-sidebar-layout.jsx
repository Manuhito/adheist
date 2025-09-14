import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

function AppSidebar({ activeTab }) {
  const menuItems = [
    { id: 'discover', label: 'Discover', href: '/ads/discover/' },
    { id: 'analytics', label: 'Analytics', href: '/ads/analytics/' },
    { id: 'settings', label: 'Settings', href: '/ads/settings/' }
  ];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-2">
          <h2 className="text-lg font-semibold">App Menu</h2>
          <SidebarTrigger className="ml-auto" />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === item.id}
                  >
                    <a href={item.href}>
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarRail />
    </Sidebar>
  );
}

function AppSidebarLayout() {
  // Get data from window globals
  const sidebarData = window.__SIDEBAR_DATA__ || {};
  const activeTab = sidebarData.activeTab || '';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeTab={activeTab} />
        <SidebarInset>
          <ConditionalHeader />
          <main className="flex-1">
            {/* Content from Django template will be inserted here */}
            <div id="sidebar-page-content">
              {/* This is where each page's content will be mounted */}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function ConditionalHeader() {
  const { open } = useSidebar();
  
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      {!open && <SidebarTrigger className="-ml-1" />}
      {!open && <div className="h-4 w-px bg-border mx-2" />}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">App</span>
      </div>
    </header>
  );
}

// Initialize the layout when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-sidebar-layout-container');
  if (container) {
    const root = createRoot(container);
    root.render(<AppSidebarLayout />);
    
    // Mark layout as ready for child components
    window.sidebarLayoutReady = true;
  }
});

export default AppSidebarLayout;
