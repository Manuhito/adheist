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
import { ImageLibrarySelect } from './ImageLibrarySelect.jsx';
import { AppImageLibrarySelect } from './AppImageLibrarySelect.jsx';
import ImageLibraryModal from './ImageLibraryModal.jsx';
import CreateBrandModal from './CreateBrandModal.jsx';
import { useTranslation } from '../../lib/useTranslation';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover.tsx';

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

const IntegratedAdGenerator = ({ adRequestId, onClose, onGenerate }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(!!adRequestId);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [productImages, setProductImages] = useState({ primary: null, secondary: null });
  const [appImages, setAppImages] = useState({ primary: null, secondary: null });
  const [selectedCanvasSize, setSelectedCanvasSize] = useState('1024x1024');
  const [userPrompt, setUserPrompt] = useState("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [adLibraryData, setAdLibraryData] = useState(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 400,
  });

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
    }
    fetchBrands();
  }, [adRequestId]);

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
      setProductImages({
        primary: data.product_image_1_override || null,
        secondary: data.product_image_2_override || null
      });
      setAppImages({
        primary: data.app_image_1_override || null,
        secondary: data.app_image_2_override || null
      });
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

  const updateAdRequest = async (formData) => {
    if (!adRequestId) return;
    try {
      await fetch(`/ads/adrequest/${adRequestId}/update/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: formData
      });
    } catch (error) {
      console.error('Error updating ad request:', error);
    }
  };

  const handleBrandChange = (brand) => {
    setSelectedBrand(brand);
    setIsBrandDropdownOpen(false);
    const formData = new FormData();
    if (brand) {
      formData.append('brand_id', brand.id);
      updateAdRequest(formData);
    }
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
    const formData = new FormData();
    formData.append('canvas_size', sizeId);
    updateAdRequest(formData);
  };

  const handleOpenImageModal = (source, field) => {
    window.currentImageSelectionSource = source;
    window.currentImageField = field;
    if (selectedBrand) window.selectedBrandId = selectedBrand.id;
    setIsImageModalOpen(true);
  };

  const handleImageSelect = (image) => {
    const source = window.currentImageSelectionSource;
    const field = window.currentImageField;
    const url = image?.image_url || image?.url;

    if (source === 'product_library' && field) {
      const key = field === 'product_image_1' ? 'primary' : 'secondary';
      setProductImages(prev => ({ ...prev, [key]: url }));
      const formData = new FormData();
      formData.append(`${field}_asset_id`, image.id);
      formData.append(field, '');
      updateAdRequest(formData);
    } else if (source === 'app_library' && field) {
      const key = field === 'app_image_1' ? 'primary' : 'secondary';
      setAppImages(prev => ({ ...prev, [key]: url }));
      const formData = new FormData();
      formData.append(`${field}_asset_id`, image.id);
      formData.append(field, '');
      updateAdRequest(formData);
    }
    setIsImageModalOpen(false);
  };

  const handleImageDelete = (data) => {
    const { type, field } = data;
    if (field.startsWith('product')) {
      setProductImages(prev => ({ ...prev, [type]: null }));
    } else {
      setAppImages(prev => ({ ...prev, [type]: null }));
    }
    const formData = new FormData();
    formData.append(field, '');
    updateAdRequest(formData);
  };

  const handleGenerate = async () => {
    if (!adRequestId || !selectedBrand || !userPrompt.trim()) return;
    try {
      // Update prompt first
      const promptFormData = new FormData();
      promptFormData.append('user_prompt', userPrompt);
      await updateAdRequest(promptFormData);

      const versionFormData = new FormData();
      versionFormData.append('ad_request', adRequestId);

      const response = await fetch('/ads/adrequest/version/create/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: versionFormData,
      });

      if (response.ok) {
        const statusFormData = new FormData();
        statusFormData.append('status', 'SUBMITTED');
        await fetch(`/ads/adrequest/${adRequestId}/update/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCsrfToken() },
          body: statusFormData
        });
        if (onGenerate) onGenerate(adRequestId);
      }
    } catch (error) {
      console.error('Error generating ad:', error);
    }
  };

  const imageCount = [productImages.primary, productImages.secondary, appImages.primary, appImages.secondary].filter(Boolean).length;

  if (isLoading) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl flex flex-col items-center gap-4 max-h-[95vh]"
        >
          {/* Reference Image - Floating entity */}
          {adLibraryData && (
            <div className="relative group">
              <img
                src={adLibraryData.image_url}
                className="w-auto h-auto max-w-full max-h-[55vh] rounded-2xl object-cover border-[1px] border-white/20 shadow-2xl transition-transform group-hover:scale-[1.01]"
                alt="Reference"
              />
            </div>
          )}

          {/* Integrated AI Input Container */}
          <div className="w-full bg-neutral-200 dark:bg-white/10 rounded-2xl p-1.5 relative">
            {/* Close button - now part of the floating set */}
            <div className="absolute -top-12 -right-0 z-10">
              <button
                onClick={onClose}
                className="p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-full text-black/50 dark:text-white/70 transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <div className="relative flex flex-col bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/5">
                <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                  <Textarea
                    value={userPrompt}
                    onChange={(e) => {
                      setUserPrompt(e.target.value);
                      adjustHeight();
                    }}
                    placeholder="Tell me what to change..."
                    className={cn(
                      "w-full rounded-xl rounded-b-none px-4 py-3 bg-black/5 dark:bg-white/5 border-none dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70 resize-none focus-visible:ring-0 focus-visible:ring-offset-0",
                      "min-h-[72px]"
                    )}
                    ref={textareaRef}
                  />
                </div>

                <div className="h-14 bg-black/5 dark:bg-white/5 rounded-b-xl flex items-center relative">
                  <div className="absolute left-3 right-3 bottom-0 top-0 flex items-center justify-between w-[calc(100%-24px)]">
                    <div className="flex items-center gap-2">
                      {/* Brand Selector */}
                      <div className="flex items-center">
                        <DropdownMenu open={isBrandDropdownOpen} onOpenChange={setIsBrandDropdownOpen}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-1 h-8 pl-1 pr-2 text-xs rounded-md dark:text-white hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
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

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingBrand(null);
                            setIsBrandModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-black/50 dark:text-white/50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />

                      {/* Assets Picker */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            disabled={!selectedBrand}
                            className={cn(
                              "rounded-lg p-2 bg-black/5 dark:bg-white/5 cursor-pointer",
                              "hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500",
                              imageCount > 0 ? "text-primary" : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                            )}
                          >
                            <Paperclip className="w-4 h-4 transition-colors" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[90] w-[400px] p-5 rounded-2xl shadow-2xl border-white/20 backdrop-blur-3xl" align="start">
                          <div className="grid grid-cols-2 gap-4">
                            <ImageLibrarySelect
                              selectedImages={productImages}
                              onSelectImage={(data) => handleOpenImageModal('product_library', data.field)}
                              onDeleteImage={handleImageDelete}
                            />
                            <AppImageLibrarySelect
                              selectedImages={appImages}
                              onSelectImage={(data) => handleOpenImageModal('app_library', data.field)}
                              onDeleteImage={handleImageDelete}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>

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

                    <button
                      type="button"
                      disabled={!selectedBrand || !userPrompt.trim()}
                      onClick={handleGenerate}
                      className={cn(
                        "rounded-lg p-2 bg-black/5 dark:bg-white/5",
                        "hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
                      )}
                      aria-label="Generate"
                    >
                      <ArrowRight
                        className={cn(
                          "w-4 h-4 dark:text-white transition-opacity duration-200",
                          userPrompt.trim() && selectedBrand ? "opacity-100" : "opacity-30"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <ImageLibraryModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          onSelect={handleImageSelect}
        />

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
      </div>
    </AnimatePresence>
  );
};

export default IntegratedAdGenerator;
