import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../useTranslation";
import ReactDOM from "react-dom/client";
import { AlertNotification } from "../../components/ui/alert-notification";

interface UseImageUploadProps {
  onUpload?: (url: string | null, file?: File | null) => void;
  initialImage?: string | null;
}

// Function to show translated notifications
function showNotification(
  t: (key: string, fallback?: string) => string,
  messageKey: string, 
  fallbackMessage: string, 
  variant: 'info' | 'warning' | 'error' | 'success' = 'info', 
  duration: number = 3000
) {
  // Create notification container
  const notificationContainer = document.createElement('div');
  notificationContainer.id = `notification-${Date.now()}`;
  document.body.appendChild(notificationContainer);
  
  // Create root and render notification
  const notificationRoot = ReactDOM.createRoot(notificationContainer);
  
  // Render AlertNotification component with translated message
  notificationRoot.render(
    React.createElement(AlertNotification, {
      message: t(messageKey, fallbackMessage),
      variant,
      duration,
      onClose: () => {
        // Remove container when notification is closed
        if (notificationContainer.parentNode) {
          notificationContainer.parentNode.removeChild(notificationContainer);
        }
      }
    })
  );
}

export function useImageUpload({ onUpload, initialImage }: UseImageUploadProps = {}) {
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage || null);
  const [fileName, setFileName] = useState<string | null>(initialImage ? 'Preloaded image' : null);
  const { t } = useTranslation();

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Validar que el tipo de archivo sea compatible con gpt-image-1
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          // Show notification instead of alert
          showNotification(
            t,
            'image_upload.unsupported_format',
            'Unsupported format. Please upload a JPG, PNG, or WebP image.',
            'warning'
          );
          
          // Clear input so user can try again
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }
        
        setFileName(file.name);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        previewRef.current = url;
        onUpload?.(url, file);
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
    onUpload?.(null, null);
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
