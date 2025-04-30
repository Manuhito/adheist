import * as React from "react"
import { PricingCard } from "@/shadcn/components/ui/pricing-card";
import { Tab } from "@/shadcn/components/ui/pricing-tab"

export function PricingSection({
  title,
  subtitle,
  tiers,
  frequencies,
  onSubscribe,
  t
}) {
  const [selectedFrequency, setSelectedFrequency] = React.useState(frequencies[0].key)
  console.log("data on ps:", { title, subtitle, tiers, frequencies, onSubscribe })

  return (
    <section className="flex flex-col items-center gap-10 py-10">
      <div className="space-y-7 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-medium md:text-5xl">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mx-auto flex w-fit rounded-full bg-muted p-1">
          {frequencies.map((freq) => (
            <Tab
              key={freq.key}
              text={freq.label}
              selected={selectedFrequency === freq.key}
              setSelected={() => setSelectedFrequency(freq.key)}
              discount={freq.key === "yearly"} />
          ))}
        </div>
      </div>
      <div className="grid w-full max-w-6xl gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => (
          <PricingCard 
            key={tier.name} 
            tier={tier} 
            paymentFrequency={selectedFrequency} 
            onSubscribe={onSubscribe}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}