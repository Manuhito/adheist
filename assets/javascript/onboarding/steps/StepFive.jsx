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

const StepFive = ({ onNext, onGenerate, initialData, setMascotMessageOverride }) => {
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image3, setImage3] = useState(null);
  const [selectedCanvasSize, setSelectedCanvasSize] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
    <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
      <div className="w-full max-w-2xl mx-auto px-4 flex flex-col h-full overflow-hidden">
        <Card className="w-full shadow-xl bg-background/95 backdrop-blur-sm border-primary/20">
          <CardContent className="p-6">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Upload... Prompt...</h2>
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

            {/* Row 1: Image Uploaders */}
            <div className="grid grid-cols-3 gap-3 mb-3 max-w-[300px] mx-auto">
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

            {/* Row 2: Canvas Size Selector */}
            <div className="grid grid-cols-3 gap-3 mb-4 max-w-[300px] mx-auto">
              {canvasSizes.map((item) => (
                <button
                  key={item.id}
                  className={`relative aspect-square cursor-pointer rounded-lg p-2 flex flex-col items-center justify-center transition-all ${selectedCanvasSize === item.id
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-muted/50 border-2 border-transparent hover:bg-muted"
                    }`}
                  onClick={() => handleCanvasSizeChange(item.id)}
                >
                  {/* Check icon when selected */}
                  {selectedCanvasSize === item.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}

                  {/* Shape preview */}
                  {item.id === "1024x1024" && (
                    <div className="w-6 h-6 bg-primary/70 rounded mb-1"></div>
                  )}
                  {item.id === "1536x1024" && (
                    <div className="w-8 h-5 bg-primary/70 rounded mb-1"></div>
                  )}
                  {item.id === "1024x1536" && (
                    <div className="w-5 h-8 bg-primary/70 rounded mb-1"></div>
                  )}

                  <span className="text-[10px] font-medium text-foreground">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Row 3: Prompt Input */}
            <textarea
              className="w-full p-3 bg-muted/30 border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground text-sm"
              placeholder="Any special requests for your ad? (optional)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onBlur={handlePromptBlur}
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StepFive;
