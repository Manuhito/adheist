import React from 'react';
import { PricingSection } from '../components/blocks/pricing-section';
import { useTranslation } from '../lib/useTranslation';

// Manejador para redireccionar a la página de billing
function handleSubscribe(priceId) {
  // Redireccionar a la página de billing
  window.location.href = '/ads/billing/';
}

// Función para crear datos de precios con traducciones
function createDefaultPricingData(t) {
  return {
    title: t('pricing.title', "Pricing Plans"),
    subtitle: t('pricing.subtitle', "Choose the perfect plan for your needs"),
    frequencies: ["monthly", "yearly"],
    tiers: [
      {
        name: t('pricing.free', "Free"),
        description: t('pricing.free_description', "Basic features for individuals"),
        price: {
          monthly: 0,
          yearly: 0
        },
        features: [
          t('pricing.feature_free_1', "3 ad requests per month"),
          t('pricing.feature_free_2', "Basic templates"),
          t('pricing.feature_free_3', "Standard support")
        ],
        cta: t('pricing.get_started', "Get Started"),
        highlighted: false,
        popular: false
      },
      {
        name: t('pricing.pro', "Pro"),
        description: t('pricing.pro_description', "Advanced features for professionals"),
        price: {
          monthly: 29,
          yearly: 24
        },
        features: [
          t('pricing.feature_pro_1', "20 ad requests per month"),
          t('pricing.feature_pro_2', "Premium templates"),
          t('pricing.feature_pro_3', "Priority support"),
          t('pricing.feature_pro_4', "Custom branding")
        ],
        cta: t('pricing.upgrade_to_pro', "Upgrade to Pro"),
        highlighted: true,
        popular: true
      },
      {
        name: t('pricing.team', "Team"),
        description: t('pricing.team_description', "For teams and businesses"),
        price: {
          monthly: 49,
          yearly: 39
        },
        features: [
          t('pricing.feature_team_1', "50 ad requests per month"),
          t('pricing.feature_team_2', "All premium templates"),
          t('pricing.feature_team_3', "24/7 support"),
          t('pricing.feature_team_4', "Custom branding"),
          t('pricing.feature_team_5', "Team collaboration")
        ],
        cta: t('pricing.upgrade_to_team', "Upgrade to Team"),
        highlighted: false,
        popular: false
      },
      {
        name: t('pricing.enterprise', "Enterprise"),
        description: t('pricing.enterprise_description', "For large organizations"),
        price: {
          monthly: t('pricing.custom', "Custom"),
          yearly: t('pricing.custom', "Custom")
        },
        features: [
          t('pricing.feature_enterprise_1', "Unlimited ad requests"),
          t('pricing.feature_enterprise_2', "Custom templates"),
          t('pricing.feature_enterprise_3', "Dedicated support"),
          t('pricing.feature_enterprise_4', "API access"),
          t('pricing.feature_enterprise_5', "Advanced analytics")
        ],
        cta: t('pricing.contact_sales', "Contact Sales"),
        highlighted: false,
        popular: false
      }
    ]
  };
}

export default function PricingPage() {
  const { t } = useTranslation();
  
  // Obtener datos de precios del objeto window o usar el fallback con traducciones
  const defaultData = createDefaultPricingData(t);
  const backendData = window.__PRICING_DATA__;
  
  // Si hay datos del backend, traducir sus textos
  let pricingData;
  if (backendData) {
    // Traducir los tiers del backend
    const translatedTiers = backendData.tiers.map(tier => ({
      ...tier,
      name: t(`pricing.${tier.name.toLowerCase()}`, tier.name),
      description: t(`pricing.${tier.name.toLowerCase()}_description`, tier.description),
      features: tier.features.map((feature, index) => 
        t(`pricing.feature_${tier.name.toLowerCase()}_${index + 1}`, feature)
      ),
      cta: t(`pricing.${tier.cta.toLowerCase().replace(/ /g, '_')}`, tier.cta)
    }));
    
    pricingData = {
      ...backendData,
      title: t('pricing.title', backendData.title),
      subtitle: t('pricing.subtitle', backendData.subtitle),
      tiers: translatedTiers
    };
  } else {
    pricingData = defaultData;
  }
  
  console.log("Pricing data after translation:", pricingData);

  // Traducir las frecuencias
  const translatedFrequencies = pricingData.frequencies.map(freq => {
    return {
      key: freq,
      label: t(`pricing.${freq}`, freq)
    };
  });

  return (
    <div className="container mx-auto py-8">
      <PricingSection
        title={pricingData.title}
        subtitle={pricingData.subtitle}
        tiers={pricingData.tiers}
        frequencies={translatedFrequencies}
        onSubscribe={handleSubscribe}
        t={t}
      />
    </div>
  );
}
