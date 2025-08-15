import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.jsx';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Modal component for creating a new brand
 */
const CreateBrandModal = ({ isOpen, onClose, onBrandCreated }) => {
  const { t } = useTranslation();
  const [brandName, setBrandName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBrandNameChange = (e) => {
    setBrandName(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async () => {
    // Validate input
    if (!brandName.trim()) {
      setError(t('brand.name_required', 'Brand name is required'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/ads/api/create-user-brand/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ brand_name: brandName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('brand.creation_failed', 'Failed to create brand'));
      }

      // Reset form and close modal
      setBrandName('');
      onBrandCreated(data.brand);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to get CSRF token from cookies
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('brand.create_new', 'Create New Brand')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="brandName" className="text-sm font-medium">
                {t('brand.name', 'Brand Name')}
              </label>
              <Input
                id="brandName"
                value={brandName}
                onChange={handleBrandNameChange}
                placeholder={t('brand.name_placeholder', 'Enter brand name')}
                disabled={isSubmitting}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBrandModal;
