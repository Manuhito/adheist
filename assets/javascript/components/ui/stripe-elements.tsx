import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Loader2 } from 'lucide-react';

// Types for the component props
type StripePaymentFormProps = {
  clientSecret: string;
  returnUrl: string;
  priceId: string;
  buttonText?: string;
};

type StripeCheckoutProps = {
  clientSecret: string | null;
  returnUrl: string;
  priceId: string;
  buttonText?: string;
  isLoading?: boolean;
};

// The form component that uses Stripe Elements
const StripePaymentForm = ({
  clientSecret,
  returnUrl,
  priceId,
  buttonText = 'Subscribe',
}: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Create the subscription
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          metadata: {
            price_id: priceId,
          },
        },
      },
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full mt-4"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
  );
};

// The wrapper component that loads Stripe and renders the form
export const StripeCheckout = ({
  clientSecret,
  returnUrl,
  priceId,
  buttonText,
  isLoading = false,
}: StripeCheckoutProps) => {
  // We'll load the Stripe instance once the component mounts
  const [stripePromise, setStripePromise] = useState(() => {
    // Get the key from a meta tag in the HTML
    const stripeKey = document.querySelector('meta[name="stripe-public-key"]')?.getAttribute('content');
    return stripeKey ? loadStripe(stripeKey) : null;
  });

  if (isLoading || !clientSecret || !stripePromise) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <StripePaymentForm
          clientSecret={clientSecret}
          returnUrl={returnUrl}
          priceId={priceId}
          buttonText={buttonText}
        />
      </Elements>
    </Card>
  );
};
