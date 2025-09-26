import React from 'react';
import { CreditCard } from 'lucide-react';
import { useTranslation } from "../../lib/useTranslation";

/**
 * NoCreditsModal - Modal reutilizable para mostrar cuando el usuario se queda sin créditos
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {function} props.onClose - Función para cerrar el modal
 * @param {string} props.errorMessage - Mensaje de error específico del backend
 */
const NoCreditsModal = ({ isOpen, onClose, errorMessage }) => {
  const { t } = useTranslation();

  // Navigate to billing page
  const handleNavigateToBilling = () => {
    window.location.href = '/ads/billing/';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]"
      style={{ margin: 0, pointerEvents: 'auto' }}
      onClick={onClose} // Close when clicking outside
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 relative z-[100000]"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-xl font-semibold mb-4">
          {t('step_three.no_credits_title', 'No Credits Available')}
        </h2>
        <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
          <CreditCard className="h-6 w-6" />
          <p className="text-gray-600 dark:text-gray-300">
            {errorMessage || t('step_three.no_credits_message', 'You have reached out your image limit creation for your plan')}
          </p>
        </div>
        <div className="flex justify-between">
          <button
            type="button"
            className="px-4 py-2 text-gray-900 dark:text-white rounded-md hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
            style={{ pointerEvents: 'auto' }}
            onClick={onClose}
          >
            {t('step_three.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-600 hover:text-white rounded-md transition-all duration-200 cursor-pointer"
            style={{ pointerEvents: 'auto' }}
            onClick={handleNavigateToBilling}
          >
            {t('step_three.upgrade_plan', 'Upgrade Plan')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoCreditsModal;
