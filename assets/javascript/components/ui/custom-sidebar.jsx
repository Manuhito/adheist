import * as React from "react"
import { Menu } from "lucide-react"
import {
  Sidebar as OriginalSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/utilities/shadcn"

// Componente personalizado que reemplaza SidebarTrigger
const CustomSidebarTrigger = React.forwardRef(({ className, onClick, children, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}>
      {children || <Menu className="h-5 w-5" />}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
})
CustomSidebarTrigger.displayName = "CustomSidebarTrigger"

// Componente personalizado que reemplaza Sidebar para usar colores de background de la aplicación
const CustomSidebar = React.forwardRef((props, ref) => {
  return <OriginalSidebar 
    ref={ref} 
    {...props} 
    className="bg-background border-r border-border"
  />
})
CustomSidebar.displayName = "CustomSidebar"

export {
  CustomSidebarTrigger,
  CustomSidebar,
  // Re-exportamos todos los componentes originales
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
}
