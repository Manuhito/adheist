"use client";
import * as React from "react"
import { BadgeCheck, ArrowRight, ArrowUp, ArrowDown } from "lucide-react"
import NumberFlow from "@number-flow/react"

import { cn } from "@/utilities/shadcn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function PricingCard({
  tier,
  paymentFrequency,
  onSubscribe,
  hasActiveSubscription,
  t,
  priceId: externalPriceId
}) {
  // Para paquetes basados en uso, usamos el precio mensual como base
  const price = paymentFrequency === 'package' ? tier.price.monthly : tier.price[paymentFrequency]
  const isHighlighted = tier.highlighted
  const isPopular = tier.popular
  const isCurrentPlan = tier.is_current_plan
  const isDisabled = tier.is_disabled
  console.log("Pricing card data:", { tier, paymentFrequency, onSubscribe, isDisabled })

  // Get the correct Stripe price ID based on payment frequency or use provided priceId
  const priceId = externalPriceId || (paymentFrequency === 'monthly'
    ? tier.price?.monthlyPriceId
    : tier.price?.usagePriceId);

  // Determinar si es un upgrade o downgrade en relación al plan actual
  const isUpgrade = hasActiveSubscription && !isCurrentPlan && !isDisabled;

  // Determinar el texto del botón según el estado
  const getButtonText = () => {
    if (isCurrentPlan) {
      return t('pricing.current_plan', 'Current Plan');
    } else if (hasActiveSubscription) {
      // Si ya tiene una suscripción y no es el plan actual, mostrar "Cambiar a este plan"
      return isUpgrade
        ? t('pricing.upgrade_to_plan', 'Upgrade to this plan')
        : t('pricing.downgrade_to_plan', 'Downgrade to this plan');
    } else {
      // Si no tiene suscripción, mostrar el CTA normal
      return tier.cta;
    }
  };

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-8 overflow-hidden p-6",
        isHighlighted ? "bg-foreground text-background" : "bg-background text-foreground",
        isPopular && "ring-2 ring-primary")}>
      {isHighlighted && <HighlightedBackground />}
      {isPopular && <PopularBackground />}
      <h2 className="flex items-center gap-3 text-xl font-medium capitalize">
        {tier.name}
        {isCurrentPlan ? (
          <Badge
            variant={isHighlighted ? "secondary" : "outline"}
            className="mt-1 z-10"
          >
            {t('pricing.current_plan', 'Current Plan')}
          </Badge>
        ) : isPopular && (
          <Badge variant="secondary" className="mt-1 z-10">
            {t('pricing.most_popular', '🔥 Most Popular')}
          </Badge>
        )}
      </h2>
      <div className="relative h-12">
        {typeof price === "number" ? (
          <>
            <NumberFlow
              format={{
                style: "currency",
                currency: "USD",
                trailingZeroDisplay: "stripIfInteger",
              }}
              value={price}
              className="text-4xl font-medium" />
            <p className="-mt-2 text-xs text-muted-foreground">
              {paymentFrequency === 'package' 
                ? t('pricing.one_time', 'One-time package') 
                : t('pricing.per_month', 'Per month')}
            </p>
          </>
        ) : (
          <h1 className="text-4xl font-medium">{price}</h1>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <h3 className="text-sm font-medium">{tier.description}</h3>
        <ul className="space-y-2">
          {tier.features.map((feature, index) => (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                isHighlighted ? "text-background" : "text-muted-foreground"
              )}>
              <BadgeCheck className="h-4 w-4" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <Button
        variant={isHighlighted ? "secondary" : "default"}
        className="w-full relative z-10"
        onClick={() => onSubscribe && onSubscribe(priceId)}
        disabled={!onSubscribe || !priceId || isCurrentPlan}
      >
        {getButtonText()}
        {!isCurrentPlan && (
          hasActiveSubscription ? (
            isUpgrade ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowRight className="ml-2 h-4 w-4" />
          )
        )}
      </Button>
    </Card>
  );
}

const HighlightedBackground = () => (
  <div
    className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:45px_45px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
)

const PopularBackground = () => (
  <div
    className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
)