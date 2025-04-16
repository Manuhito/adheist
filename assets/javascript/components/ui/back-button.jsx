import React from "react";
import { Button } from "./button";
import { ArrowLeft } from "lucide-react";

export function BackButton({ onClick, disabled, isLoading, className = "" }) {
  return (
    <Button 
      onClick={onClick} 
      disabled={disabled}
      className={`group relative overflow-hidden ${className}`}
    >
      <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
        {isLoading ? "Going back..." : "Back"}
      </span>
      <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <ArrowLeft
            className="opacity-60"
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
      </i>
    </Button>
  );
}
