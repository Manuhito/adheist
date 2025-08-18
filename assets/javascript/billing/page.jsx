import React, { useState } from 'react';
import { PricingSection } from '../components/blocks/pricing-section';
import { InvoiceSection } from '../components/sections/invoice-section';
import { PaymentMethodSection } from '../components/sections/payment-method-section';
import ProgressBarUsage from '../components/ui/progress-bar-usage';
import { ExtraCreditCard } from '../components/ui/extra-credit-card';
import { SubscriptionCancelSection } from '../components/sections/subscription-cancel-section';
import { useTranslation } from '../lib/useTranslation';
import { SubscriptionUpdateConfirmation } from './subscription-update-confirmation';
import { CreditPackageConfirmation } from './credit-package-confirmation';

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

  // Estado para manejar la página de confirmación de suscripción
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedFrequency, setSelectedFrequency] = useState('monthly');
  
  // Estado para manejar la página de confirmación de paquete de créditos
  const [showCreditPackageConfirmation, setShowCreditPackageConfirmation] = useState(false);
  const [selectedCreditPackage, setSelectedCreditPackage] = useState(null);

  // Verificar si el usuario tiene una suscripción activa
  const hasActiveSubscription = pricingData.tiers.some(tier => tier.is_current_plan);
  console.log(t('billing.has_active_subscription', "Has active subscription:"), hasActiveSubscription);

  // Obtener el plan actual si existe
  const currentPlan = pricingData.tiers.find(tier => tier.is_current_plan);
  console.log('Current Plan:', currentPlan);
  if (currentPlan) {
    console.log('Current Period End:', currentPlan.current_period_end);
  }

  // Función para manejar la selección de un nuevo plan o paquete
  const handlePlanSelect = (priceId, frequency, tier) => {
    // Si es un paquete de uso (frequency === 'usage')
    if (frequency === 'usage') {
      // Si el usuario tiene un método de pago configurado, mostrar la página de confirmación
      if (paymentMethodData.has_payment_method) {
        setSelectedCreditPackage({
          ...tier,
          priceId: priceId
        });
        setShowCreditPackageConfirmation(true);
      } else {
        // Si no tiene método de pago, proceder con el flujo normal
        onSubscribe && onSubscribe(priceId);
      }
    } else if (hasActiveSubscription) {
      // Si ya tiene una suscripción y está seleccionando un plan (no un paquete de uso),
      // mostrar la página de confirmación de actualización
      setSelectedPlan(tier);
      setSelectedFrequency(frequency);
      setShowConfirmation(true);
    } else {
      // Si no tiene suscripción, proceder con la suscripción normal sin confirmación
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
  
  // Función para manejar la confirmación de compra de paquete de créditos
  const handleCreditPackageConfirm = (priceId) => {
    // La compra ya se realizó mediante la solicitud a /subscriptions/api/purchase-credit-package/
    // Solo cerrar el diálogo de confirmación
    setShowCreditPackageConfirmation(false);
    // La redirección ya está manejada en credit-package-confirmation.jsx
  };
  
  // Función para cancelar la compra de paquete de créditos
  const handleCreditPackageCancel = () => {
    setShowCreditPackageConfirmation(false);
    setSelectedCreditPackage(null);
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

  // Si estamos mostrando la página de confirmación de actualización de suscripción
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
  
  // Si estamos mostrando la página de confirmación de compra de paquete de créditos
  if (showCreditPackageConfirmation && selectedCreditPackage) {
    return (
      <CreditPackageConfirmation
        packageData={selectedCreditPackage}
        onConfirm={handleCreditPackageConfirm}
        onCancel={handleCreditPackageCancel}
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

      {/* Sección de créditos - visible para usuarios con suscripción activa o free tier */}
      {(hasActiveSubscription || window.__USAGE_DATA__?.max_general_credits > 0) && (
        <div className="mt-8 mb-4">
          <h3 className="text-lg font-medium mb-3">{t('billing.plan_usage', 'Plan Usage')}</h3>
          <div className="flex flex-col gap-4">
            <ProgressBarUsage
              label={t('billing.ads_generation', 'Ads Generation')}
              credits={window.__USAGE_DATA__?.general_credits || 0}
              maxCredits={window.__USAGE_DATA__?.max_general_credits || 1}
            />
            <ProgressBarUsage
              label={t('billing.revisions', 'Revisions')}
              credits={window.__USAGE_DATA__?.version_credits || 0}
              maxCredits={window.__USAGE_DATA__?.max_version_credits || 1}
            />
          </div>
        </div>
      )}

      {/* Sección de créditos adicionales - solo visible si hay créditos extra */}
      {(window.__USAGE_DATA__?.extra_general_credits > 0 || window.__USAGE_DATA__?.extra_version_credits > 0) && (
        <div className="mt-8 mb-4">
          <h3 className="text-lg font-medium mb-3">{t('billing.packages_and_additional_usage', 'Packages and Additional usage')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {window.__USAGE_DATA__?.extra_general_credits > 0 && (
              <ExtraCreditCard
                label={t('billing.ads_generation', 'Ads Generation')}
                credits={window.__USAGE_DATA__?.extra_general_credits || 0}
              />
            )}
            {window.__USAGE_DATA__?.extra_version_credits > 0 && (
              <ExtraCreditCard
                label={t('billing.revisions', 'Revisions')}
                credits={window.__USAGE_DATA__?.extra_version_credits || 0}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Sección de método de pago - visible si el usuario tiene un método de pago configurado */}
      {paymentMethodData.has_payment_method && (
        <PaymentMethodSection paymentMethodData={paymentMethodData} />
      )}
      
      {/* Sección de facturas - siempre visible */}
      <InvoiceSection />
      
      {/* Sección de cancelación de suscripción - solo visible si hay suscripción activa */}
      {hasActiveSubscription && currentPlan && (
        <SubscriptionCancelSection 
          currentPeriodEnd={currentPlan.current_period_end}
          cancelAtPeriodEnd={currentPlan.cancel_at_period_end}
        />
      )}
    </div>
  );
}
