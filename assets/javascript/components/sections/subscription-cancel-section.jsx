import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertCircle, CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Format date for display
 */
function formatDate(date) {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get CSRF token from cookies
 */
function getCsrfToken() {
  const name = 'csrftoken';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || '';
  }
  return '';
}

/**
 * Component for canceling a subscription
 */
export const SubscriptionCancelSection = ({ currentPeriodEnd }) => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Format the period end date if provided
  const formattedEndDate = currentPeriodEnd ? formatDate(currentPeriodEnd) : null;

  // Handle cancel button click
  const handleCancelClick = () => {
    setIsDialogOpen(true);
    setError(null);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/subscriptions/api/cancel-subscription/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ cancel_at_period_end: true }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
      
      setSuccess(data.message);
      // Close the dialog after a successful cancellation
      setIsDialogOpen(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <React.Fragment>
      <Card className="mt-8">
        <div className="p-6 flex justify-between items-center">
          <div className="flex-1">
            <CardTitle className="mb-2">{t('billing.cancel_subscription', 'Cancel Subscription')}</CardTitle>
            <CardDescription>
              {t('billing.cancel_subscription_description', 'You can cancel your subscription at any time. Your subscription will remain active until the end of the current billing period.')}
            </CardDescription>
            
            {formattedEndDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {t('billing.current_period_end', 'Current billing period ends on')} {formattedEndDate}
                </span>
              </div>
            )}
          </div>
          
          <div className="ml-6 flex-shrink-0">
            <Button 
              variant="destructive" 
              onClick={handleCancelClick}
              disabled={!!success}
            >
              {t('billing.cancel_subscription_button', 'Cancel Subscription')}
            </Button>
          </div>
        </div>
        
        {success && (
          <div className="px-6 pb-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('billing.success', 'Success')}</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </div>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('billing.confirm_cancellation', 'Confirm Cancellation')}</DialogTitle>
            <DialogDescription>
              {t('billing.confirm_cancellation_description', 'Are you sure you want to cancel your subscription? Your subscription will remain active until the end of the current billing period.')}
              {formattedEndDate && (
                <p className="mt-2 font-medium">
                  {t('billing.active_until', 'Active until')}: {formattedEndDate}
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('billing.error', 'Error')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleDialogClose}
              disabled={isLoading}
            >
              {t('billing.keep_subscription', 'Keep Subscription')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={isLoading}
            >
              {isLoading ? t('billing.canceling', 'Canceling...') : t('billing.confirm_cancel', 'Confirm Cancellation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};
