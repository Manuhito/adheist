import { Button } from "./button";
import { cn } from "../../lib/utils";
import { ArrowUpRight } from "lucide-react";
import React from "react";

interface ButtonColorfulProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
}

export function ButtonColorful({
    className,
    label = "Explore Components",
    ...props
}: ButtonColorfulProps) {
    return (
        <Button
            className={cn(
                "relative h-10 px-4 overflow-hidden",
                "bg-zinc-900 dark:bg-zinc-100",
                "transition-all duration-300",
                "group hover:shadow-lg dark:hover:shadow-primary/50",
                className
            )}
            {...props}
        >
            {/* Gradient background effect */}
            <div
                className={cn(
                    "absolute inset-0",
                    "bg-gradient-to-r from-primary via-primary/80 to-primary/60",
                    "opacity-70 group-hover:opacity-100 dark:opacity-60 dark:group-hover:opacity-90",
                    "blur-[1px] group-hover:blur-[2px] transition-all duration-300"
                )}
            />

            {/* Content */}
            <div className="relative flex items-center justify-center gap-2 transform transition-transform duration-300">
                <span className="text-white dark:text-zinc-900 group-hover:text-white/95 dark:group-hover:text-zinc-950">{label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-white/90 dark:text-zinc-900/90 group-hover:text-white dark:group-hover:text-zinc-950" />
            </div>
        </Button>
    );
}
