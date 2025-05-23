import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCardIcon } from "lucide-react";
import { useTranslation } from '../../lib/useTranslation';

/**
 * Componente que muestra la información del método de pago predeterminado
 * y proporciona un botón para cambiarlo a través del portal de Stripe
 */
export function PaymentMethodSection({ paymentMethodData }) {
  const { t } = useTranslation();
  
  const { has_payment_method, payment_method, portal_url } = paymentMethodData;
  
  // Formatear la información de la tarjeta si existe
  const formatCardInfo = () => {
    if (!has_payment_method || !payment_method) {
      return t('billing.no_payment_method', 'No payment method');
    }
    
    const { card } = payment_method;
    const { brand, last4, exp_month, exp_year } = card;
    
    // Capitalizar la primera letra de la marca
    const formattedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
    
    // Formatear el mes con dos dígitos
    const formattedMonth = exp_month < 10 ? `0${exp_month}` : exp_month;
    
    return `${formattedBrand} •••• ${last4} (${formattedMonth}/${exp_year})`;
  };
  
  // Manejar el clic en el botón para cambiar el método de pago
  const handleManagePaymentMethod = () => {
    // Redirigir a la página de actualización de método de pago
    window.location.href = '/subscriptions/update-payment-method/';
  };
  
  return (
    <Card className="mt-8">
      {/* En pantallas pequeñas (móvil), mantener el diseño vertical */}
      <div className="md:hidden">
        <CardHeader>
          <CardTitle>{t('billing.payment_method', 'Default Payment Method')}</CardTitle>
          <CardDescription>
            {t('billing.payment_method_description', 'Manage your default payment method for subscriptions')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium">
              {formatCardInfo()}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleManagePaymentMethod} 
            variant="outline"
          >
            {has_payment_method 
              ? t('billing.manage_payment_method', 'Manage Payment Method')
              : t('billing.add_payment_method', 'Add Payment Method')}
          </Button>
        </CardFooter>
      </div>
      
      {/* En pantallas medianas y grandes, mostrar horizontalmente */}
      <div className="hidden md:block">
        <div className="flex flex-row items-center">
          <div className="flex-1 p-6">
            <CardTitle>{t('billing.payment_method', 'Default Payment Method')}</CardTitle>
            <CardDescription className="mt-1.5">
              {t('billing.payment_method_description', 'Manage your default payment method for subscriptions')}
            </CardDescription>
          </div>
          
          <div className="flex-1 p-6 flex items-center justify-between">
            <div className="flex items-center text-muted-foreground">
              <CreditCardIcon className="mr-2 h-4 w-4 text-gray-400" />
              {formatCardInfo()}
            </div>
            
            <Button 
              onClick={handleManagePaymentMethod} 
              variant="outline"
              className="ml-4"
            >
              {has_payment_method 
                ? t('billing.manage_payment_method', 'Manage Payment Method')
                : t('billing.add_payment_method', 'Add Payment Method')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
