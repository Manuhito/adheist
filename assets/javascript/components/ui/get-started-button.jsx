import React from "react";
import { ChevronRight } from "lucide-react";

export function GetStartedButton({ children, onClick, disabled, className, ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden px-6 py-3 rounded-md font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:bg-gray-700/80 disabled:text-gray-300 disabled:cursor-not-allowed ${className || ""}`}
      {...props}
    >
      <span className="mr-8 transition-opacity duration-500 group-hover:opacity-0">
        {children}
      </span>
      <i className="absolute right-1 top-1 bottom-1 rounded-sm z-10 grid w-1/4 place-items-center transition-all duration-500 bg-primary-foreground/15 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95 text-primary-foreground">
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </i>
    </button>
  );
}
