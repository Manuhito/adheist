import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  // Map variant to icon color
  const iconColorMap = {
    warning: "text-amber-500",
    error: "text-red-500",
    success: "text-emerald-500",
    info: "text-blue-500",
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
        <p className="text-sm">{message}</p>
      </Alert>
    </div>
  );
};
