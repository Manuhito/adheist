import React, { useState, useEffect } from 'react';
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
      console.error('Stripe or Elements not loaded');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    console.log('Confirming payment with return URL:', returnUrl);
    
    try {
      // Create the subscription
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });

      console.log('Payment confirmation result:', result);
      
      if (result.error) {
        console.error('Payment confirmation error:', result.error);
        setErrorMessage(result.error.message || 'An error occurred');
      } else if (result.paymentIntent) {
        // Check if payment succeeded
        if (result.paymentIntent.status === 'succeeded') {
          console.log('Payment succeeded, redirecting to:', returnUrl);
          window.location.href = returnUrl;
          return;
        } else {
          console.log('Payment status:', result.paymentIntent.status);
        }
      }
    } catch (err) {
      console.error('Exception during payment confirmation:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
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
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // We'll load the Stripe instance once the component mounts
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(() => {
    try {
      // Get the key from a meta tag in the HTML
      const stripeKey = document.querySelector('meta[name="stripe-public-key"]')?.getAttribute('content');
      console.log('Stripe key found:', stripeKey ? 'Yes' : 'No');
      
      if (!stripeKey) {
        setLoadError('Stripe public key not found');
        return null;
      }
      
      // For development environments, force test mode and allow HTTP
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.protocol === 'http:';
      
      console.log('Development mode:', isDevelopment ? 'Yes' : 'No');
      
      return loadStripe(stripeKey, {
        stripeAccount: undefined,
        apiVersion: undefined,
        locale: undefined,
        betas: isDevelopment ? ['stripe_js_enforce_https_false_beta_1'] : undefined
      });
    } catch (err) {
      console.error('Error loading Stripe:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load Stripe');
      return null;
    }
  });

  // Log component state for debugging
  useEffect(() => {
    console.log('StripeCheckout state:', { 
      clientSecret: clientSecret ? 'Present' : 'Missing', 
      stripePromise: stripePromise ? 'Present' : 'Missing',
      isLoading,
      loadError
    });
  }, [clientSecret, stripePromise, isLoading, loadError]);

  if (loadError) {
    return (
      <Card className="p-6">
        <div className="text-red-500 p-4 text-center">
          <p>Error loading payment form: {loadError}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (isLoading || !clientSecret || !stripePromise) {
    return (
      <Card className="p-6">
        <div className="flex flex-col justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-gray-500">
            {!clientSecret ? 'Preparing payment...' : 'Loading payment form...'}
          </p>
        </div>
      </Card>
    );
  }

  try {
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
  } catch (err) {
    console.error('Error rendering Stripe Elements:', err);
    return (
      <Card className="p-6">
        <div className="text-red-500 p-4 text-center">
          <p>Error displaying payment form. Please try again.</p>
          <p className="text-xs mt-2">{err instanceof Error ? err.message : 'Unknown error'}</p>
        </div>
      </Card>
    );
  }
};
