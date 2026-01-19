import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ImagePlus, Trash2, Check, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper to get CSRF token
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

// Image Upload Component - styled like discover-clone-page
const ImageUploader = ({ image, onUpload, onDelete, inputRef }) => {
  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-md aspect-square bg-background hover:bg-muted/20 transition-colors">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      {image ? (
        <div className="relative w-full h-full group">
          <img
            src={typeof image === 'string' ? image : URL.createObjectURL(image)}
            alt="Uploaded"
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleClick}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-full flex flex-col gap-2 hover:bg-muted/40 dark:hover:bg-muted/20"
          onClick={handleClick}
        >
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
};

// Canvas size options
const canvasSizes = [
  { id: "1024x1024", label: "Square", size: "1024×1024" },
  { id: "1536x1024", label: "Landscape", size: "1536×1024" },
  { id: "1024x1536", label: "Portrait", size: "1024×1536" },
];

// Read more/less text for selected ad preview - no expansion on mobile
const SelectedAdText = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_LIMIT = 80;

  if (!text) return null;

  const shouldTruncate = text.length > CHAR_LIMIT;

  return (
    <div className="relative w-0 min-w-full">
      {/* Mobile: always truncated without read more */}
      {!isExpanded && shouldTruncate ? (
        <>
          <p className="md:hidden text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-line line-clamp-2">
            {text.substring(0, CHAR_LIMIT)}...
          </p>
          <p className="hidden md:block text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-line">
            {text.substring(0, CHAR_LIMIT)}...{' '}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="text-gray-500 hover:text-gray-700 text-xs underline inline"
            >
              read more
            </button>
          </p>
        </>
      ) : (
        <div>
          <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-line">
            {text}
          </p>
          {isExpanded && shouldTruncate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="text-gray-500 hover:text-gray-700 text-xs underline mt-1"
            >
              Read less
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const StepFive = ({ onNext, onGenerate, initialData, setMascotMessageOverride, availableHeight }) => {
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image3, setImage3] = useState(null);
  const [selectedCanvasSize, setSelectedCanvasSize] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAd, setSelectedAd] = useState(initialData?.selectedAd || null);

  const image1InputRef = useRef(null);
  const image2InputRef = useRef(null);
  const image3InputRef = useRef(null);

  useEffect(() => {
    if (setMascotMessageOverride) {
      setMascotMessageOverride("Okay, upload any images you think might help and click Generate!");
    }
  }, [setMascotMessageOverride]);

  // Load saved assets on mount
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const response = await fetch('/ads/api/get-assets-onboarding/');
        const result = await response.json();

        if (result.success && result.data) {
          if (result.data.asset_image_1) setImage1(result.data.asset_image_1);
          if (result.data.asset_image_2) setImage2(result.data.asset_image_2);
          if (result.data.asset_image_3) setImage3(result.data.asset_image_3);
          if (result.data.canvas_size) setSelectedCanvasSize(result.data.canvas_size);
          if (result.data.prompt) setPrompt(result.data.prompt);
          if (result.data.selected_ad) setSelectedAd(result.data.selected_ad);
        }
      } catch (error) {
        console.error('Error loading assets:', error);
      }
    };

    loadAssets();
  }, []);

  // Save function for any field
  const saveToBackend = async (fieldName, value) => {
    try {
      const formData = new FormData();

      if (value instanceof File) {
        formData.append(fieldName, value);
      } else if (value === null) {
        formData.append(fieldName, '');
      } else {
        formData.append(fieldName, value);
      }

      const response = await fetch('/ads/api/save-assets-onboarding/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Failed to save:', result.message);
      }
    } catch (error) {
      console.error('Error saving to backend:', error);
    }
  };

  // Image handlers
  const handleImage1Upload = (file) => {
    setImage1(file);
    saveToBackend('asset_image_1', file);
  };
  const handleImage1Delete = () => {
    setImage1(null);
    saveToBackend('asset_image_1', null);
  };

  const handleImage2Upload = (file) => {
    setImage2(file);
    saveToBackend('asset_image_2', file);
  };
  const handleImage2Delete = () => {
    setImage2(null);
    saveToBackend('asset_image_2', null);
  };

  const handleImage3Upload = (file) => {
    setImage3(file);
    saveToBackend('asset_image_3', file);
  };
  const handleImage3Delete = () => {
    setImage3(null);
    saveToBackend('asset_image_3', null);
  };

  // Canvas size handler
  const handleCanvasSizeChange = (sizeId) => {
    setSelectedCanvasSize(sizeId);
    saveToBackend('canvas_size', sizeId);
  };

  // Prompt handler (on blur)
  const handlePromptBlur = () => {
    saveToBackend('prompt', prompt);
  };

  // Handle Generate button click
  const handleGenerate = async () => {
    if (!selectedCanvasSize || isGenerating) return;

    setIsGenerating(true);

    // Wait 3 seconds to show spinner, then call onGenerate
    setTimeout(() => {
      if (onGenerate) {
        onGenerate({ canvasSize: selectedCanvasSize, prompt });
      }
    }, 3000);
  };

  return (
    <div className="flex flex-col w-full h-full min-h-0 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 h-full min-h-0 flex flex-col">
        <Card className="w-full shadow-xl bg-background/95 backdrop-blur-sm border-primary/20 flex-1 min-h-0 md:max-h-[500px] flex flex-col">
          <CardContent className="p-3 sm:p-4 md:p-6 flex-1 min-h-0 flex flex-col">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0">
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">Upload... Prompt...</h2>
            </div>

            {/* Content area: config + reference + prompt */}
            <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible flex flex-col gap-2">
              {/* Mobile: All stacked vertically | Desktop: Grid 2 columns */}
              <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-3">
                {/* Left: Image pickers + canvas size */}
                <div className="flex flex-col gap-2 sm:gap-3 flex-shrink-0 md:flex-shrink md:justify-center">
                  {/* Image Uploaders Container */}
                  <div className="border border-border rounded-lg p-2 sm:p-3">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-[280px] mx-auto">
                      <ImageUploader
                        image={image1}
                        onUpload={handleImage1Upload}
                        onDelete={handleImage1Delete}
                        inputRef={image1InputRef}
                      />
                      <ImageUploader
                        image={image2}
                        onUpload={handleImage2Upload}
                        onDelete={handleImage2Delete}
                        inputRef={image2InputRef}
                      />
                      <ImageUploader
                        image={image3}
                        onUpload={handleImage3Upload}
                        onDelete={handleImage3Delete}
                        inputRef={image3InputRef}
                      />
                    </div>
                  </div>

                  {/* Canvas Size Container */}
                  <div className="border border-border rounded-lg p-2 sm:p-3">
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-[280px] mx-auto">
                      {canvasSizes.map((item) => (
                        <button
                          key={item.id}
                          className={`relative aspect-square cursor-pointer rounded-lg p-1.5 flex flex-col items-center justify-center transition-all ${selectedCanvasSize === item.id
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-muted/50 border-2 border-transparent hover:bg-muted"
                            }`}
                          onClick={() => handleCanvasSizeChange(item.id)}
                        >
                          {selectedCanvasSize === item.id && (
                            <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-2 h-2 text-white" />
                            </div>
                          )}

                          {item.id === "1024x1024" && (
                            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-primary/70 rounded mb-0.5"></div>
                          )}
                          {item.id === "1536x1024" && (
                            <div className="w-6 h-3 sm:w-7 sm:h-4 bg-primary/70 rounded mb-0.5"></div>
                          )}
                          {item.id === "1024x1536" && (
                            <div className="w-3 h-6 sm:w-4 sm:h-7 bg-primary/70 rounded mb-0.5"></div>
                          )}

                          <span className="text-[8px] sm:text-[9px] font-medium text-foreground">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Selected ad preview - compact on mobile */}
                {selectedAd && (
                  <div className="flex-shrink-0 md:h-full md:min-h-0 flex items-center justify-center">
                    <Card className="w-full max-w-[200px] md:max-w-none aspect-[3/4] md:max-h-[280px] bg-background rounded-xl border overflow-hidden flex flex-col mx-auto">
                      <CardContent className="p-2 flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
                            {selectedAd.image_url ? (
                              <img
                                src={selectedAd.image_url}
                                alt={selectedAd.page_name || 'Reference ad'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-[10px]">
                                {(selectedAd.page_name || 'Ad').trim().charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <h3 className="text-xs font-semibold break-words line-clamp-1 flex-1">
                            {selectedAd.page_name || 'Reference Ad'}
                          </h3>
                        </div>

                        {(selectedAd.ad_creative_bodies || selectedAd.ad_copy) && (
                          <div className="flex-shrink-0 overflow-hidden">
                            <SelectedAdText text={selectedAd.ad_creative_bodies || selectedAd.ad_copy} />
                          </div>
                        )}

                        {selectedAd.image_url && (
                          <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden">
                            <img
                              src={selectedAd.image_url}
                              alt="Ad Creative"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Row 3: Prompt Input - taller on mobile */}
              <textarea
                className="w-full p-2 sm:p-2.5 bg-muted/30 border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-xs sm:text-sm flex-shrink-0"
                placeholder="Any special requests for your ad? (optional)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onBlur={handlePromptBlur}
                rows={3}
              />
            </div>

            {/* Footer: Generate button bottom-right */}
            <div className="mt-2 sm:mt-3 pb-20 md:pb-0 flex justify-end flex-shrink-0">
              <Button
                onClick={handleGenerate}
                disabled={!selectedCanvasSize || isGenerating}
                className="min-w-[100px]"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StepFive;
