import { useCallback, useEffect, useRef, useState } from "react";

interface UseImageUploadProps {
  onUpload?: (url: string | null) => void;
  initialImage?: string | null;
}

export function useImageUpload({ onUpload, initialImage }: UseImageUploadProps = {}) {
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage || null);
  const [fileName, setFileName] = useState<string | null>(initialImage ? 'Preloaded image' : null);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setFileName(file.name);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        previewRef.current = url;
        onUpload?.(url);
      }
    },
    [onUpload],
  );

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileName(null);
    previewRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Call onUpload with null to indicate the image should be deleted
    onUpload?.(null);
  }, [previewUrl, onUpload]);

  // Initialize with initialImage if provided
  useEffect(() => {
    if (initialImage && !previewUrl) {
      setPreviewUrl(initialImage);
      setFileName('Preloaded image');
      // Don't call onUpload here as this is just initializing with existing data
    }
  }, [initialImage]);

  useEffect(() => {
    return () => {
      if (previewRef.current && !initialImage) {
        // Only revoke if it's a blob URL (not an initialImage URL)
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, [initialImage]);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  };
}
