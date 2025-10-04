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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeSwitch } from "@/components/theme-switch"
import { PanelLeftClose, Menu, Compass, Bookmark, Zap, Library, Folders, User2, ChevronUp, CreditCard, Settings, LogOut, Sparkles } from "lucide-react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

function CreditsProgressBar() {
  const creditsData = window.__USER_CREDITS__;
  
  if (!creditsData || creditsData.max_general_credits === 0) {
    return null;
  }

  const totalCredits = creditsData.general_credits + (creditsData.extra_general_credits || 0);
  const maxCredits = creditsData.max_general_credits;
  const usedCredits = maxCredits - creditsData.general_credits;
  const usagePercentage = maxCredits > 0 ? (usedCredits / maxCredits) * 100 : 0;

  return (
    <div className="px-3 py-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary">Credits</span>
          <span className="text-sm font-semibold text-primary">{totalCredits}</span>
        </div>
        <ProgressPrimitive.Root
          className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"
          value={usagePercentage}
        >
          <ProgressPrimitive.Indicator
            className="h-full w-full flex-1 bg-primary transition-all"
            style={{ transform: `translateX(-${100 - usagePercentage}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    </div>
  );
}

function AppSidebar({ activeTab, sidebarComponent }) {
  const menuItems = [
    { id: 'discover', label: 'Discover', href: '/ads/discover/', icon: <Compass className="h-5 w-5" /> },
    { id: 'my-ads', label: 'My Ads', href: '/ads/my-ads/', icon: <Zap className="h-5 w-5" /> },
    { id: 'brands-library', label: 'Brands Library', href: '/ads/brands/', icon: <Library className="h-5 w-5" /> },
    { id: 'assets', label: 'Assets', href: '/ads/assets/', icon: <Folders className="h-5 w-5" /> },
  ];

  // Get user data from window object if available
  const userData = window.__USER_DATA__ || {};
  const user = {
    name: userData.name || '',
    email: userData.email || '',
    avatar: userData.avatar || '',
    initials: userData.name 
      ? userData.name.split(' ').map((n) => n[0]).join('').toUpperCase()
      : userData.email ? userData.email[0].toUpperCase() : 'U',
    displayName: userData.name || userData.email || 'User'
  };

  return (
    <CustomSidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <img
                src="/static/images/web/logo-brand-name.png"
                alt="AdHeist Logo"
                className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              />
            </a>
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

      <SidebarFooter>
        <CreditsProgressBar />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 className="h-4 w-4" />
                  <span>{user.displayName}</span>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <div className="px-2 py-2 flex items-center gap-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {user.initials}
                    </div>
                  )}
                  <div className={`flex flex-col ${!user.name ? 'justify-center' : ''}`}>
                    {user.name && (
                      <span className="text-sm font-medium">{user.name}</span>
                    )}
                    {user.email && (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/users/profile/" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Profile</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/ads/billing/" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Upgrade</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/ads/billing/" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Billing</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-sm">Theme</span>
                  <ThemeSwitch />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/accounts/logout/" className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

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
          <a href="/" className="flex items-center">
            <img
              src="/static/images/web/logo-adheist.png"
              alt="AdHeist Logo"
              className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
            />
          </a>
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
