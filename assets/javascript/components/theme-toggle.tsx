"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  // Don't show in production
  if (process.env.NODE_ENV === "production") return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed bottom-1 left-1 z-50"
      onClick={toggleTheme}
    >
      <Sun className="h-[1.5rem] w-[1.3rem] dark:hidden" />
      <Moon className="hidden h-5 w-5 dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
