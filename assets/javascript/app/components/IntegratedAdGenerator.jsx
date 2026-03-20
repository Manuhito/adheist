import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowRight, Bot, Check, ChevronDown,
  Paperclip, Layout, Sparkles, ImageIcon,
  MessageSquarePlus, Building, Trash2, Plus, Pen
} from "lucide-react";
import { Textarea } from "../../components/ui/textarea.tsx";
import { cn } from "../../lib/utils.ts";
import { Button } from "../../components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu.tsx";
import ImageLibraryModal from './ImageLibraryModal.jsx';
import CreateBrandModal from './CreateBrandModal.jsx';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Custom hook for auto-resizing textarea
 */
function useAutoResizeTextarea({ minHeight, maxHeight }) {
  const textareaRef = useRef(null);
  const adjustHeight = useCallback((reset = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (reset) {
      textarea.style.height = `${minHeight}px`;
      return;
    }
    textarea.style.height = `${minHeight}px`;
    const newHeight = Math.max(
      minHeight,
      Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
    );
    textarea.style.height = `${newHeight}px`;
  }, [minHeight, maxHeight]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

const IntegratedAdGenerator = ({ adRequestId, selectedAdLibraryItem, onClose, onGenerate }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(!!adRequestId);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [attachedImages, setAttachedImages] = useState([]);
  const [selectedCanvasSize, setSelectedCanvasSize] = useState('1024x1024');
  const [userPrompt, setUserPrompt] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [adLibraryData, setAdLibraryData] = useState(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const chatContainerRef = useRef(null);
  const [chatHeight, setChatHeight] = useState(0);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 400,
  });

  const discoverData = window.__DISCOVER_DATA__ || {};
  const adGenerationCost = window.__AD_GENERATION_COST__ || discoverData.adGenerationCost || 1;

  const canvasSizes = [
    { id: "1024x1024", label: "Square", sub: "Instagram/LinkedIn" },
    { id: "1536x1024", label: "Landscape", sub: "FB/Twitter" },
    { id: "1024x1536", label: "Portrait", sub: "Story/Reels" },
  ];

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
  };

  useEffect(() => {
    if (adRequestId) {
      fetchAdRequestData(adRequestId);
    } else {
      setIsLoading(false);
    }
    fetchBrands();
  }, [adRequestId]);

  useEffect(() => {
    if (!selectedAdLibraryItem) {
      setAdLibraryData(null);
      return;
    }
    setAdLibraryData({
      image_url: selectedAdLibraryItem.url || selectedAdLibraryItem.ad_image || selectedAdLibraryItem.image_url,
      id: selectedAdLibraryItem.original_id || selectedAdLibraryItem.id,
    });
  }, [selectedAdLibraryItem]);

  useEffect(() => {
    const element = chatContainerRef.current;
    if (!element) return;

    const updateHeight = () => {
      const rect = element.getBoundingClientRect();
      setChatHeight(rect.height);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);


  const fetchBrands = async () => {
    try {
      const response = await fetch('/ads/api/user-brands/');
      if (!response.ok) throw new Error(`Error fetching brands: ${response.statusText}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.brands)) {
        const activeBrands = data.brands.filter(brand => brand.active !== false);
        setBrands(activeBrands);
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
    }
  };

  const fetchAdRequestData = async (id) => {
    try {
      const response = await fetch(`/ads/adrequest/${id}/get/`);
      const data = await response.json();
      if (data.brand) setSelectedBrand(data.brand);
      if (data.canvas_size) setSelectedCanvasSize(data.canvas_size);
      if (data.asset_overrides?.user_prompt) {
        setUserPrompt(data.asset_overrides.user_prompt);
      }
      if (data.ad_library) {
        setAdLibraryData(data.ad_library);
      }
      setIsLoading(false);
      setTimeout(() => adjustHeight(), 100);
    } catch (error) {
      console.error('Error fetching ad request:', error);
      setIsLoading(false);
    }
  };

  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);
    setIsBrandDropdownOpen(false);
  };

  const handleBrandCreated = (newBrand) => {
    setBrands([...brands, newBrand]);
    handleBrandChange(newBrand);
  };

  const handleBrandUpdated = (updatedBrand) => {
    setBrands(prevBrands =>
      prevBrands.map(brand => brand.id === updatedBrand.id ? updatedBrand : brand)
    );
    if (selectedBrand?.id === updatedBrand.id) {
      setSelectedBrand(updatedBrand);
    }
  };

  const handleEditBrand = (brand, e) => {
    e.stopPropagation();
    setEditingBrand(brand);
    setIsBrandModalOpen(true);
    setIsBrandDropdownOpen(false);
  };

  const handleCanvasSizeChange = (sizeId) => {
    setSelectedCanvasSize(sizeId);
  };

  const createAttachmentId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleAttachmentClick = () => {
    if (!selectedBrand) return;
    window.currentImageSelectionSource = 'product_library';
    if (selectedBrand) window.selectedBrandId = selectedBrand.id;
    setIsImageModalOpen(true);
  };

  const handleAttachmentSelect = (image) => {
    if (!image || attachedImages.length >= 4) return;
    const url = image?.image_url || image?.url;
    const assetId = image?.id || null;
    if (!url || !assetId) return;

    setAttachedImages((prev) => {
      if (prev.length >= 4) return prev;
      if (prev.some((item) => item.assetId === assetId)) return prev;
      return [...prev, { id: createAttachmentId(), assetId, url }];
    });
    setIsImageModalOpen(false);
  };

  const handleRemoveAttachment = (attachmentId) => {
    setAttachedImages((prev) => prev.filter((image) => image.id !== attachmentId));
  };

  const selectedAdLibraryId = selectedAdLibraryItem?.original_id || selectedAdLibraryItem?.id || adLibraryData?.id;
  const canGenerate = !isGenerating && !!selectedBrand && !!selectedAdLibraryId;

  const handleGenerate = async () => {
    if (isGeneratingRef.current || !selectedBrand || !selectedAdLibraryId) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);

    try {
      let currentAdRequestId = adRequestId;

      if (!currentAdRequestId) {
        const createResponse = await fetch('/ads/adrequest/create/', {
          method: 'POST',
          headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create AdRequest');
        }

        const createData = await createResponse.json();
        currentAdRequestId = createData.id;
      }

      const updateFormData = new FormData();
      updateFormData.append('user_prompt', userPrompt);
      updateFormData.append('canvas_size', selectedCanvasSize);
      if (selectedBrand?.id) {
        updateFormData.append('brand_id', selectedBrand.id);
      }

      updateFormData.append('ad_library', selectedAdLibraryId);

      const attachmentFields = [
        'product_image_1',
        'product_image_2',
        'app_image_1',
        'app_image_2',
      ];
      attachedImages.forEach((image, index) => {
        const field = attachmentFields[index];
        if (field && image.assetId) {
          updateFormData.append(`${field}_asset_id`, image.assetId);
          updateFormData.append(field, '');
        }
      });

      await fetch(`/ads/adrequest/${currentAdRequestId}/update/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: updateFormData
      });

      const versionFormData = new FormData();
      versionFormData.append('ad_request', currentAdRequestId);

      const response = await fetch('/ads/adrequest/version/create/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: versionFormData,
      });

      if (response.ok) {
        const statusFormData = new FormData();
        statusFormData.append('status', 'SUBMITTED');
        await fetch(`/ads/adrequest/${currentAdRequestId}/update/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCsrfToken() },
          body: statusFormData
        });
        if (onGenerate) onGenerate(currentAdRequestId);
      }
    } catch (error) {
      console.error('Error generating ad:', error);
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  };

  const imageCount = attachedImages.length;

  if (isLoading) return null;

  const assetsTooltipText = !selectedBrand
    ? 'Please choose or create a new Brand'
    : imageCount >= 4
      ? 'Maximum 4 images'
      : 'Attach up to 4 images';

  return (
    <>
      {adLibraryData?.image_url && (
        <>
          <button
            type="button"
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/80 cursor-pointer"
            aria-label={t('ad_generator.close_reference', 'Close reference image')}
          />
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
            style={{
              paddingBottom: chatHeight ? `${chatHeight + 24}px` : undefined,
              paddingTop: '12px',
            }}
          >
            <div className="relative pointer-events-auto">
              {onClose && (
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <img
                src={adLibraryData.image_url}
                className="w-auto h-auto max-w-[90vw] rounded-2xl object-contain"
                style={{
                  maxHeight: chatHeight
                    ? `calc(100vh - ${chatHeight}px - 48px)`
                    : '70vh'
                }}
                alt="Reference"
              />
            </div>
          </div>
        </>
      )}

      <div
        ref={chatContainerRef}
        className="fixed bottom-6 left-1/2 z-[70] w-full max-w-2xl -translate-x-1/2 px-4"
      >
        <div className="w-full bg-white/80 dark:bg-neutral-900/60 rounded-2xl p-1.5 border border-black/5 dark:border-white/10 backdrop-blur">
          <div className="relative flex flex-col bg-white dark:bg-neutral-950 rounded-xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/5">
            <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-2 pb-1 bg-white/70 dark:bg-white/5 rounded-t-xl">
                  {attachedImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative h-14 w-14 rounded-lg overflow-hidden border border-black/10 dark:border-white/10"
                    >
                      <img
                        src={image.url}
                        alt="Attachment preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(image.id)}
                        className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1 hover:bg-black/90 transition"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                value={userPrompt}
                onChange={(e) => {
                  setUserPrompt(e.target.value);
                  adjustHeight();
                }}
                placeholder="Tell me what to change..."
                className={cn(
                  "w-full px-4 bg-white/70 dark:bg-white/5 border-none text-foreground placeholder:text-muted-foreground resize-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  attachedImages.length > 0 ? "rounded-none py-2" : "rounded-xl rounded-b-none py-3",
                  "min-h-[72px]"
                )}
                ref={textareaRef}
              />
            </div>

            <div className="h-14 bg-white/70 dark:bg-white/5 rounded-b-xl flex items-center relative">
              <div className="absolute left-3 right-3 bottom-0 top-0 flex items-center justify-between w-[calc(100%-24px)]">
                <div className="flex items-center gap-2">
                  {/* Brand Selector */}
                  <div className="flex items-center">
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingBrand(null);
                          setIsBrandModalOpen(true);
                        }}
                        className="w-7 h-7 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                        Create new brand
                        <div className="absolute top-full left-3 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>

                    <DropdownMenu open={isBrandDropdownOpen} onOpenChange={setIsBrandDropdownOpen}>
                      <div className="relative group">
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 pl-2 pr-1.5 rounded-lg flex items-center gap-1 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-medium focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
                          >
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={selectedBrand ? selectedBrand.id : 'no-brand'}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center gap-1"
                              >
                                {selectedBrand ? (
                                  <span className="font-bold truncate max-w-[100px]">{selectedBrand.name}</span>
                                ) : (
                                  <span className="opacity-50">Brand</span>
                                )}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                              </motion.div>
                            </AnimatePresence>
                          </Button>
                        </DropdownMenuTrigger>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                          Choose your brand
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                        </div>
                      </div>
                      <DropdownMenuContent className="z-[90] w-64 p-2 rounded-xl shadow-xl border-black/10 dark:border-white/10 bg-gradient-to-b from-white via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800" align="start">
                        {brands.length === 0 ? (
                          <div
                            className="px-2 py-4 text-xs text-center cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setIsBrandModalOpen(true)}
                          >
                            {t('step_two.no_brands_click_to_create', 'No brands available - Click to create one')}
                          </div>
                        ) : (
                          <div className="py-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {brands.map((brand) => (
                              <DropdownMenuItem
                                key={brand.id}
                                className="relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-xs outline-none hover:bg-black/5 dark:hover:bg-white/5"
                                onClick={() => handleBrandChange(brand)}
                              >
                                <span className="flex-1 font-medium truncate">{brand.name}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => handleEditBrand(brand, e)}
                                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                  >
                                    <Pen className="h-2.5 w-2.5 opacity-40 hover:opacity-100" />
                                  </button>
                                  <div className="w-4 h-4 flex items-center justify-center">
                                    {selectedBrand?.id === brand.id && (
                                      <Check className="h-3.5 w-3.5 text-primary" />
                                    )}
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />

                  {/* Assets Picker */}
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={handleAttachmentClick}
                      disabled={!selectedBrand || imageCount >= 4}
                      className={cn(
                        "rounded-lg p-2 bg-white/70 dark:bg-white/5 cursor-pointer",
                        "hover:bg-white/90 dark:hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500",
                        imageCount > 0 ? "text-primary" : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white",
                        (!selectedBrand || imageCount >= 4) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Paperclip className="w-4 h-4 transition-colors" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                      {assetsTooltipText}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>

                  {/* Format Selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 pl-2 pr-1.5 rounded-lg flex items-center gap-1 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-medium focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
                      >
                        <Layout className="w-3.5 h-3.5 opacity-70" />
                        <span className="opacity-70">{canvasSizes.find(s => s.id === selectedCanvasSize)?.label}</span>
                        <ChevronDown className="w-3 h-3 opacity-40" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="z-[90] w-48 p-2 rounded-xl shadow-xl border-black/10 dark:border-white/10 bg-gradient-to-b from-white via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800" align="start">
                      {canvasSizes.map(size => (
                        <DropdownMenuItem
                          key={size.id}
                          onSelect={() => handleCanvasSizeChange(size.id)}
                          className="rounded-lg flex flex-col items-start gap-0.5 p-2"
                        >
                          <div className="flex items-center justify-between w-full text-xs">
                            <span className="font-bold">{size.label}</span>
                            {selectedCanvasSize === size.id && <Check className="w-3 h-3 text-primary" />}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="relative group">
                  <button
                    type="button"
                    disabled={!canGenerate}
                    onClick={handleGenerate}
                    className={cn(
                      "rounded-lg p-2 bg-white/70 dark:bg-white/5",
                      "focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500",
                      !isGenerating && "hover:bg-white/90 dark:hover:bg-white/10",
                      !canGenerate && "opacity-50 cursor-not-allowed"
                    )}
                    aria-label="Generate"
                  >
                    <ArrowRight
                      className={cn(
                        "w-4 h-4 dark:text-white transition-opacity duration-200",
                        canGenerate ? "opacity-100" : "opacity-30"
                      )}
                    />
                  </button>

                  <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                    Use {adGenerationCost} {adGenerationCost === 1 ? 'credit' : 'credits'} to generate this ad
                    <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateBrandModal
        isOpen={isBrandModalOpen}
        onClose={() => {
          setIsBrandModalOpen(false);
          setEditingBrand(null);
        }}
        onBrandCreated={handleBrandCreated}
        onBrandUpdated={handleBrandUpdated}
        adRequestId={adRequestId}
        editingBrand={editingBrand}
        brandAssetsCost={4}
      />

      <ImageLibraryModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelect={handleAttachmentSelect}
      />
    </>
  );
};

export default IntegratedAdGenerator;
