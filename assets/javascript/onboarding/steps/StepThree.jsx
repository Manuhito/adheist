import React, { useState, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const StepThree = ({ onNext, initialData, setMascotMessageOverride }) => {
  const [brandId, setBrandId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fields to display and edit
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [coreFeatures, setCoreFeatures] = useState('');
  const [functionalBenefits, setFunctionalBenefits] = useState('');
  const [valuePropositions, setValuePropositions] = useState('');

  // Extract brandId from initialData
  useEffect(() => {
    if (initialData?.brandData) {
      const brandData = initialData.brandData;
      const id = brandData.brand?.id || brandData.brand_id;
      if (id) {
        setBrandId(id);
      }
    }
  }, [initialData]);

  // Helper to format list fields (Python lists or JSON arrays to newline-separated text)
  const formatListField = (value) => {
    if (!value) return '';

    // Try JSON parse first
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item).join('\n');
      }
    } catch {
      // Not JSON, try Python list format
    }

    // Handle Python list format: ['item1', 'item2']
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        // Replace single quotes with double quotes for JSON parsing
        const jsonStr = value.replace(/'/g, '"');
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item).join('\n');
        }
      } catch {
        // Still not parseable, return as-is
      }
    }

    return value;
  };

  // Fetch brand details from server when brandId is available
  useEffect(() => {
    const fetchBrandDetails = async () => {
      if (!brandId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/ads/api/brand-details/${brandId}/`);
        const data = await response.json();

        if (data.success && data.brand) {
          setToneOfVoice(data.brand.tone_of_voice || '');
          setCoreFeatures(formatListField(data.brand.core_features));
          setFunctionalBenefits(formatListField(data.brand.functional_benefits));
          setValuePropositions(formatListField(data.brand.value_propositions));
        }
      } catch (error) {
        console.error('Error fetching brand details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrandDetails();
  }, [brandId]);

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
        ...initialData?.brandData,
        brand_id: brandId,
        brand: {
          ...initialData?.brandData?.brand,
          id: brandId,
          tone_of_voice: toneOfVoice,
          core_features: coreFeatures,
          functional_benefits: functionalBenefits,
          value_propositions: valuePropositions
        }
      }
    };
    onNext(updatedData);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full py-8 animate-in fade-in duration-500">
        <div className="w-full max-w-4xl px-4">
          <Card className="w-full shadow-xl bg-background/95 backdrop-blur-sm border-primary/20">
            <CardContent className="p-6 flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
