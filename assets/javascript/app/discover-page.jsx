import React from 'react';
import { createRoot } from 'react-dom/client';

function DiscoverSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-2">
          <h2 className="text-lg font-semibold">Discover</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Item 1</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Item 2</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarRail />
    </Sidebar>
  );
}

function DiscoverContent() {
  return (
    <div className="flex-1 p-6">
      <h1 className="text-2xl font-bold">Discover Page</h1>
      <p className="text-muted-foreground">Content goes here</p>
    </div>
  );
}

function DiscoverPage() {
  return <DiscoverContent />;
}

// Initialize the discover page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for sidebar layout to be ready
  const checkSidebarReady = () => {
    if (window.sidebarLayoutReady) {
      const container = document.getElementById('sidebar-page-content');
      if (container) {
        const root = createRoot(container);
        root.render(<DiscoverPage />);
      }
    } else {
      setTimeout(checkSidebarReady, 50);
    }
  };
  
  checkSidebarReady();
});

export default DiscoverPage;
