import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, ArrowRight } from 'lucide-react';
import Bars from '../components/Bars';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const StepTwo = ({ onNext, initialData, setMascotMessageOverride }) => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(true);
  const [data, setData] = useState({ screenshot: null, brandData: null });
  const [error, setError] = useState(null);

  // Brand details state
  const [brandName, setBrandName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // Description editing state
  const [productDescription, setProductDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const [brandId, setBrandId] = useState(null);

  // Auto-save function
  const autoSave = useCallback(async (field, value) => {
    if (!brandId) return;

    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

      // Map field names to API expected names if necessary
      const apiField = field === 'name' ? 'brand_name' : field;

      await fetch(`/ads/api/update-user-brand/${brandId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          [apiField]: value
        }),
      });

      // Update local data state to reflect saved changes
      if (data && data.brandData && data.brandData.brand) {
        if (field === 'name') {
          data.brandData.brand.name = value;
          data.brandData.brand_name = value;
        } else if (field === 'product_description') {
          data.brandData.brand.product_description = value;
          data.brandData.product_description = value;
        }
      }

    } catch (error) {
      console.error(`Error auto-saving ${field}:`, error);
    }
  }, [brandId, data]);

  useEffect(() => {
    if (initialData?.promises) {
      // 1. Handle Screenshot - Unblocks the UI immediately
      initialData.promises.screenshot
        .then((screenshotData) => {
          if (screenshotData.success) {
            setData((prev) => ({ ...prev, screenshot: screenshotData.screenshot }));
          }
        })
        .catch((err) => console.error("Screenshot error:", err))
        .finally(() => setLoading(false));

      // 2. Handle Analysis - Shows the modal when ready
      initialData.promises.analysis
        .then((analysisData) => {
          if (analysisData.success) {
            setData((prev) => ({ ...prev, brandData: analysisData }));

            const bName = analysisData.brand?.name || analysisData.brand_name || 'Your Brand';
            const bDesc = analysisData.brand?.product_description || analysisData.product_description || "No description available.";
            const bId = analysisData.brand?.id || analysisData.brand_id;

            setBrandName(bName);
            setProductDescription(bDesc);
            setBrandId(bId);
          } else {
            setError(analysisData.error || "Failed to analyze website");
          }
        })
        .catch((err) => {
          console.error("Analysis error:", err);
          setError("An error occurred while analyzing.");
        })
        .finally(() => setAnalyzing(false));
    } else if (initialData?.brandData) {
      // Data already loaded (from page refresh or revisiting step)
      setData({
        screenshot: initialData.screenshot,
        brandData: initialData.brandData
      });

      const bName = initialData.brandData.brand?.name || initialData.brandData.brand_name || 'Your Brand';
      const bDesc = initialData.brandData.brand?.product_description || initialData.brandData.product_description || "No description available.";
      const bId = initialData.brandData.brand?.id || initialData.brandData.brand_id;

      setBrandName(bName);
      setProductDescription(bDesc);
      setBrandId(bId);
      setLoading(false);
      setAnalyzing(false);
    } else if (!initialData?.promises && !initialData?.brandData) {
      // No data available - show error or redirect
      setLoading(false);
      setAnalyzing(false);
      setError("No brand data available. Please start from the beginning.");
    }
  }, [initialData]);

  // Focus effects for editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  useEffect(() => {
    if (setMascotMessageOverride) {
      if (loading) {
        setMascotMessageOverride("Okay, let's take a look...");
      } else if (error) {
        setMascotMessageOverride("Oops! Something went wrong.");
      } else if (analyzing && data?.screenshot) {
        // Screenshot visible, still analyzing brand
        setMascotMessageOverride("Hey, Nice website!");
      } else if (analyzing) {
        // No screenshot yet, still analyzing
        setMascotMessageOverride("Analyzing your brand style...");
      } else if (data?.screenshot) {
        // Modal with brand info is now visible
        setMascotMessageOverride("How does this look? Feel free to make any changes.");
      } else {
        setMascotMessageOverride(null);
      }
    }
  }, [loading, analyzing, error, data, setMascotMessageOverride]);

  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
      return null;
    }
  };

  const handleNameBlur = () => {
    setIsEditingName(false);
    autoSave('name', brandName);
  };

  const handleDescriptionBlur = () => {
    setIsEditingDescription(false);
    autoSave('product_description', productDescription);
  };

  const handleNext = async () => {
    try {
      // If we have a brand ID, fetch the latest full data to ensure we have all fields
      if (brandId) {
        const response = await fetch(`/ads/api/brand-details/${brandId}/`);
        const freshData = await response.json();

        if (freshData.success && freshData.brand) {
          // Merge fresh data into our update payload
          const updatedData = {
            ...initialData,
            ...data,
            brandData: {
              ...initialData?.brandData,
              ...data?.brandData,
              brand: freshData.brand,
              // Ensure these specific fields are updated from local state in case they changed and weren't saved yet
              // (although autoSave should have handled it, this is safer)
              brand_name: brandName,
              product_description: productDescription
            }
          };

          // Double check local edits overlay
          if (updatedData.brandData.brand) {
            updatedData.brandData.brand.name = brandName;
            updatedData.brandData.brand.product_description = productDescription;
          }

          onNext(updatedData);
          return;
        }
      }

      // Fallback to existing logic if fetch fails or no brandId
      const updatedData = {
        ...initialData,
        ...data
      };

      if (updatedData.brandData) {
        if (updatedData.brandData.brand) {
          updatedData.brandData.brand.name = brandName;
          updatedData.brandData.brand.product_description = productDescription;
        } else {
          updatedData.brandData.brand_name = brandName;
          updatedData.brandData.product_description = productDescription;
        }
      }

      onNext(updatedData);
    } catch (err) {
      console.error("Error fetching fresh brand details:", err);
      // Fallback on error
      const updatedData = { ...initialData, ...data };
      onNext(updatedData);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center gap-4">
          <Bars size={64} className="text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Taking a snapshot of your website...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="bg-destructive/10 p-8 rounded-xl border border-destructive/20 text-center max-w-md">
          <h3 className="text-lg font-semibold text-destructive mb-2">Analysis Failed</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const faviconUrl = getFaviconUrl(initialData?.url || initialData?.website);

  return (
    <div className="flex flex-col items-center justify-start w-full pb-8 animate-in fade-in duration-500 relative">
      <div className="w-full max-w-3xl px-4 relative mx-auto mt-8" style={{ perspective: '800px' }}>
        {/* Screenshot Background */}
        {data?.screenshot && (
          <div
            className={`relative w-full rounded-xl overflow-hidden shadow-md border bg-muted/50 mb-8 mx-auto transition-all duration-700 ease-out ${!analyzing ? 'opacity-90' : ''
              }`}
            style={{
              transform: !analyzing ? 'rotateX(25deg) translateY(-100px) scale(1)' : 'none',
              transformOrigin: 'center bottom'
            }}
          >
            <img
              src={data.screenshot}
              alt="Website Screenshot"
              className="w-full h-auto object-contain"
            />
          </div>
        )}

        {/* Modal Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center z-10 p-4 ${!analyzing ? '-mt-16' : ''}`}>
          {!analyzing && (
            <Card className="w-full max-w-lg shadow-xl bg-background/95 backdrop-blur-sm border-primary/20">
              <CardContent className="p-6 space-y-6">
                {/* Header: Favicon + Name + URL */}
                <div className="flex items-start gap-4">
                  {faviconUrl && (
                    <div className="flex-shrink-0 bg-white rounded-lg border shadow-sm w-10 h-10 overflow-hidden flex items-center justify-center">
                      <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className="flex-grow space-y-1">
                    <div className="flex items-center gap-2 group">
                      {isEditingName ? (
                        <Input
                          ref={nameInputRef}
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          onBlur={handleNameBlur}
                          onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                          className="h-8 text-lg font-bold px-2 -ml-2 w-full"
                        />
                      ) : (
                        <>
                          <h2 className="text-lg font-bold text-foreground">{brandName}</h2>
                          <button
                            onClick={() => setIsEditingName(true)}
                            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {initialData?.url || initialData?.website}
                    </p>
                  </div>
                </div>

                {/* About Section */}
                <div className="space-y-2">
                  <h3 className="text-sm text-foreground">About</h3>
                  <div className="relative group border border-primary rounded-md p-1 transition-colors">
                    {isEditingDescription ? (
                      <Textarea
                        ref={descriptionInputRef}
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        onBlur={handleDescriptionBlur}
                        className="min-h-[100px] border-none focus-visible:ring-0 resize-none p-2 text-black"
                      />
                    ) : (
                      <div
                        className="min-h-[100px] p-2 text-sm text-black leading-relaxed cursor-text"
                        onClick={() => setIsEditingDescription(true)}
                      >
                        {productDescription}
                        <Pencil size={14} className="absolute top-3 right-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleNext} className="group">
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepTwo;
