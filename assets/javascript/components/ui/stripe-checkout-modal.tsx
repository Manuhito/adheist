import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { StripeCheckout } from './stripe-elements';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

type StripeCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  priceId: string;
  planName: string;
  frequency: string;
};

// Development mode component - completely bypasses Stripe Elements
const DevModeCheckout = ({ priceId, planName }: { priceId: string; planName: string }) => {
  return (
    <div className="p-6 border rounded-md bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Development Mode</h3>
      <p className="mb-4">Stripe requires HTTPS for security. This is a development fallback.</p>
      
      <form 
        action="/billing/success/" 
        method="GET"
        className="mt-6"
      >
        <input type="hidden" name="dev_mode" value="true" />
        <input type="hidden" name="price_id" value={priceId} />
        <Button type="submit" className="w-full">
          Subscribe to {planName}
        </Button>
      </form>
    </div>
  );
};

// Production mode component - uses real Stripe Elements
const ProdModeCheckout = ({ 
  clientSecret, 
  priceId, 
  planName,
  isLoading,
  error,
  onRetry
}: { 
  clientSecret: string | null; 
  priceId: string; 
  planName: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) => {
  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="ml-2"
          >
            Retry
          </Button>
        </div>
      )}
      
      <StripeCheckout
        clientSecret={clientSecret}
        returnUrl={`${window.location.origin}/billing/success/`}
        priceId={priceId}
        buttonText={`Subscribe to ${planName}`}
        isLoading={isLoading}
      />
    </>
  );
};

export const StripeCheckoutModal = ({
  isOpen,
  onClose,
  priceId,
  planName,
  frequency,
}: StripeCheckoutModalProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if we're in development mode with HTTP protocol
  const isDevelopmentMode = window.location.protocol === 'http:';
  
  // Only create payment intent in production mode
  useEffect(() => {
    if (isOpen && !isDevelopmentMode && !clientSecret) {
      createPaymentIntent();
    }
  }, [isOpen, priceId, clientSecret, isDevelopmentMode]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const csrfToken = getCsrfToken();
      
      const response = await fetch('/subscriptions/api/create-payment-intent/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          priceId,
          frequency,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create payment intent: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.clientSecret) {
        throw new Error('No client secret returned from server');
      }
      
      setClientSecret(data.clientSecret);
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get CSRF token from cookie
  const getCsrfToken = (): string => {
    const name = 'csrftoken';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || '';
    }
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subscribe to {planName} ({frequency})</DialogTitle>
        </DialogHeader>
        
        {isDevelopmentMode ? (
          <DevModeCheckout priceId={priceId} planName={planName} />
        ) : (
          <ProdModeCheckout 
            clientSecret={clientSecret}
            priceId={priceId}
            planName={planName}
            isLoading={isLoading}
            error={error}
            onRetry={createPaymentIntent}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
