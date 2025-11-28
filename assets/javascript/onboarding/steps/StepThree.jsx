import React, { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const StepThree = ({ onNext, initialData, setMascotMessageOverride }) => {
  const [brandData, setBrandData] = useState(initialData?.brandData?.brand || {});
  const [brandId, setBrandId] = useState(brandData.id);

  // Fields to display and edit
  const [toneOfVoice, setToneOfVoice] = useState(brandData.tone_of_voice || '');
  const [coreFeatures, setCoreFeatures] = useState(brandData.core_features || '');
  const [functionalBenefits, setFunctionalBenefits] = useState(brandData.functional_benefits || '');
  const [valuePropositions, setValuePropositions] = useState(brandData.value_propositions || '');

  useEffect(() => {
    console.log('StepThree received initialData:', initialData);
    if (initialData?.brandData) {
      // Try to find the brand object in various possible locations
      const brandData = initialData.brandData;
      const brand = brandData.brand || brandData.extracted_assets || brandData;

      console.log('StepThree extracted brand object:', brand);

      const getField = (field) => {
        // Try finding field in the brand object, or top level brandData, or extracted_assets
        return brand[field] ||
          brandData[field] ||
          (brandData.extracted_assets && brandData.extracted_assets[field]) ||
          '';
      };

      setBrandId(brand.id || brandData.brand_id);
      setToneOfVoice(getField('tone_of_voice'));
      setCoreFeatures(getField('core_features'));
      setFunctionalBenefits(getField('functional_benefits'));
      setValuePropositions(getField('value_propositions'));
    }
  }, [initialData]);

  useEffect(() => {
    if (setMascotMessageOverride) {
      setMascotMessageOverride("Let's review the details I extracted. Make any changes you like!");
    }
  }, [setMascotMessageOverride]);

  const handleAutoSave = async (field, value) => {
    if (!brandId) return;

    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      await fetch(`/ads/api/update-user-brand/${brandId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          [field]: value
        }),
      });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  };

  const handleNext = () => {
    // Pass the updated data to the next step
    const updatedData = {
      ...initialData,
      brandData: {
        ...initialData.brandData,
        brand: {
          ...initialData.brandData.brand,
          tone_of_voice: toneOfVoice,
          core_features: coreFeatures,
          functional_benefits: functionalBenefits,
          value_propositions: valuePropositions
        }
      }
    };
    onNext(updatedData);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-8 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl px-4">
        <Card className="w-full shadow-xl bg-background/95 backdrop-blur-sm border-primary/20">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Brand Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Tone of Voice</label>
                  <div className="relative group">
                    <Textarea
                      value={toneOfVoice}
                      onChange={(e) => setToneOfVoice(e.target.value)}
                      onBlur={() => handleAutoSave('tone_of_voice', toneOfVoice)}
                      className="min-h-[100px] resize-none pr-8"
                      placeholder="Describe your brand's voice..."
                    />
                    <Pencil size={14} className="absolute top-3 right-3 text-muted-foreground/40 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Functional Benefits</label>
                  <div className="relative group">
                    <Textarea
                      value={functionalBenefits}
                      onChange={(e) => setFunctionalBenefits(e.target.value)}
                      onBlur={() => handleAutoSave('functional_benefits', functionalBenefits)}
                      className="min-h-[100px] resize-none pr-8"
                      placeholder="What are the practical benefits?"
                    />
                    <Pencil size={14} className="absolute top-3 right-3 text-muted-foreground/40 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Core Features</label>
                  <div className="relative group">
                    <Textarea
                      value={coreFeatures}
                      onChange={(e) => setCoreFeatures(e.target.value)}
                      onBlur={() => handleAutoSave('core_features', coreFeatures)}
                      className="min-h-[100px] resize-none pr-8"
                      placeholder="List your key features..."
                    />
                    <Pencil size={14} className="absolute top-3 right-3 text-muted-foreground/40 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Value Proposition</label>
                  <div className="relative group">
                    <Textarea
                      value={valuePropositions}
                      onChange={(e) => setValuePropositions(e.target.value)}
                      onBlur={() => handleAutoSave('value_propositions', valuePropositions)}
                      className="min-h-[100px] resize-none pr-8"
                      placeholder="Why should customers choose you?"
                    />
                    <Pencil size={14} className="absolute top-3 right-3 text-muted-foreground/40 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext} className="px-8">
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StepThree;
