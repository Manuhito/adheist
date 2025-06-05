import React, { useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/shadcn/components/ui/separator';
import { useTranslation } from '../lib/useTranslation';
import NumberFlow from "@number-flow/react";
import { useToast } from "@/hooks/use-toast"

/**
 * Componente para la página de confirmación de actualización de suscripción
 * Muestra información del plan actual y el nuevo plan seleccionado
 */
export function SubscriptionUpdateConfirmation({ currentPlan, newPlan, frequency, onConfirm, onCancel }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Si no hay plan actual o nuevo plan, volver a la página de facturación
    if (!currentPlan || !newPlan) {
        // En lugar de usar navigate, simplemente llamamos a onCancel
        if (onCancel) onCancel();
        return null;
    }

    // Determinar si es un upgrade o downgrade
    const currentPrice = typeof currentPlan.price[frequency] === 'number' ? currentPlan.price[frequency] : 0;
    const newPrice = typeof newPlan.price[frequency] === 'number' ? newPlan.price[frequency] : 0;
    const isUpgrade = newPrice > currentPrice;

    // Obtener el ID de precio correcto según la frecuencia
    const newPriceId = frequency === 'monthly' ? newPlan.price?.monthlyPriceId : newPlan.price?.yearlyPriceId;

    // Formatear el nombre de la frecuencia para mostrar
    const frequencyName = frequency === 'monthly' ? t('pricing.monthly', 'Monthly') : t('pricing.yearly', 'Yearly');

    // Función para manejar la confirmación de actualización
    const handleConfirm = async () => {
        if (!newPriceId) {
            toast({
                title: t('billing.error', 'Error'),
                description: t('billing.no_price_id', 'No price ID available for the selected plan.'),
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        try {
            // Crear un FormData para enviar la solicitud
            const formData = new FormData();
            formData.append('priceId', newPriceId);

            // Obtener el token CSRF de la cookie
            const csrfToken = getCookie('csrftoken');
            
            // Enviar la solicitud al endpoint de API
            const response = await fetch('/subscriptions/api/update-subscription/', {
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
                    if (onConfirm) onConfirm(newPriceId);

                    // Redirigir a la página de detalles de suscripción después de un breve retraso
                    setTimeout(() => {
                        window.location.href = data.redirect_url;
                    }, 1500);
                } else {
                    // Mostrar mensaje de error
                    toast({
                        title: t('billing.error', 'Error'),
                        description: data.error || t('billing.update_failed', 'Failed to update subscription.'),
                        variant: 'destructive',
                    });
                }
            } else {
                // Si la respuesta no es JSON, probablemente es un error HTML
                const text = await response.text();
                console.error('Non-JSON response:', text);
                
                toast({
                    title: t('billing.error', 'Error'),
                    description: t('billing.server_error', 'Server returned an unexpected response. Please try again later.'),
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error updating subscription:', error);
            toast({
                title: t('billing.error', 'Error'),
                description: t('billing.unexpected_error', 'An unexpected error occurred. Please try again.'),
                variant: 'destructive',
            });
        } finally {
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
        <div className="container max-w-4xl py-10">
            <Button
                variant="ghost"
                className="mb-6"
                onClick={onCancel}
                disabled={isLoading}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('billing.back_to_plans', 'Back to plans')}
            </Button>

            <h1 className="text-3xl font-bold mb-2">
                {t('billing.confirm_subscription_update', 'Confirm Subscription Update')}
            </h1>

            <p className="text-muted-foreground mb-8">
                {t('billing.subscription_update_description', 'You are about to change your subscription plan. This will start a new billing period immediately, and any remaining credits from your current plan will be transferred to your new subscription.')}
            </p>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Plan actual */}
                <Card className="p-6 border-2">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <Badge variant="outline" className="mb-2">
                                {t('billing.current_plan', 'Current Plan')}
                            </Badge>
                            <h2 className="text-2xl font-semibold">{currentPlan.name}</h2>
                        </div>
                        <CheckCircle className="h-6 w-6 text-primary" />
                    </div>

                    <div className="mb-6">
                        {typeof currentPlan.price[frequency] === 'number' ? (
                            <div className="flex items-end gap-1">
                                <NumberFlow
                                    format={{
                                        style: "currency",
                                        currency: "USD",
                                        trailingZeroDisplay: "stripIfInteger",
                                    }}
                                    value={currentPlan.price[frequency]}
                                    className="text-3xl font-bold"
                                />
                                <span className="text-sm text-muted-foreground mb-1">
                                    /{frequency === 'monthly' ? t('billing.month', 'mo') : t('billing.year', 'yr')}
                                </span>
                            </div>
                        ) : (
                            <p className="text-3xl font-bold">{currentPlan.price[frequency]}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{frequencyName}</p>
                    </div>

                    <Separator className="my-4" />

                    <h3 className="font-medium mb-2">{t('billing.features', 'Features')}</h3>
                    <ul className="space-y-2">
                        {currentPlan.features.map((feature, index) => (
                            <li key={index} className="text-sm flex items-start">
                                <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* Nuevo plan */}
                <Card className="p-6 border-2 border-primary">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <Badge variant="default" className="mb-2">
                                {t('billing.new_plan', 'New Plan')}
                            </Badge>
                            <h2 className="text-2xl font-semibold">{newPlan.name}</h2>
                        </div>
                        {isUpgrade ? (
                            <ArrowUp className="h-6 w-6 text-emerald-500" />
                        ) : (
                            <ArrowDown className="h-6 w-6 text-amber-500" />
                        )}
                    </div>

                    <div className="mb-6">
                        {typeof newPlan.price[frequency] === 'number' ? (
                            <div className="flex items-end gap-1">
                                <NumberFlow
                                    format={{
                                        style: "currency",
                                        currency: "USD",
                                        trailingZeroDisplay: "stripIfInteger",
                                    }}
                                    value={newPlan.price[frequency]}
                                    className="text-3xl font-bold"
                                />
                                <span className="text-sm text-muted-foreground mb-1">
                                    /{frequency === 'monthly' ? t('billing.month', 'mo') : t('billing.year', 'yr')}
                                </span>
                            </div>
                        ) : (
                            <p className="text-3xl font-bold">{newPlan.price[frequency]}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{frequencyName}</p>
                    </div>

                    <Separator className="my-4" />

                    <h3 className="font-medium mb-2">{t('billing.features', 'Features')}</h3>
                    <ul className="space-y-2">
                        {newPlan.features.map((feature, index) => (
                            <li key={index} className="text-sm flex items-start">
                                <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <div className="mt-8 p-6 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">{t('billing.plan_change', 'Plan Change Information')}</h3>
                <p className="text-sm mb-4">
                    {t('billing.new_billing_period', 'Your subscription will be updated immediately and a new billing period will begin today.')}
                </p>
                <p className="text-sm mb-4">
                    {t('billing.credit_transfer', 'Any remaining credits from your current plan will be transferred to your new subscription.')}
                </p>
                <p className="text-sm text-muted-foreground">
                    {t('billing.immediate_change', 'This change will take effect immediately upon confirmation.')}
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
                        isUpgrade
                            ? t('billing.confirm_upgrade', 'Confirm Upgrade')
                            : t('billing.confirm_downgrade', 'Confirm Downgrade')
                    )}
                </Button>
            </div>
        </div>
    );
}
