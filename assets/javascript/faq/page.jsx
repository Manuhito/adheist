import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { useTranslation } from '../lib/useTranslation';

/**
 * FAQ Page component that displays frequently asked questions and answers
 * Loads data from window.__FAQ_DATA__ which is provided by the Django template
 */
export default function FAQPage() {
  const { t } = useTranslation();
  const faqData = window.__FAQ_DATA__ || [];
  
  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight">{t('faq.title', 'Frequently Asked Questions')}</h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          {t('faq.subtitle', 'Find answers to common questions about our services')}
        </p>
      </div>
      
      {faqData.length > 0 ? (
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqData.map((faq) => (
              <AccordionItem key={faq.id} value={`item-${faq.id}`}>
                <AccordionTrigger className="text-lg font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm dark:prose-invert">
                    {faq.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('faq.no_items', 'No FAQ items available')}</p>
        </div>
      )}
    </div>
  );
}
