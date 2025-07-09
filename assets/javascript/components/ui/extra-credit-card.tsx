import React from "react";
import { Card, CardContent } from "./progress-bar-usage";

interface ExtraCreditCardProps {
  label: string;
  credits: number;
}

export function ExtraCreditCard({ label, credits }: ExtraCreditCardProps) {
  return (
    <Card className="w-full max-w-[180px] flex-1 px-2 py-3 text-center border border">
      <CardContent className="px-0">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-xl font-bold">{credits}</div>
      </CardContent>
    </Card>
  );
}
