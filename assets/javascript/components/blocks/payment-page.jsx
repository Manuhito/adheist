import * as React from "react";
import { useState, useEffect } from "react";
import { PaymentForm } from "@/shadcn/components/ui/payment-form";

export function PaymentPage() {
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    try {
      // Get payment data from sessionStorage
      const paymentDataString = sessionStorage.getItem('stripePaymentData');
      console.log('Payment data from sessionStorage:', paymentDataString);
      
      if (!paymentDataString) {
        setError("No payment data found. Redirecting to billing page...");
        setTimeout(() => {
          window.location.href = '/ads/billing/';
        }, 3000);
        return;
      }
      
      const data = JSON.parse(paymentDataString);
      console.log('Parsed payment data:', data);
      
      if (!data.clientSecret || !data.publishableKey) {
        setError("Invalid payment data. Missing required fields.");
        return;
      }
      
      setPaymentData(data);
    } catch (err) {
      console.error("Error loading payment data:", err);
      setError("Failed to load payment data. Please try again.");
    }
  }, []);
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
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
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Complete Your Payment</h1>
      
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
