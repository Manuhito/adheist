import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronDown, Check, Layout, Image as ImageIcon, MessageSquarePlus } from 'lucide-react';
import { Button } from '../../components/ui/button.tsx';
import BrandDropdown from './BrandDropdown.jsx';
import { ImageLibrarySelect } from './ImageLibrarySelect.jsx';
import { AppImageLibrarySelect } from './AppImageLibrarySelect.jsx';
import ImageLibraryModal from './ImageLibraryModal.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover.tsx';
import { cn } from '../../lib/utils.ts';

const FloatingAdGenerator = ({ adRequestId, onClose, onGenerate }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(!!adRequestId);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [productImages, setProductImages] = useState({ primary: null, secondary: null });
  const [appImages, setAppImages] = useState({ primary: null, secondary: null });
  const [selectedCanvasSize, setSelectedCanvasSize] = useState('1024x1024');
  const [userPrompt, setUserPrompt] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [adLibraryData, setAdLibraryData] = useState(null);

  const canvasSizes = [
    { id: "1024x1024", label: "Square", sub: "Instagram/LinkedIn" },
    { id: "1536x1024", label: "Landscape", sub: "FB/Twitter" },
    { id: "1024x1536", label: "Portrait", sub: "Story/Reels" },
  ];

  const getCsrfToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  useEffect(() => {
    if (adRequestId) {
      fetchAdRequestData(adRequestId);
    }
  }, [adRequestId]);

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
    const formData = new FormData();
    if (brand) {
      formData.append('brand_id', brand.id);
      updateAdRequest(formData);
    }
  };

  const handleCanvasSizeChange = (sizeId) => {
    setSelectedCanvasSize(sizeId);
    const formData = new FormData();
    formData.append('canvas_size', sizeId);
    updateAdRequest(formData);
  };

  const handlePromptChange = (e) => {
    const val = e.target.value;
    setUserPrompt(val);
  };

  const handlePromptBlur = () => {
    const formData = new FormData();
    formData.append('user_prompt', userPrompt);
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
    if (!adRequestId) return;
    try {
      const versionFormData = new FormData();
      versionFormData.append('ad_request', adRequestId);

      const response = await fetch('/ads/adrequest/version/create/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: versionFormData,
      });

      if (response.ok) {
        // Update status to SUBMITTED
        const statusFormData = new FormData();
        statusFormData.append('status', 'SUBMITTED');
        await fetch(`/ads/adrequest/${adRequestId}/update/`, {
          method: 'POST',
          headers: { 'X-CSRFToken': getCsrfToken() },
          body: statusFormData
        });

        // Call parent onGenerate or redirect
        if (onGenerate) {
          onGenerate(adRequestId);
        } else {
          window.location.href = `/ads/my-ads/`;
        }
      } else {
        const errData = await response.json();
        alert(errData.error || 'Error generating ad');
      }
    } catch (error) {
      console.error('Error generating ad:', error);
    }
  };

  const imageCount = [productImages.primary, productImages.secondary, appImages.primary, appImages.secondary].filter(Boolean).length;

  if (isLoading) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          className="relative w-full max-w-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] rounded-[32px] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-8 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 italic">Generate Your Ad</h3>
                <p className="text-sm text-gray-500 font-medium">Customize your visual identity with AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all active:scale-95"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            {/* Grid Layout for Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Brand & Images */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 block">1. Select Brand</label>
                  <BrandDropdown
                    initialBrandId={selectedBrand?.id}
                    onBrandChange={handleBrandChange}
                    adRequestId={adRequestId}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 block">2. Add Assets ({imageCount}/4)</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={!selectedBrand}
                        className="w-full justify-between h-14 bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/5 rounded-2xl hover:bg-gray-100 transition-all font-semibold"
                      >
                        <div className="flex items-center gap-3">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                          <span className={imageCount === 0 ? "text-gray-400" : "text-gray-900 dark:text-gray-100"}>
                            {imageCount === 0 ? 'Upload product images' : `${imageCount} assets selected`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {imageCount > 0 && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-6 rounded-3xl shadow-2xl border-white/20 backdrop-blur-xl" align="start">
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center">Project</p>
                            <ImageLibrarySelect
                              selectedImages={productImages}
                              onSelectImage={(data) => handleOpenImageModal('product_library', data.field)}
                              onDeleteImage={handleImageDelete}
                            />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center">App / Social</p>
                            <AppImageLibrarySelect
                              selectedImages={appImages}
                              onSelectImage={(data) => handleOpenImageModal('app_library', data.field)}
                              onDeleteImage={handleImageDelete}
                            />
                          </div>
                        </div>
                        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                          <p className="text-[10px] text-primary font-medium text-center">
                            Images allow AI to maintain your product style
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {!selectedBrand && <p className="text-[10px] text-amber-500 mt-2 font-medium">← Brand required for uploads</p>}
                </div>
              </div>

              {/* Right Column: Canvas & Prompt */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 block">3. Layout Format</label>
                  <div className="flex gap-2">
                    {canvasSizes.map(size => (
                      <button
                        key={size.id}
                        onClick={() => handleCanvasSizeChange(size.id)}
                        className={cn(
                          "flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300",
                          selectedCanvasSize === size.id
                            ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                            : "bg-gray-50/50 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10"
                        )}
                      >
                        <Layout className={cn("w-5 h-5 mb-2", selectedCanvasSize === size.id ? "text-primary" : "text-gray-400")} />
                        <span className={cn("text-xs font-bold", selectedCanvasSize === size.id ? "text-primary" : "text-gray-600 dark:text-gray-400")}>{size.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3 block">4. Creative Vision</label>
                  <div className="relative group">
                    <textarea
                      value={userPrompt}
                      onChange={handlePromptChange}
                      onBlur={handlePromptBlur}
                      placeholder="e.g. Minimalist background, sunny morning mood..."
                      className="w-full h-[120px] p-5 bg-gray-50/50 dark:bg-white/5 border-2 border-transparent focus:border-primary/20 rounded-2xl text-sm font-medium resize-none outline-none transition-all placeholder:text-gray-400"
                    />
                    <div className="absolute bottom-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-white/5">
                      <MessageSquarePlus className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="pt-6">
              <Button
                onClick={handleGenerate}
                disabled={!selectedBrand}
                className="w-full h-16 rounded-[24px] bg-primary hover:bg-primary/90 text-white font-bold text-xl shadow-[0_20px_40px_-12px_rgba(var(--primary-rgb),0.4)] flex items-center justify-center gap-3 transition-all active:scale-[0.97] active:shadow-none disabled:opacity-50 disabled:grayscale"
              >
                <Sparkles className="w-7 h-7" />
                Generate Magic Ad
              </Button>
              <p className="text-[10px] text-gray-400 text-center mt-4 font-medium uppercase tracking-widest">
                Costs 1 credit per generation
              </p>
            </div>
          </div>

          {/* Reference Preview at bottom */}
          {adLibraryData && (
            <div className="bg-gray-50 dark:bg-black/40 p-5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={adLibraryData.image_url} className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-md" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-white dark:border-gray-900" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Reference Inspiration</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{adLibraryData.company_name}</p>
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] bg-white/50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-100 dark:border-white/5 text-gray-500 font-bold italic">
                  Style mimic active
                </span>
              </div>
            </div>
          )}
        </motion.div>

        <ImageLibraryModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          onSelect={handleImageSelect}
        />
      </div>
    </AnimatePresence>
  );
};

export default FloatingAdGenerator;
