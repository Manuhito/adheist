import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/shadcn/components/ui/separator';
import { useTranslation } from '../lib/useTranslation';
import NumberFlow from "@number-flow/react";
import { useToast } from "@/hooks/use-toast";

/**
 * Componente para la página de confirmación de compra de paquete de créditos
 * Muestra información del paquete seleccionado y permite confirmar la compra
 */
export function CreditPackageConfirmation({ packageData, onConfirm, onCancel }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Si no hay datos del paquete, volver a la página de facturación
    if (!packageData) {
        if (onCancel) onCancel();
        return null;
    }

    // Obtener el ID de precio del paquete
    const priceId = packageData.priceId;

    // Función para manejar la confirmación de compra
    const handleConfirm = async () => {
        if (!priceId) {
            toast({
                title: t('billing.error', 'Error'),
                description: t('billing.no_price_id', 'No price ID available for the selected package.'),
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        try {
            // Crear un FormData para enviar la solicitud
            const formData = new FormData();
            formData.append('priceId', priceId);

            // Obtener el token CSRF de la cookie
            const csrfToken = getCookie('csrftoken');
            
            // Enviar la solicitud al endpoint de API
            const response = await fetch('/subscriptions/api/purchase-credit-package/', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                headers: {
                    'X-CSRFToken': csrfToken,
                }
            });

            // Verificar si la respuesta es JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // Mostrar mensaje de éxito
                    toast({
                        title: t('billing.success', 'Success'),
                        description: data.message,
                    });

                    // Llamar a onConfirm para cualquier lógica adicional
                    if (onConfirm) onConfirm(priceId);

                    // Redirigir a la página de detalles de facturación después de un breve retraso
                    setTimeout(() => {
                        window.location.href = data.redirect_url;
                    }, 1500);
                } else {
                    // Mostrar mensaje de error
                    toast({
                        title: t('billing.error', 'Error'),
                        description: data.error || t('billing.purchase_failed', 'Failed to purchase credit package.'),
                        variant: 'destructive',
                    });
                    setIsLoading(false);
                }
            } else {
                // Si la respuesta no es JSON, mostrar un error genérico
                toast({
                    title: t('billing.error', 'Error'),
                    description: t('billing.unexpected_response', 'Received an unexpected response from the server.'),
                    variant: 'destructive',
                });
                setIsLoading(false);
            }
        } catch (error) {
            // Manejar errores de red u otros errores
            toast({
                title: t('billing.error', 'Error'),
                description: t('billing.network_error', 'A network error occurred. Please try again.'),
                variant: 'destructive',
            });
            setIsLoading(false);
        }
    };

    // Función para obtener una cookie por nombre
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <Button
                variant="ghost"
                className="mb-6"
                onClick={onCancel}
                disabled={isLoading}
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('billing.back_to_billing', 'Back to Billing')}
            </Button>

            <h1 className="text-2xl font-bold mb-6">
                {t('billing.confirm_credit_purchase', 'Confirm Credit Package Purchase')}
            </h1>

            <div className="mb-8">
                <Card className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <Badge className="mb-2" variant="outline">
                                {t('billing.credit_package', 'Credit Package')}
                            </Badge>
                            <h2 className="text-2xl font-semibold">{packageData.name}</h2>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-end gap-1">
                            <NumberFlow
                                format={{
                                    style: "currency",
                                    currency: "USD",
                                    trailingZeroDisplay: "stripIfInteger",
                                }}
                                value={packageData.price}
                                className="text-3xl font-bold"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('billing.one_time_purchase', 'One-time purchase')}
                        </p>
                    </div>

                    <Separator className="my-4" />

                    <h3 className="font-medium mb-2">{t('billing.package_includes', 'Package Includes')}</h3>
                    <ul className="space-y-2">
                        {packageData.features.map((feature, index) => (
                            <li key={index} className="text-sm flex items-start">
                                <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <div className="mt-8 p-6 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">{t('billing.payment_information', 'Payment Information')}</h3>
                <p className="text-sm mb-4">
                    {t('billing.default_payment_method', 'Your default payment method will be charged immediately for this purchase.')}
                </p>
                <p className="text-sm mb-4">
                    {t('billing.credits_available', 'Credits will be available in your account immediately after purchase.')}
                </p>
                <p className="text-sm text-muted-foreground">
                    {t('billing.change_payment_method', 'To change your payment method, please go back to the billing page.')}
                </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    {t('billing.cancel', 'Cancel')}
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('billing.processing', 'Processing...')}
                        </>
                    ) : (
                        t('billing.confirm_purchase', 'Confirm Purchase')
                    )}
                </Button>
            </div>
        </div>
    );
}
