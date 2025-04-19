"use client";
import * as React from "react"
import { BadgeCheck, ArrowRight } from "lucide-react"
import NumberFlow from "@number-flow/react"

import { cn } from "@/utilities/shadcn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StripeCheckoutModal } from "@/components/ui/stripe-checkout-modal"

export function PricingCard({
  tier,
  paymentFrequency
}) {
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false)
  const price = tier.price[paymentFrequency]
  const isHighlighted = tier.highlighted
  const isPopular = tier.popular
  
  // Free tier doesn't need checkout
  const isFree = tier.name === "Free" || (typeof price === "number" && price === 0)
  
  // Get the price ID from the tier metadata if available
  const priceId = tier.priceId?.[paymentFrequency] || ""
  
  const handleSubscribe = () => {
    if (isFree) {
      // For free tier, just redirect to the dashboard or show a message
      window.location.href = "/dashboard/"
      return
    }
    
    if (tier.name === "Enterprise") {
      // For enterprise, redirect to contact page
      window.location.href = "/contact/"
      return
    }
    
    // For paid plans, open the checkout modal
    setIsCheckoutOpen(true)
  }

  return (
    <Card
      className={cn("relative flex flex-col gap-8 overflow-hidden p-6", isHighlighted
        ? "bg-foreground text-background"
        : "bg-background text-foreground", isPopular && "ring-2 ring-primary")}>
      {isHighlighted && <HighlightedBackground />}
      {isPopular && <PopularBackground />}
      <h2 className="flex items-center gap-3 text-xl font-medium capitalize">
        {tier.name}
        {isPopular && (
          <Badge variant="secondary" className="mt-1 z-10">
            🔥 Most Popular
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
              Per {paymentFrequency === "monthly" ? "month" : "year"}
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
        className="w-full"
        onClick={handleSubscribe}
      >
        {tier.cta}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      
      {/* Stripe Checkout Modal */}
      {!isFree && tier.name !== "Enterprise" && (
        <StripeCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          priceId={priceId}
          planName={tier.name}
          frequency={paymentFrequency}
        />
      )}
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