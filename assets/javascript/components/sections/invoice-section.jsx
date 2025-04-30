import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shadcn/components/ui/card";
import { Button } from "../../shadcn/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../shadcn/components/ui/table";
import { Skeleton } from "../../shadcn/components/ui/skeleton";
import { Badge } from "../../shadcn/components/ui/badge";
import { CalendarIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";
import { useTranslation } from "../../lib/useTranslation";

/**
 * Component for displaying and downloading Stripe invoices
 */
export function InvoiceSection() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch invoices from the backend
  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/ads/api/invoices/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching invoices: ${response.status}`);
      }
      
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(t('invoice.unable_to_load', 'Unable to load invoices. Please try again later.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch invoices on component mount
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Format date to a more readable format
  const formatDate = (timestamp) => {
    if (!timestamp) return t('invoice.not_available', 'N/A');
    const date = new Date(timestamp * 1000);
    // Use the user's locale from the browser
    return new Intl.DateTimeFormat(navigator.language || 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Format currency amount
  const formatAmount = (amount, currency) => {
    if (!amount) return t('invoice.not_available', 'N/A');
    
    // Convert from cents to dollars/euros
    const value = amount / 100;
    
    // Use the user's locale from the browser
    return new Intl.NumberFormat(navigator.language || 'en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(value);
  };

  // Get status badge color based on invoice status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">{t('invoice.status_paid', 'Paid')}</Badge>;
      case 'open':
        return <Badge className="bg-yellow-500">{t('invoice.status_pending', 'Pending')}</Badge>;
      case 'void':
        return <Badge className="bg-gray-500">{t('invoice.status_void', 'Void')}</Badge>;
      case 'draft':
        return <Badge className="bg-blue-500">{t('invoice.status_draft', 'Draft')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle className="text-2xl">{t('invoice.history_title', 'Invoice History')}</CardTitle>
        <CardDescription>
          {t('invoice.history_description', 'Download your Stripe invoices for your financial records')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          // Loading skeleton
          <>
            <div className="flex items-center space-x-4 mb-4">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-8 w-[100px]" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </>
        ) : error ? (
          // Error message
          <div className="text-center py-6 text-red-500">
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={fetchInvoices}
            >
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              {t('invoice.retry', 'Retry')}
            </Button>
          </div>
        ) : invoices.length === 0 ? (
          // No invoices message
          <div className="text-center py-6 text-gray-500">
            <p>{t('invoice.no_invoices', 'No invoices available.')}</p>
          </div>
        ) : (
          // Invoice table
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoice.column_number', 'Number')}</TableHead>
                <TableHead>{t('invoice.column_date', 'Date')}</TableHead>
                <TableHead>{t('invoice.column_total', 'Total')}</TableHead>
                <TableHead>{t('invoice.column_status', 'Status')}</TableHead>
                <TableHead className="text-right">{t('invoice.column_actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.number || invoice.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                      {formatDate(invoice.created)}
                    </div>
                  </TableCell>
                  <TableCell>{formatAmount(invoice.total, invoice.currency)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invoice.invoice_pdf, '_blank')}
                      disabled={!invoice.invoice_pdf}
                    >
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      {t('invoice.download', 'Download')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={fetchInvoices}
          disabled={isLoading}
        >
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          {t('invoice.refresh', 'Refresh')}
        </Button>
      </CardFooter>
    </Card>
  );
}
