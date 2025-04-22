import React from "react";
import { Package, Monitor } from "lucide-react";
import { cn } from "../../lib/utils";
import { ProductImageUpload } from "./ProductImageUpload.jsx";
import { AppScreenshotUpload } from "./AppScreenshotUpload.jsx";

/**
 * Component for displaying both physical product and software/service sections
 * Each section contains its respective image upload components
 */
export function ProductTypeSelect({ className, onProductImageUpload, onAppScreenshotUpload, initialData }) {
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
        Upload images for your product or service
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 relative">
        {/* Physical Product Container */}
        <div
          className="flex flex-col rounded-lg border-2 border-border overflow-hidden"
        >
          {/* Header section with icon and title */}
          <div className="flex items-center p-4 border-b border-border bg-background/50">
            <div className="rounded-full bg-background p-2 shadow-sm mr-3">
              {productTypeOptions[0].icon}
            </div>
            <div>
              <h4 className="text-base font-medium">{productTypeOptions[0].title}</h4>
              <p className="text-xs text-muted-foreground">
                {productTypeOptions[0].description}
              </p>
            </div>
          </div>
          
          {/* Image upload section */}
          <div className="flex-grow">
            <ProductImageUpload 
              onUpload={onProductImageUpload}
              initialData={initialData}
            />
          </div>
        </div>
        
        {/* OR divider for desktop */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-background shadow-sm rounded-full px-4 py-2 text-sm font-medium text-muted-foreground border border-border">
            OR
          </div>
        </div>
        
        {/* OR divider for mobile */}
        <div className="md:hidden w-full flex justify-center my-3">
          <div className="bg-background shadow-sm rounded-full px-4 py-2 text-sm font-medium text-muted-foreground border border-border">
            OR
          </div>
        </div>
        
        {/* Software/Service Container */}
        <div
          className="flex flex-col rounded-lg border-2 border-border overflow-hidden"
        >
          {/* Header section with icon and title */}
          <div className="flex items-center p-4 border-b border-border bg-background/50">
            <div className="rounded-full bg-background p-2 shadow-sm mr-3">
              {productTypeOptions[1].icon}
            </div>
            <div>
              <h4 className="text-base font-medium">{productTypeOptions[1].title}</h4>
              <p className="text-xs text-muted-foreground">
                {productTypeOptions[1].description}
              </p>
            </div>
          </div>
          
          {/* Image upload section */}
          <div className="flex-grow">
            <AppScreenshotUpload 
              onUpload={onAppScreenshotUpload}
              initialData={initialData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
