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

  // Create payment intent when modal opens
  useEffect(() => {
    if (isOpen && !clientSecret) {
      createPaymentIntent();
    }
  }, [isOpen, priceId, clientSecret]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('Creating payment intent with priceId:', priceId, 'frequency:', frequency);
    
    try {
      const csrfToken = getCsrfToken();
      console.log('CSRF Token:', csrfToken ? 'Found' : 'Not found');
      
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
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to create payment intent: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Payment intent created successfully');
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
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={createPaymentIntent}
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
      </DialogContent>
    </Dialog>
  );
};
