import React, { useEffect, useState, useRef } from "react";
import { Alert } from "./alert";
import { AlertCircle, X } from "lucide-react";

interface AlertNotificationProps {
  message: string;
  variant?: "warning" | "error" | "success" | "info";
  duration?: number; // Duration in milliseconds
  onClose?: () => void;
}

export const AlertNotification: React.FC<AlertNotificationProps> = ({
  message,
  variant = "info",
  duration = 5000, // Default 5 seconds
  onClose,
}) => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Set up the timer for closing the notification
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    // Set up progress bar animation
    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
        }
      }
    };

    // Update progress every 16ms (roughly 60fps)
    progressIntervalRef.current = window.setInterval(updateProgress, 16);

    return () => {
      clearTimeout(timer);
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, [duration, onClose]);

  if (!visible) return null;

  // Map variant to icon color
  const iconColorMap = {
    warning: "text-amber-500",
    error: "text-red-500",
    success: "text-emerald-500",
    info: "text-blue-500",
  };
  
  // Get progress bar color based on variant
  const getProgressBarColor = (variant: string) => {
    switch (variant) {
      case "warning":
        return "bg-amber-500";
      case "error":
        return "bg-red-500";
      case "success":
        return "bg-emerald-500";
      case "info":
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
      <Alert
        layout="row"
        isNotification
        variant={variant}
        icon={
          <AlertCircle 
            className={iconColorMap[variant]} 
            size={16} 
            strokeWidth={2} 
          />
        }
        action={
          <button
            className="group -my-1.5 -me-2 size-8 p-0 hover:bg-transparent"
            aria-label="Close notification"
            onClick={() => {
              setVisible(false);
              if (onClose) onClose();
            }}
          >
            <X
              size={16}
              strokeWidth={2}
              className="opacity-60 transition-opacity group-hover:opacity-100"
            />
          </button>
        }
      >
        <div className="flex flex-col w-full relative">
          <p className="text-sm mb-1">{message}</p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div 
              className={`h-full ${getProgressBarColor(variant)} transition-all ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Alert>
    </div>
  );
};
