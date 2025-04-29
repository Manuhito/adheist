import React from "react";
import { Button } from "./button";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "../../lib/useTranslation";

export function NextButton({ onClick, disabled, isLoading, className = "" }) {
  const { t } = useTranslation();
  return (
    <Button 
      onClick={onClick} 
      disabled={disabled}
      className={`group relative overflow-hidden ${className}`}
    >
      <span className="w-20 translate-x-[-0.5rem] transition-opacity duration-500 group-hover:opacity-0">
        {isLoading ? t('next_button.updating', 'Updating...') : t('next_button.next', 'Next')}
      </span>
      <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full" style={{ left: "auto", right: 0 }}>
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <ArrowRight
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
