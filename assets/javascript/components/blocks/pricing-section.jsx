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
      <div className="w-full max-w-6xl mx-auto">
        <div className={`grid gap-6 sm:grid-cols-2 ${selectedFrequency === "usage" && usagePackages?.length === 2 ? 'xl:grid-cols-2' : tiers.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
          {/* Renderizar productos con columnas vacías al inicio para centrar */}
          {(() => {
            const products = renderProducts();
            // Determinar el número total de columnas según la pestaña seleccionada
            const totalCols = selectedFrequency === "usage" && usagePackages ? 
              (usagePackages.length === 2 ? 2 : 4) : // Si hay 2 paquetes, usar 2 columnas, de lo contrario 4
              (tiers.length === 3 ? 3 : 4); // Para planes de suscripción, usar 3 o 4 columnas
            const productCount = products.length;
            
            // Si hay menos productos que columnas, agregar columnas vacías al inicio
            if (productCount < totalCols) {
              const emptyColsToAdd = Math.floor((totalCols - productCount) / 2);
              const result = [];
              
              // Agregar columnas vacías al inicio
              for (let i = 0; i < emptyColsToAdd; i++) {
                result.push(<div key={`empty-${i}`} className="hidden xl:block"></div>);
              }
              
              // Agregar los productos
              return [...result, ...products];
            }
            
            return products;
          })()}
        </div>
      </div>
    </section>
  );
}