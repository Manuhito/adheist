import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslation } from "../../lib/useTranslation";
import { UpdatePaymentMethodForm } from "@/shadcn/components/ui/update-payment-method-form";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function UpdatePaymentMethodPage() {
  const { t } = useTranslation();
  const [setupData, setSetupData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Function to create a SetupIntent
  const createSetupIntent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
      
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }
      
      // Create a SetupIntent
      const response = await fetch('/subscriptions/api/create-setup-intent/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create SetupIntent');
      }
      
      const data = await response.json();
      setSetupData(data);
    } catch (err) {
      console.error('Error creating SetupIntent:', err);
      setError(err.message || t('payment.failed_setup', 'Failed to set up payment method update. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Create SetupIntent on component mount
  useEffect(() => {
    createSetupIntent();
  }, []);

  // Handle successful update
  const handleSuccess = () => {
    setSuccess(true);
    // Redirect back to billing page after a short delay
    setTimeout(() => {
      window.location.href = '/ads/billing/';
    }, 3000);
  };

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('payment.error_title', 'Error')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (success) {
    return (
      <Alert className="max-w-md mx-auto mt-8 bg-green-50 border-green-200 text-green-800">
        <AlertTitle>{t('payment.success_title', 'Success')}</AlertTitle>
        <AlertDescription>
          {t('payment.payment_method_updated', 'Your payment method has been updated successfully. Redirecting to billing page...')}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !setupData) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{t('payment.loading', 'Loading...')}</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('payment.update_payment_method', 'Update Payment Method')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('payment.update_payment_method_description', 'Add a new payment method or update your existing one. This will be used for all future payments.')}
      </p>

      <UpdatePaymentMethodForm
        clientSecret={setupData.clientSecret}
        publishableKey={setupData.publishableKey}
        customerId={setupData.customerId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
