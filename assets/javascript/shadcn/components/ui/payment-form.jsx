"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { BadgeCheck, ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@/utilities/shadcn";
import { Badge } from "@/shadcn/components/ui/badge";
import { Button } from "@/shadcn/components/ui/button";
import { Card } from "@/shadcn/components/ui/card";

export function PaymentForm({
  clientSecret,
  publishableKey,
  amount,
  currency,
  returnUrl
}) {
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Format the amount for display
  const formattedAmount = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
  
  // Load Stripe on component mount
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        // Dynamically import Stripe.js
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripeInstance = await loadStripe(publishableKey);
        
        if (stripeInstance) {
          setStripe(stripeInstance);
          
          const elementsOptions = {
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "--primary",
              },
            },
          };
          
          const elementsInstance = stripeInstance.elements(elementsOptions);
          setElements(elementsInstance);
          
          // Create and mount the Payment Element
          const paymentElement = elementsInstance.create("payment");
          
          // Use setTimeout to ensure the DOM is ready
          setTimeout(() => {
            const paymentElementContainer = document.getElementById("payment-element");
            if (paymentElementContainer) {
              paymentElement.mount("#payment-element");
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error initializing Stripe:", error);
        setErrorMessage("Failed to load payment form. Please try again.");
      }
    };
    
    if (publishableKey && clientSecret) {
      initializeStripe();
    }
  }, [publishableKey, clientSecret]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }
    
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });
      
      if (error) {
        setErrorMessage(error.message || "An unexpected error occurred.");
        setIsLoading(false);
      }
      // On success, Stripe will redirect to the return_url
    } catch (error) {
      console.error("Payment confirmation error:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="p-6 bg-card dark:bg-card/90">
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-muted-foreground dark:text-muted-foreground/90">Amount:</span>
          <span className="font-medium text-foreground dark:text-foreground/90">{formattedAmount}</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <label htmlFor="payment-element" className="block text-sm font-medium text-foreground dark:text-foreground/90 mb-2">
            Payment details
          </label>
          <div id="payment-element" className="p-4 border rounded-md dark:border-muted/30 dark:bg-background/50">
            {/* Stripe Elements will be inserted here */}
          </div>
        </div>
        
        {errorMessage && (
          <div className="text-red-500 dark:text-red-400 text-sm mb-4">{errorMessage}</div>
        )}
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !stripe || !elements}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Pay now"
          )}
        </Button>
      </form>
    </Card>
  );
}
