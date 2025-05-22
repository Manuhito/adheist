import React, { useState } from 'react';
import { PricingSection } from '../components/blocks/pricing-section';
import { InvoiceSection } from '../components/sections/invoice-section';
import { useTranslation } from '../lib/useTranslation';
import { SubscriptionUpdateConfirmation } from './subscription-update-confirmation';

/**
 * Componente principal que contiene toda la página de facturación
 */
export function BillingPage({ pricingData, onSubscribe }) {
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
    onSubscribe && onSubscribe(priceId);
    setShowConfirmation(false);
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
      label: t(`pricing.${freq}`, freq.charAt(0).toUpperCase() + freq.slice(1))
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
        t={t}
      />

      {/* Solo mostrar la sección de facturas si el usuario tiene una suscripción activa */}
      {hasActiveSubscription && <InvoiceSection />}
    </div>
  );
}
