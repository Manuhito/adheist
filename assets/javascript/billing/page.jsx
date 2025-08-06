import React, { useState } from 'react';
import { PricingSection } from '../components/blocks/pricing-section';
import { InvoiceSection } from '../components/sections/invoice-section';
import { PaymentMethodSection } from '../components/sections/payment-method-section';
import ProgressBarUsage from '../components/ui/progress-bar-usage';
import { ExtraCreditCard } from '../components/ui/extra-credit-card';
import { SubscriptionCancelSection } from '../components/sections/subscription-cancel-section';
import { useTranslation } from '../lib/useTranslation';
import { SubscriptionUpdateConfirmation } from './subscription-update-confirmation';

/**
 * Componente principal que contiene toda la página de facturación
 */
export function BillingPage({ pricingData, onSubscribe }) {
  // Obtener los datos del método de pago desde la ventana global
  const paymentMethodData = window.__PAYMENT_METHOD_DATA__ || {
    has_payment_method: false,
    payment_method: null,
    portal_url: null
  };
  const { t } = useTranslation();

  // Estado para manejar la página de confirmación
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedFrequency, setSelectedFrequency] = useState('monthly');

  // Verificar si el usuario tiene una suscripción activa
  const hasActiveSubscription = pricingData.tiers.some(tier => tier.is_current_plan);
  console.log(t('billing.has_active_subscription', "Has active subscription:"), hasActiveSubscription);

  // Obtener el plan actual si existe
  const currentPlan = pricingData.tiers.find(tier => tier.is_current_plan);
  console.log('Current Plan:', currentPlan);
  if (currentPlan) {
    console.log('Current Period End:', currentPlan.current_period_end);
  }

  // Función para manejar la selección de un nuevo plan
  const handlePlanSelect = (priceId, frequency, tier) => {
    if (hasActiveSubscription) {
      // Si ya tiene una suscripción, mostrar la página de confirmación
      setSelectedPlan(tier);
      setSelectedFrequency(frequency);
      setShowConfirmation(true);
    } else {
      // Si no tiene suscripción, proceder con la suscripción normal
      onSubscribe && onSubscribe(priceId);
    }
  };

  // Función para manejar la confirmación de actualización
  const handleUpdateConfirm = (priceId) => {
    // No llamar a onSubscribe aquí - la actualización ya se realizó
    // mediante la solicitud a /subscriptions/api/update-subscription/
    
    // Solo cerrar el diálogo de confirmación
    setShowConfirmation(false);
    
    // La redirección ya está manejada en subscription-update-confirmation.jsx
  };

  // Función para cancelar la actualización
  const handleUpdateCancel = () => {
    setShowConfirmation(false);
    setSelectedPlan(null);
  };

  // Traducir los datos de precios
  const translatedPricingData = {
    ...pricingData,
    title: t('pricing.title', pricingData.title),
    subtitle: t('pricing.subtitle', pricingData.subtitle),
    // Transformar el array de frequencies en el formato esperado por PricingSection
    frequencies: Array.isArray(pricingData.frequencies) ? pricingData.frequencies.map(freq => ({
      key: freq,
      label: freq === "usage" ? t('pricing.usage_packages', "Usage Based Packages") : t(`pricing.${freq}`, freq.charAt(0).toUpperCase() + freq.slice(1))
    })) : [],
    tiers: pricingData.tiers.map(tier => ({
      ...tier,
      name: t(`pricing.${tier.name.toLowerCase()}`, tier.name),
      description: t(`pricing.${tier.name.toLowerCase()}_description`, tier.description),
      features: tier.features.map((feature, index) =>
        t(`pricing.feature_${tier.name.toLowerCase()}_${index + 1}`, feature)
      ),
      cta: t(`pricing.${tier.cta.toLowerCase().replace(/ /g, '_')}`, tier.cta),
      price: {
        ...tier.price,
        monthly: typeof tier.price.monthly === 'string' ?
          t('pricing.custom', tier.price.monthly) :
          tier.price.monthly,
        yearly: typeof tier.price.yearly === 'string' ?
          t('pricing.custom', tier.price.yearly) :
          tier.price.yearly
      }
    }))
  };

  // Si estamos mostrando la página de confirmación
  if (showConfirmation && currentPlan && selectedPlan) {
    return (
      <SubscriptionUpdateConfirmation
        currentPlan={currentPlan}
        newPlan={selectedPlan}
        frequency={selectedFrequency}
        onConfirm={handleUpdateConfirm}
        onCancel={handleUpdateCancel}
      />
    );
  }

  return (
    <div>
      <PricingSection
        title={translatedPricingData.title}
        subtitle={translatedPricingData.subtitle}
        tiers={translatedPricingData.tiers}
        frequencies={translatedPricingData.frequencies}
        onSubscribe={(priceId, frequency, tier) => handlePlanSelect(priceId, frequency, tier)}
        hasActiveSubscription={hasActiveSubscription}
        usagePackages={pricingData.usagePackages}
        t={t}
      />

      {/* Sección de créditos adicionales - siempre visible */}
      <div className="mt-8 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <ExtraCreditCard
            label={t('billing.ad_request_generations', 'Ad request generations')}
            credits={window.__USAGE_DATA__?.extra_general_credits || 0}
          />
          <ExtraCreditCard
            label={t('billing.ads_revisions', 'Ads Revisions')}
            credits={window.__USAGE_DATA__?.extra_version_credits || 0}
          />
        </div>
      </div>
      
      {/* Solo mostrar las secciones adicionales si el usuario tiene una suscripción activa */}
      {hasActiveSubscription && (
        <>
          {/* Sección de créditos */}
          <div className="flex flex-col gap-4 mb-4">
            <ProgressBarUsage
              label={t('billing.general_credits', 'General credits')}
              credits={window.__USAGE_DATA__?.general_credits || 0}
              maxCredits={window.__USAGE_DATA__?.max_general_credits || 1}
            />
            <ProgressBarUsage
              label={t('billing.version_credits', 'Version credits')}
              credits={window.__USAGE_DATA__?.version_credits || 0}
              maxCredits={window.__USAGE_DATA__?.max_version_credits || 1}
            />
          </div>
          {/* Sección de método de pago */}
          <PaymentMethodSection paymentMethodData={paymentMethodData} />
          
          {/* Sección de facturas */}
          <InvoiceSection />
          
          {/* Sección de cancelación de suscripción */}
          {currentPlan && (
            <SubscriptionCancelSection currentPeriodEnd={currentPlan.current_period_end} />
          )}
        </>
      )}
    </div>
  );
}
