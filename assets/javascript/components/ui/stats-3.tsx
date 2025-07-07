"use client";

import * as React from "react";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import * as ProgressPrimitive from "@radix-ui/react-progress";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends React.ComponentProps<"div"> {}
function Card({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}
Card.displayName = "Card";

interface CardHeaderProps extends React.ComponentProps<"div"> {}
function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.ComponentProps<"div"> {}
function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}
CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends React.ComponentProps<"div"> {}
function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}
CardDescription.displayName = "CardDescription";

interface CardActionProps extends React.ComponentProps<"div"> {}
function CardAction({ className, ...props }: CardActionProps) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}
CardAction.displayName = "CardAction";

interface CardContentProps extends React.ComponentProps<"div"> {}
function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div data-slot="card-content" className={cn("px-6", className)} {...props} />
  );
}
CardContent.displayName = "CardContent";

interface CardFooterProps extends React.ComponentProps<"div"> {}
function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}
CardFooter.displayName = "CardFooter";

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    data-slot="progress"
    className={cn(
      "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className="bg-primary h-full w-full flex-1 transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

const data = [
  {
    name: "Credits",
    stat: "$672",
    limit: "$1,000",
    percentage: 67.2,
  },
];

export default function ProgressBarUsage() {
  return (
    <div className="w-full">
      <Card className="w-full py-4">
        <CardContent>
          <dt className="text-sm text-muted-foreground">Credits</dt>
          <dd className="text-2xl font-semibold text-foreground">$672</dd>
          <Progress value={67.2} className="mt-6 h-2" />
          <dd className="mt-2 flex items-center justify-between text-sm">
            <span className="text-primary">67.2%</span>
            <span className="text-muted-foreground">$672 of $1,000</span>
          </dd>
        </CardContent>
      </Card>
    </div>
  );
}
