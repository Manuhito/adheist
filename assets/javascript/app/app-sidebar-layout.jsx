import React from 'react';
import { createRoot } from 'react-dom/client';
import {
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
  useSidebar,
} from "@/components/ui/sidebar"
import { CustomSidebarTrigger, CustomSidebar } from "@/components/ui/custom-sidebar"
import { Button } from "@/components/ui/button"
import { PanelLeftClose, Menu, Compass, Bookmark, Zap, Library, Folders } from "lucide-react"

function AppSidebar({ activeTab, sidebarComponent }) {
  const menuItems = [
    { id: 'discover', label: 'Discover', href: '/ads/discover/', icon: <Compass className="h-5 w-5" /> },
    { id: 'bookmark', label: 'Bookmark', href: '/ads/bookmark/', icon: <Bookmark className="h-5 w-5" /> },
    { id: 'my-ads', label: 'My Ads', href: '/ads/my-ads/', icon: <Zap className="h-5 w-5" /> },
    { id: 'brands-library', label: 'Brands Library', href: '/ads/brands/', icon: <Library className="h-5 w-5" /> },
    { id: 'assets', label: 'Assets', href: '/ads/assets/', icon: <Folders className="h-5 w-5" /> },
  ];

  return (
    <CustomSidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center">
            <img
              src="/static/images/web/logo-brand-name.png"
              alt="AdHeist Logo"
              className="h-8 w-auto"
            />
          </div>
          <CustomSidebarTrigger className="ml-auto">
            <PanelLeftClose className="h-5 w-5 text-muted-foreground" />
          </CustomSidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeTab === item.id}
                    className={activeTab === item.id ? "bg-primary/5 rounded-md" : ""}
                  >
                    <a href={item.href} className="flex items-center gap-3 py-3">
                      <span className={activeTab === item.id ? "text-primary" : ""}>
                        {item.icon}
                      </span>
                      <span className={`text-base ${activeTab === item.id ? "text-primary font-medium" : ""}`}>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </CustomSidebar>
  );
}

function AppSidebarLayout() {
  const [headerComponent, setHeaderComponent] = React.useState(null);
  const [sidebarComponent, setSidebarComponent] = React.useState(null);

  // Get data from window globals
  const sidebarData = window.__SIDEBAR_DATA__ || {};
  const activeTab = sidebarData.activeTab || '';
  const showHeader = sidebarData.showHeader !== false; // Default to true
  const headerContent = sidebarData.headerContent || null;
  const hideLogo = sidebarData.hideLogo || false; // Default to false (show logo)

  // Make header and sidebar component setters available globally
  React.useEffect(() => {
    window.setAppHeader = setHeaderComponent;
    window.clearAppHeader = () => setHeaderComponent(null);
    
    // Añadir setters para el componente de sidebar
    window.setSidebarComponent = setSidebarComponent;
    window.clearSidebarComponent = () => setSidebarComponent(null);

    return () => {
      delete window.setAppHeader;
      delete window.clearAppHeader;
      delete window.setSidebarComponent;
      delete window.clearSidebarComponent;
    };
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeTab={activeTab} sidebarComponent={sidebarComponent} />
        <SidebarInset>
          {showHeader && (
            <ConditionalHeader
              content={headerContent}
              customComponent={headerComponent}
              hideLogo={hideLogo}
            />
          )}
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

function ConditionalHeader({ content, customComponent, hideLogo = false }) {
  const { open } = useSidebar();

  // Priority: customComponent > content > empty
  const headerContent = customComponent || content;

  return (
    <header className="flex h-16 shrink-0 items-center px-4">
      {!open && (
        <CustomSidebarTrigger className="-ml-1 mr-2">
          <Menu className="h-6 w-6 text-muted-foreground" />
        </CustomSidebarTrigger>
      )}
      
      {/* Logo de la app - se oculta si hideLogo es true */}
      {!hideLogo && (
        <div className="flex items-center mr-4">
          <img
            src="/static/images/web/logo-adheist.png"
            alt="AdHeist Logo"
            className="h-8 w-auto"
          />
        </div>
      )}
      
      {/* Custom header content takes full width */}
      {headerContent && React.isValidElement(headerContent) ? (
        <div className="flex-1">
          {headerContent}
        </div>
      ) : (
        <>
          {/* Contenedor para el componente de búsqueda */}
          <div className="flex-1 max-w-md mx-4">
            <div id="header-search-container"></div>
          </div>
          
          {!open && headerContent && <div className="h-4 w-px bg-border mx-2" />}
          {headerContent && (
            <div className="flex items-center gap-2 text-sm">
              {typeof headerContent === 'string' ? (
                <span className="font-medium">{headerContent}</span>
              ) : (
                headerContent
              )}
            </div>
          )}
        </>
      )}
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
