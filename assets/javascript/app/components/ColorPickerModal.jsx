import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Modal component for selecting brand colors
 */
const ColorPickerModal = ({ isOpen, onClose, onAddColor }) => {
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState('');
  const [colorError, setColorError] = useState(false);

  // Handle color change (similar to StepTwoComponent)
  const handleColorChange = (e) => {
    let newValue = e.target.value;
    
    // Ensure the value starts with # if it's not empty
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }
    
    // Always update the state to allow editing
    setSelectedColor(newValue);
    
    // Basic validation for hex color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const isValidHex = hexColorRegex.test(newValue) || newValue === '#' || newValue === '';
    
    setColorError(!isValidHex);
  };

  const handleAddColor = () => {
    if (selectedColor && !colorError && selectedColor !== '#') {
      onAddColor(selectedColor);
      setSelectedColor('');
      setColorError(false);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedColor('');
    setColorError(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle>Add Brand Color</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            {/* Color Input Section */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Brand color
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Enter a hex color that represents your brand identity
              </p>
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500 text-sm">#</span>
                  </div>
                  <Input
                    id="brandColor"
                    type="text"
                    placeholder="Enter hex color (e.g. FF5500)"
                    value={selectedColor.replace('#', '')}
                    onChange={handleColorChange}
                    className={`w-full pl-6 ${colorError ? 'border-red-500' : ''}`}
                  />
                </div>
                {colorError && (
                  <p className="text-xs text-red-500 mt-1">
                    Please enter a valid hex color code (e.g. FF5500)
                  </p>
                )}
                {selectedColor && !colorError && (
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-md border"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <span className="text-xs">{selectedColor}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddColor}
            disabled={!selectedColor || colorError || selectedColor === '#'}
          >
            Add Color
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColorPickerModal;
