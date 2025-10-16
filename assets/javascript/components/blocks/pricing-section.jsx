import * as React from "react";
import { PricingCard } from "@/shadcn/components/ui/pricing-card";
import { Tab } from "@/shadcn/components/ui/pricing-tab";

export function PricingSection({
  title,
  subtitle,
  tiers,
  frequencies,
  onSubscribe,
  hasActiveSubscription,
  usagePackages,
  t
}) {
  const [selectedFrequency, setSelectedFrequency] = React.useState(frequencies[0].key);
  
  // Determine which products to show based on selected frequency
  const renderProducts = () => {
    // Check if we're in usage mode and usagePackages exist
    if (selectedFrequency === "usage" && usagePackages) {
      // Show usage-based packages
      return usagePackages.map((packageItem) => (
        <PricingCard
          key={packageItem.name}
          tier={{
            name: packageItem.name,
            description: packageItem.description,
            price: { monthly: packageItem.price },  // Use monthly field for display
            features: packageItem.features,
            cta: packageItem.cta,
            highlighted: packageItem.highlighted,
            popular: packageItem.popular,
            is_current_plan: false,
            is_disabled: false
          }}
          paymentFrequency="package"
          priceId={packageItem.priceId}
          onSubscribe={() => onSubscribe(packageItem.priceId, "usage", packageItem)}
          hasActiveSubscription={false}
          t={t}
        />
      ));
    } else {
      // Show subscription tiers
      return tiers.map((tier) => (
        <PricingCard
          key={tier.name}
          tier={tier}
          paymentFrequency={selectedFrequency}
          onSubscribe={(priceId) => onSubscribe(priceId, selectedFrequency, tier)}
          hasActiveSubscription={hasActiveSubscription}
          t={t}
        />
      ));
    }
  };

  return (
    <section className="flex flex-col items-center gap-10">
      <div className="space-y-7 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-medium md:text-5xl">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mx-auto flex w-fit rounded-full bg-muted p-1">
          {frequencies.map((freq) => (
            <Tab
              key={freq.key}
              text={freq.key === "usage" ? "Usage Based Packages" : freq.label}
              selected={selectedFrequency === freq.key}
              setSelected={() => setSelectedFrequency(freq.key)}
              discount={freq.key === "usage"}
              isUsageTab={freq.key === "usage"} />
          ))}
        </div>
      </div>
      <div className="w-full max-w-7xl mx-auto">
        {(() => {
          const products = renderProducts();
          const productCount = products.length;
          
          // Determinar las clases del grid según el número de productos
          let gridClasses = "grid gap-4";
          
          if (selectedFrequency === "usage" && usagePackages) {
            // Para usage packages, centrar si hay 2 o menos
            if (productCount === 2) {
              gridClasses = "grid gap-4 grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto";
            } else {
              gridClasses = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";
            }
          } else {
            // Para subscription tiers
            if (productCount === 2) {
              gridClasses = "grid gap-4 grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto";
            } else if (productCount === 3) {
              gridClasses = "grid gap-4 grid-cols-1 md:grid-cols-3";
            } else {
              gridClasses = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";
            }
          }
          
          return (
            <div className={gridClasses}>
              {products}
            </div>
          );
        })()}
      </div>
    </section>
  );
}