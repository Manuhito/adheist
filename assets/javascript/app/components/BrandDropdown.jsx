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
import { Button } from '../../components/ui/button.tsx';
import { useTranslation } from '../../lib/useTranslation';
import CreateBrandModal from './CreateBrandModal.jsx';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Handle brand creation success
  const handleBrandCreated = (newBrand) => {
    // Add the new brand to the list
    setBrands([...brands, newBrand]);
    
    // Select the newly created brand and trigger the same update process
    // as when a user selects a brand from the dropdown
    setSelectedBrand(newBrand.id.toString());
    
    if (onBrandChange) {
      // Call onBrandChange with the new brand object to trigger the update process
      onBrandChange(newBrand);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select 
            selectedKey={selectedBrand} 
            onSelectionChange={handleBrandChange}
            placeholder={t('step_two.select_brand', 'Select a brand')}
          >
            <Label>{t('step_two.brand', 'Brand')}</Label>
            <SelectTrigger 
              onClick={brands.length === 0 ? () => setIsModalOpen(true) : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPopover>
              <SelectListBox>
                {brands.length === 0 ? (
                  <div 
                    className="p-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => setIsModalOpen(true)}
                  >
                    {t('step_two.no_brands_click_to_create', 'No brands available - Click to create one')}
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
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10" 
          onClick={() => setIsModalOpen(true)}
          title={t('brand.create_new', 'Create New Brand')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
          </svg>
          <span className="sr-only">{t('brand.create_new', 'Create New Brand')}</span>
        </Button>
      </div>
      
      {/* Modal for creating a new brand */}
      <CreateBrandModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onBrandCreated={handleBrandCreated}
      />
    </div>
  );
};

export default BrandDropdown;
