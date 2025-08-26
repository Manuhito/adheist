import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Check, ChevronDown, Building } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(null);

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

  // When popover opens, measure trigger width to match content width
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      setContentWidth(triggerRef.current.offsetWidth);
    }
  }, [isOpen]);

  // Handle brand selection
  const handleSelectBrand = (brand) => {
    setIsOpen(false);
    // If clicking on the already selected brand, deselect it
    if (selectedBrand === brand.id.toString()) {
      setSelectedBrand(null);
      if (onBrandChange) {
        onBrandChange(null);
      }
    } else {
      // Otherwise select the new brand
      setSelectedBrand(brand.id.toString());
      if (onBrandChange) {
        onBrandChange(brand);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full mb-6">
        <label className="text-sm font-medium block mb-2">{t('step_two.brand', 'Brand')}</label>
        <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center text-gray-400">
          {t('step_two.loading_brands', 'Loading brands...')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mb-6">
        <label className="text-sm font-medium block mb-2">{t('step_two.brand', 'Brand')}</label>
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

  // Get selected brand name for display
  const getSelectedBrandName = () => {
    if (!selectedBrand) return null;
    const brand = brands.find(b => b.id.toString() === selectedBrand);
    return brand ? brand.name : null;
  };

  return (
    <div className="w-full">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-sm font-medium block mb-2">{t('step_two.brand', 'Brand')}</label>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isOpen}
                ref={triggerRef}
                className="w-full justify-between bg-background px-3 py-2 text-sm font-normal h-10"
                onClick={brands.length === 0 ? () => setIsModalOpen(true) : undefined}
              >
                <span className={!getSelectedBrandName() ? "text-muted-foreground flex items-center" : ""}>
                  {getSelectedBrandName() || (
                    <>
                      <Building className="h-4 w-4 mr-2" />
                      {brands.length === 0 
                        ? t('step_two.no_brands_click_to_create', 'No brands available - Click to create one')
                        : t('step_two.select_brand', 'Select a brand')
                      }
                    </>
                  )}
                </span>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 text-muted-foreground/80"
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 overflow-hidden"
              align="start"
              style={contentWidth ? { width: `${contentWidth}px` } : undefined}
            >
              <div className="max-h-60 overflow-auto p-1 outline-none [clip-path:inset(0_0_0_0_round_calc(var(--radius)-2px))]">
                {brands.length === 0 ? (
                  <div 
                    className="px-2 py-1.5 text-sm text-center cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setIsOpen(false);
                      setIsModalOpen(true);
                    }}
                  >
                    {t('step_two.no_brands_click_to_create', 'No brands available - Click to create one')}
                  </div>
                ) : (
                  <div className="py-2">
                    {brands.map((brand) => (
                      <div
                        key={brand.id}
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                        onClick={() => handleSelectBrand(brand)}
                      >
                        <span>{brand.name}</span>
                        {selectedBrand === brand.id.toString() && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
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
