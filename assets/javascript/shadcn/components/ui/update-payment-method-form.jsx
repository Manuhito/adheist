"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { CreditCard, Loader2, CheckCircle } from "lucide-react";

import { cn } from "@/utilities/shadcn";
import { Button } from "@/shadcn/components/ui/button";
import { Card } from "@/shadcn/components/ui/card";
import { useTranslation } from '../../../lib/useTranslation';

export function UpdatePaymentMethodForm({
  clientSecret,
  publishableKey,
  customerId,
  onSuccess
}) {
  const { t } = useTranslation();
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  
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
                colorPrimary: "#0891b2", // Tailwind cyan-600
                fontFamily: "'Inter', system-ui, sans-serif",
                borderRadius: "0.5rem",
              },
            },
          };
          
          const elementsInstance = stripeInstance.elements(elementsOptions);
          setElements(elementsInstance);
          
          // Create and mount the Payment Element
          const paymentElement = elementsInstance.create("payment", {
            defaultValues: {
              billingDetails: {
                // You can pre-fill billing details if available
              }
            },
            fields: {
              billingDetails: 'auto'
            }
          });
          
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
        setErrorMessage(t('payment_form.failed_load', 'Failed to load payment form. Please try again.'));
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
      // Confirm the SetupIntent
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.href,
        }
      });
      
      if (setupError) {
        setErrorMessage(setupError.message || t('payment_form.unexpected_error', 'An unexpected error occurred.'));
        setIsLoading(false);
        return;
      }
      
      // If setup was successful, set the payment method as default
      if (setupIntent.status === 'succeeded') {
        // Get CSRF token from cookie
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrftoken='))
          ?.split('=')[1];
        
        if (!csrfToken) {
          throw new Error('CSRF token not found');
        }
        
        // Set the payment method as default
        const response = await fetch('/subscriptions/api/set-default-payment-method/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: `paymentMethodId=${setupIntent.payment_method}`,
          credentials: 'same-origin',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to set default payment method');
        }
        
        setIsComplete(true);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Payment method update error:", error);
      setErrorMessage(error.message || t('payment_form.unexpected_error_try_again', 'An unexpected error occurred. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="p-6 bg-card dark:bg-card/90">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <div className="flex items-center mb-4">
            <CreditCard className="mr-2 h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">
              {t('payment_form.card_details', 'Card Details')}
            </h3>
          </div>
          
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
          disabled={isLoading || !stripe || !elements || isComplete}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('payment_form.processing', 'Processing...')}
            </>
          ) : isComplete ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('payment_form.updated', 'Payment Method Updated')}
            </>
          ) : (
            t('payment_form.update_payment_method', 'Update Payment Method')
          )}
        </Button>
      </form>
    </Card>
  );
}
