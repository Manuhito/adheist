import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

const Drawer = Dialog.Root
Drawer.displayName = "Drawer"

const DrawerTrigger = Dialog.Trigger

const DrawerPortal = Dialog.Portal

const DrawerClose = Dialog.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref= { ref }
    className = {
    cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )
  }
    { ...props }
  />
))
  DrawerOverlay.displayName = Dialog.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
  <DrawerOverlay />
  < Dialog.Content
      ref = { ref }
      className = {
    cn(
        "fixed left-0 right-0 bottom-0 z-50 bg-background border-t border-border",
      className
    )
  }
      style = {{
  height: 'auto',
  maxHeight: '90vh',
  minHeight: '200px'
}}
{...props }
    >
  <div className="w-full h-full flex flex-col" >
    <div className="flex-shrink-0 flex justify-center py-3" >
      <div className="w-12 h-1 bg-muted rounded-full" />
        </div>
        < div className = "flex-1 overflow-y-auto px-4 pb-4" >
          { children }
          </div>
          </div>
          </Dialog.Content>
          </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className= { cn("mb-4", className) }
{...props }
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className= { cn("mt-4 pt-4 border-t border-border flex flex-col gap-2", className) }
{...props }
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref= { ref }
    className = { cn("text-lg font-semibold leading-none tracking-tight", className) }
    { ...props }
  />
))
  DrawerTitle.displayName = Dialog.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref= { ref }
    className = { cn("text-sm text-muted-foreground", className) }
    { ...props }
  />
))
  DrawerDescription.displayName = Dialog.Description.displayName

export {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
