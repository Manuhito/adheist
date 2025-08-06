import React from "react";
import { Card, CardContent } from "./progress-bar-usage";

interface ExtraCreditCardProps {
  label: string;
  credits: number;
}

export function ExtraCreditCard({ label, credits }: ExtraCreditCardProps) {
  return (
    <Card className="w-full flex-1 px-2 py-4 text-center border border-muted bg-background shadow-sm hover:border-primary/20 transition-colors">
      <CardContent className="px-2">
        <div className="text-sm text-muted-foreground mb-2">{label}</div>
        <div className="text-2xl font-semibold text-primary">{credits}</div>
      </CardContent>
    </Card>
  );
}
