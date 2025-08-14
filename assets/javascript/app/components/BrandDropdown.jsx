import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectValue, 
  SelectTrigger, 
  SelectItem, 
  SelectPopover, 
  SelectListBox 
} from '../../components/ui/select.tsx';
import { Label } from '../../components/ui/field';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Brand dropdown component for selecting a brand
 * Fetches brands from API and allows selection
 */
const BrandDropdown = ({ initialBrandId, onBrandChange }) => {
  const { t } = useTranslation();
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState(initialBrandId ? initialBrandId.toString() : null);
  const [error, setError] = useState(null);

  // Fetch brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/ads/api/user-brands/');
        if (!response.ok) {
          throw new Error(`Error fetching brands: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.brands)) {
          setBrands(data.brands);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching brands:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, []);
  
  // Update selectedBrand when initialBrandId changes
  useEffect(() => {
    if (initialBrandId) {
      setSelectedBrand(initialBrandId.toString());
    }
  }, [initialBrandId]);

  // Handle brand selection
  const handleBrandChange = (brandId) => {
    setSelectedBrand(brandId);
    if (onBrandChange) {
      // Find the selected brand object
      const selectedBrandObj = brands.find(brand => brand.id.toString() === brandId);
      onBrandChange(selectedBrandObj);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full mb-6">
        <Label>{t('step_two.brand', 'Brand')}</Label>
        <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center text-gray-400">
          {t('step_two.loading_brands', 'Loading brands...')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mb-6">
        <Label>{t('step_two.brand', 'Brand')}</Label>
        <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center text-red-500">
          {t('step_two.error_loading_brands', 'Error loading brands')}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Select 
        selectedKey={selectedBrand} 
        onSelectionChange={handleBrandChange}
        placeholder={t('step_two.select_brand', 'Select a brand')}
      >
        <Label>{t('step_two.brand', 'Brand')}</Label>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectPopover>
          <SelectListBox>
            {brands.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">
                {t('step_two.no_brands', 'No brands available')}
              </div>
            ) : (
              brands.map(brand => (
                <SelectItem key={brand.id} id={brand.id.toString()}>
                  {brand.name}
                </SelectItem>
              ))
            )}
          </SelectListBox>
        </SelectPopover>
      </Select>
    </div>
  );
};

export default BrandDropdown;
