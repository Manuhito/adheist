import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shadcn/components/ui/card";
import { Button } from "../../shadcn/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../shadcn/components/ui/table";
import { Skeleton } from "../../shadcn/components/ui/skeleton";
import { Badge } from "../../shadcn/components/ui/badge";
import { CalendarIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";

/**
 * Component for displaying and downloading Stripe invoices
 */
export function InvoiceSection() {
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
      setError('No se pudieron cargar las facturas. Por favor, inténtalo de nuevo más tarde.');
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
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Format currency amount
  const formatAmount = (amount, currency) => {
    if (!amount) return 'N/A';
    
    // Convert from cents to dollars/euros
    const value = amount / 100;
    
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(value);
  };

  // Get status badge color based on invoice status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Pagada</Badge>;
      case 'open':
        return <Badge className="bg-yellow-500">Pendiente</Badge>;
      case 'void':
        return <Badge className="bg-gray-500">Anulada</Badge>;
      case 'draft':
        return <Badge className="bg-blue-500">Borrador</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle className="text-2xl">Historial de Facturas</CardTitle>
        <CardDescription>
          Descarga tus facturas de Stripe para tus registros financieros
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
              Reintentar
            </Button>
          </div>
        ) : invoices.length === 0 ? (
          // No invoices message
          <div className="text-center py-6 text-gray-500">
            <p>No tienes facturas disponibles.</p>
          </div>
        ) : (
          // Invoice table
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                      Descargar
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
          Actualizar
        </Button>
      </CardFooter>
    </Card>
  );
}
