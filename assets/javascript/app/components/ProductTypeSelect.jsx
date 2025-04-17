import React from "react";
import { Package, Monitor } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Component for selecting between physical product or software/service
 * Forces the user to choose one option before proceeding
 */
export function ProductTypeSelect({ value, onChange, className }) {
  const productTypeOptions = [
    {
      id: "physical",
      title: "Physical Product",
      description: "Tangible items that can be photographed",
      icon: <Package className="h-5 w-5 text-blue-500" />,
    },
    {
      id: "software",
      title: "Software / Service",
      description: "Digital products or services with screenshots",
      icon: <Monitor className="h-5 w-5 text-purple-500" />,
    },
  ];

  return (
    <div className={cn("w-full bg-card p-6 rounded-xl", className)}>
      <h3 className="text-lg font-medium mb-4">Product Type</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Select the type of product or service you're advertising
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {productTypeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all",
              "hover:border-primary/70 hover:bg-primary/5",
              value === option.id 
                ? "border-primary bg-primary/10" 
                : "border-border"
            )}
          >
            <div className="rounded-full bg-background p-3 shadow-sm mb-3">
              {option.icon}
            </div>
            <h4 className="text-base font-medium">{option.title}</h4>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {option.description}
            </p>
          </button>
        ))}
      </div>
      
      {!value && (
        <p className="text-sm text-amber-500 mt-4 text-center">
          Please select a product type to continue
        </p>
      )}
    </div>
  );
}
