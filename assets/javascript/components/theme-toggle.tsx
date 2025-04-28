"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="p-0 h-9 w-9"
  >
    <Sun className="h-4 w-4 dark:hidden" />
    <Moon className="hidden h-4 w-4 dark:block" />
    <span className="sr-only">Toggle theme</span>
  </Button>
  );
}
