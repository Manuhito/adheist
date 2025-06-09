import React from 'react';
import { PricingSection } from '../components/blocks/pricing-section';
import { useTranslation } from '../lib/useTranslation';

// Manejador para redireccionar a la página de billing
function handleSubscribe(priceId) {
  // Redireccionar a la página de signup con parámetro para redirigir a billing después
  window.location.href = '/accounts/signup/?next=/ads/billing/';
}

// Función para crear datos de precios con traducciones
function createDefaultPricingData(t) {
  return {
    title: t('pricing.title', "Pricing Plans"),
    subtitle: t('pricing.subtitle', "Choose the perfect plan for your needs"),
    frequencies: ["monthly", "usage"],
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
        name: t('pricing.starter', "Starter"),
        description: t('pricing.starter_description', "For small businesses"),
        price: {
          monthly: 19
        },
        features: [
          t('pricing.feature_starter_1', "10 ad requests per month"),
          t('pricing.feature_starter_2', "Standard templates"),
          t('pricing.feature_starter_3', "Email support"),
          t('pricing.feature_starter_4', "Basic analytics")
        ],
        cta: t('pricing.upgrade_to_starter', "Upgrade to Starter"),
        highlighted: false,
        popular: false
      }
    ],
    usagePackages: [
      {
        name: t('pricing.package_1', "Package 1"),
        description: t('pricing.package_1_description', "Basic usage package"),
        price: 100,
        priceId: "price_package_1",
        features: [
          t('pricing.feature_package_1_1', "100 images"),
          t('pricing.feature_package_1_2', "200 revisions")
        ],
        cta: t('pricing.buy_package', "Buy Package"),
        highlighted: true,
        popular: false
      },
      {
        name: t('pricing.package_2', "Package 2"),
        description: t('pricing.package_2_description', "Advanced usage package"),
        price: 200,
        priceId: "price_package_2",
        features: [
          t('pricing.feature_package_2_1', "200 images"),
          t('pricing.feature_package_2_2', "500 revisions")
        ],
        cta: t('pricing.buy_package', "Buy Package"),
        highlighted: false,
        popular: true
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
    // Filtrar los tiers para mantener solo Free, Starter y Pro
    const filteredTiers = backendData.tiers.filter(tier => 
      ['Free', 'Starter', 'Pro'].includes(tier.name)
    );
    
    // Traducir los tiers del backend
    const translatedTiers = filteredTiers.map(tier => ({
      ...tier,
      name: t(`pricing.${tier.name.toLowerCase()}`, tier.name),
      description: t(`pricing.${tier.name.toLowerCase()}_description`, tier.description),
      features: tier.features.map((feature, index) => 
        t(`pricing.feature_${tier.name.toLowerCase()}_${index + 1}`, feature)
      ),
      cta: t(`pricing.${tier.cta.toLowerCase().replace(/ /g, '_')}`, tier.cta)
    }));
    
    // Usar los paquetes de uso de los datos predeterminados
    pricingData = {
      ...backendData,
      title: t('pricing.title', backendData.title),
      subtitle: t('pricing.subtitle', backendData.subtitle),
      // Forzar las frecuencias a ser "monthly" y "usage"
      frequencies: ["monthly", "usage"],
      tiers: translatedTiers,
      // Agregar los paquetes de uso de los datos predeterminados
      usagePackages: defaultData.usagePackages
    };
  } else {
    pricingData = defaultData;
  }
  
  console.log("Pricing data after translation:", pricingData);
  
  // Asegurarse de que no haya frecuencia "yearly"
  if (pricingData.frequencies.includes("yearly")) {
    pricingData.frequencies = pricingData.frequencies.filter(freq => freq !== "yearly");
    if (!pricingData.frequencies.includes("usage")) {
      pricingData.frequencies.push("usage");
    }
  }

  // Traducir las frecuencias
  const translatedFrequencies = pricingData.frequencies.map(freq => {
    return {
      key: freq,
      label: freq === "usage" ? t('pricing.usage_packages', "Usage Based Packages") : t(`pricing.${freq}`, freq)
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
        usagePackages={pricingData.usagePackages}
        t={t}
      />
    </div>
  );
}
