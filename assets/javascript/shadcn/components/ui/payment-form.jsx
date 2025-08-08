"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { BadgeCheck, ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@/utilities/shadcn";
import { Badge } from "@/shadcn/components/ui/badge";
import { Button } from "@/shadcn/components/ui/button";
import { Card } from "@/shadcn/components/ui/card";
import { useTranslation } from '../../../lib/useTranslation';

// Función para obtener el valor de una cookie por su nombre
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Función para convertir el código de idioma a formato compatible con Stripe
function getStripeLocale(languageCode) {
  // Mapeo de códigos de idioma a locales de Stripe
  const localeMap = {
    'es': 'es',
    'en': 'en',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'pt': 'pt',
    // Añadir más idiomas según sea necesario
  };
  
  return localeMap[languageCode] || 'auto'; // 'auto' deja que Stripe detecte automáticamente
}

export function PaymentForm({
  clientSecret,
  publishableKey,
  amount,
  currency,
  returnUrl
}) {
  const { t } = useTranslation();
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
          
          // Obtener el idioma del usuario desde la cookie
          const userLanguage = getCookie('adheist_language') || 'en';
          console.log('User language from cookie:', userLanguage);
          
          // Convertir el código de idioma a formato compatible con Stripe
          const stripeLocale = getStripeLocale(userLanguage);
          console.log('Using Stripe locale:', stripeLocale);
          
          const elementsOptions = {
            clientSecret,
            locale: stripeLocale, // Configurar el idioma para Stripe Elements
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "--primary",
                colorText: document.documentElement.classList.contains('dark') ? '#ffffff' : '#1a1a1a',
                colorTextSecondary: document.documentElement.classList.contains('dark') ? '#e0e0e0' : '#424770',
                colorTextPlaceholder: document.documentElement.classList.contains('dark') ? '#a0a0a0' : '#aab7c4',
                colorBackground: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#ffffff',
                colorDanger: '#df1b41',
                fontFamily: '"Inter", system-ui, sans-serif',
                borderRadius: '0.5rem',
                spacingUnit: '4px',
              },
              rules: {
                '.Label': {
                  color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#1a1a1a',
                  fontWeight: '500',
                },
                '.Input': {
                  color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#1a1a1a',
                  backgroundColor: document.documentElement.classList.contains('dark') ? '#2a2a2a' : '#ffffff',
                  borderColor: document.documentElement.classList.contains('dark') ? '#4a4a4a' : '#e0e0e0',
                },
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
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });
      
      if (error) {
        setErrorMessage(error.message || t('payment_form.unexpected_error', 'An unexpected error occurred.'));
        setIsLoading(false);
      }
      // On success, Stripe will redirect to the return_url
    } catch (error) {
      console.error("Payment confirmation error:", error);
      setErrorMessage(t('payment_form.unexpected_error_try_again', 'An unexpected error occurred. Please try again.'));
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="p-6 bg-card dark:bg-card/90">
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-muted-foreground dark:text-muted-foreground/90">{t('payment_form.amount', 'Amount:')}</span>
          <span className="font-medium text-foreground dark:text-foreground/90">{formattedAmount}</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <label htmlFor="payment-element" className="block text-sm font-medium text-foreground dark:text-foreground/90 mb-2">
            {t('payment_form.details', 'Payment details')}
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
              {t('payment_form.processing', 'Processing...')}
            </>
            ) : (
            t('payment_form.pay_now', 'Pay now')
           )}
         </Button>
      </form>
    </Card>
  );
}
