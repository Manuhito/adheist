import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/utilities/shadcn"
import { Badge } from "@/components/ui/badge"

export function Tab({
  text,
  selected,
  setSelected,
  discount = false,
  isUsageTab = false
}) {
  return (
    <button
      onClick={() => setSelected(text)}
      className={cn(
        "relative w-fit px-4 py-2 text-sm font-semibold capitalize",
        "text-foreground transition-colors",
        discount && "flex items-center justify-center gap-2.5"
      )}>
      <span className="relative z-10">{text}</span>
      {selected && (
        <motion.span
          layoutId="tab"
          transition={{ type: "spring", duration: 0.4 }}
          className="absolute inset-0 z-0 rounded-full bg-background shadow-sm" />
      )}
      {discount && (
        <Badge
          variant="secondary"
          className={cn(
            "relative z-10 whitespace-nowrap shadow-none", 
            selected && !isUsageTab && "bg-muted",
            selected && isUsageTab && "bg-primary text-white"
          )}>
          Save 20%
        </Badge>
      )}
    </button>
  );
}