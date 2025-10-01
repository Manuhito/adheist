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
export { Card };

interface CardContentProps extends React.ComponentProps<"div"> {}
function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div data-slot="card-content" className={cn("px-6", className)} {...props} />
  );
}
CardContent.displayName = "CardContent";
export { CardContent };

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {}
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

interface ProgressBarUsageProps {
  label: string;
  credits: number;
  maxCredits: number;
}

export default function ProgressBarUsage({ label, credits, maxCredits }: ProgressBarUsageProps) {
  // Calcular créditos usados y porcentaje de uso
  const usedCredits = maxCredits - credits;
  const usagePercentage = maxCredits > 0 ? (usedCredits / maxCredits) * 100 : 0;
  
  return (
    <div className="w-full">
      <Card className="w-full py-4">
        <CardContent>
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-2xl font-semibold text-foreground">{credits}</dd>
          <Progress value={usagePercentage} className="mt-6 h-2" />
          <dd className="mt-2 flex items-center justify-between text-sm">
            <span className="text-primary">{usagePercentage.toFixed(1)}%</span>
            <span className="text-muted-foreground">{usedCredits} of {maxCredits} credits used</span>
          </dd>
        </CardContent>
      </Card>
    </div>
  );
}
