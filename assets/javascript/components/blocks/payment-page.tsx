import * as React from "react";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "../../lib/useTranslation";
import { PaymentForm } from "@/shadcn/components/ui/payment-form";
import { Button } from "@/shadcn/components/ui/button";

interface PaymentData {
  clientSecret: string;
  publishableKey: string;
  amount: number;
  currency: string;
}

export function PaymentPage() {
  const { t } = useTranslation();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      // Get payment data from sessionStorage
      const paymentDataString = sessionStorage.getItem('stripePaymentData');
      console.log('Payment data from sessionStorage:', paymentDataString);
      
      if (!paymentDataString) {
        setError(t('payment.no_data', 'No payment data found. Redirecting to billing page...'));
        setTimeout(() => {
          window.location.href = '/ads/billing/';
        }, 3000);
        return;
      }
      
      const data = JSON.parse(paymentDataString);
      console.log('Parsed payment data:', data);
      
      if (!data.clientSecret || !data.publishableKey) {
        setError(t('payment.invalid_data', 'Invalid payment data. Missing required fields.'));
        return;
      }
      
      setPaymentData(data);
    } catch (err) {
      console.error("Error loading payment data:", err);
      setError(t('payment.failed_load', 'Failed to load payment data. Please try again.'));
    }
  }, []);
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">{t('payment.error_label', 'Error:')} </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }
  
  if (!paymentData) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const handleGoBack = () => {
    window.location.href = '/ads/billing/';
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center text-muted-foreground hover:text-foreground"
          onClick={handleGoBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('payment.back_to_plans', 'Back to plans')}
        </Button>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">{t('payment.complete_your_payment', 'Complete Your Payment')}</h1>
      
      <PaymentForm
        clientSecret={paymentData.clientSecret}
        publishableKey={paymentData.publishableKey}
        amount={paymentData.amount}
        currency={paymentData.currency}
        returnUrl={window.location.origin + '/ads/payment-success/'}
      />
    </div>
  );
}
