import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Globe, Plus, X } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';
import { LogoImageUploader } from './LogoImageUploader.jsx';
import ColorPickerModal from './ColorPickerModal.jsx';

/**
 * Modal component for creating a new brand
 */
const CreateBrandModal = ({ isOpen, onClose, onBrandCreated }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandColors, setBrandColors] = useState([]);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [fontDirection, setFontDirection] = useState('');
  const [coreFeatures, setCoreFeatures] = useState('');
  const [functionalBenefits, setFunctionalBenefits] = useState('');
  const [emotionalBenefits, setEmotionalBenefits] = useState('');
  const [proofPoints, setProofPoints] = useState('');
  const [valuePropositions, setValuePropositions] = useState('');
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [selectedLogoData, setSelectedLogoData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBrandNameChange = (e) => {
    setBrandName(e.target.value);
    if (error) setError('');
  };

  const handleIndustryChange = (e) => {
    setIndustry(e.target.value);
    if (error) setError('');
  };

  const handleWebsiteChange = (e) => {
    setWebsite(e.target.value);
    if (error) setError('');
  };

  const handleProductDescriptionChange = (e) => {
    setProductDescription(e.target.value);
    if (error) setError('');
  };

  const handleTargetAudienceChange = (e) => {
    setTargetAudience(e.target.value);
    if (error) setError('');
  };

  const handleToneOfVoiceChange = (e) => {
    setToneOfVoice(e.target.value);
    if (error) setError('');
  };

  const handleFontDirectionChange = (e) => {
    setFontDirection(e.target.value);
    if (error) setError('');
  };

  const handleCoreFeaturesChange = (e) => {
    setCoreFeatures(e.target.value);
    if (error) setError('');
  };

  const handleFunctionalBenefitsChange = (e) => {
    setFunctionalBenefits(e.target.value);
    if (error) setError('');
  };

  const handleEmotionalBenefitsChange = (e) => {
    setEmotionalBenefits(e.target.value);
    if (error) setError('');
  };

  const handleProofPointsChange = (e) => {
    setProofPoints(e.target.value);
    if (error) setError('');
  };

  const handleValuePropositionsChange = (e) => {
    setValuePropositions(e.target.value);
    if (error) setError('');
  };

  // Handle adding a new color
  const handleAddColor = (color) => {
    if (color && !brandColors.includes(color)) {
      setBrandColors([...brandColors, color]);
    }
  };

  // Handle removing a color
  const handleRemoveColor = (colorToRemove) => {
    setBrandColors(brandColors.filter(color => color !== colorToRemove));
  };

  // Handle opening color modal
  const handleOpenColorModal = () => {
    setIsColorModalOpen(true);
  };

  // Handle closing color modal
  const handleCloseColorModal = () => {
    setIsColorModalOpen(false);
  };

  // Handle logo selection - opens file explorer directly
  const handleLogoSelect = (logoData) => {
    console.log('Logo selection triggered:', logoData);

    // Trigger the hidden file input to open file explorer
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle logo deletion
  const handleLogoDelete = (logoData) => {
    // Clean up the temporary URL to free memory
    if (selectedLogo && selectedLogo.startsWith('blob:')) {
      URL.revokeObjectURL(selectedLogo);
    }

    setSelectedLogo(null);
    setSelectedLogoData(null);
    console.log('Logo deleted:', logoData);
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

  // Handle file selection when user selects a logo file (store locally, don't upload yet)
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Create a temporary URL for preview
      const previewUrl = URL.createObjectURL(file);

      // Extract file information
      const fileInfo = {
        file: file, // Store the actual file for later upload
        original_filename: file.name,
        file_size: file.size,
        canvas_width: null,
        canvas_height: null,
        canvas_size: null,
        url: previewUrl // Temporary URL for preview
      };

      // Try to extract image dimensions
      const img = new Image();
      img.onload = function () {
        fileInfo.canvas_width = this.width;
        fileInfo.canvas_height = this.height;
        fileInfo.canvas_size = `${this.width}x${this.height}`;

        // Update state with complete file info
        setSelectedLogoData(fileInfo);
        console.log('Logo file selected:', fileInfo);
      };
      img.onerror = function () {
        // If can't load image, still store the file info without dimensions
        console.warn('Could not extract logo dimensions');
        setSelectedLogoData(fileInfo);
      };
      img.src = previewUrl;

      // Set the preview URL immediately
      setSelectedLogo(previewUrl);

      console.log('Logo file prepared for upload:', file.name);
    } catch (error) {
      console.error('Error processing logo file:', error);
      setError('Error processing logo file. Please try again.');
    }
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

      // Clean up temporary URL
      if (selectedLogo && selectedLogo.startsWith('blob:')) {
        URL.revokeObjectURL(selectedLogo);
      }

      // Reset form and close modal
      setBrandName('');
      setIndustry('');
      setWebsite('');
      setProductDescription('');
      setTargetAudience('');
      setBrandColors([]);
      setToneOfVoice('');
      setFontDirection('');
      setCoreFeatures('');
      setFunctionalBenefits('');
      setEmotionalBenefits('');
      setProofPoints('');
      setValuePropositions('');
      setSelectedLogo(null);
      setSelectedLogoData(null);
      onBrandCreated(data.brand);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle>Create Brand</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {/* Website Analysis Section - Full Width */}
          <div className="space-y-3 mb-6">
            <p className="text-sm text-gray-600">
              Analyze your brand website to generate the fields below{' '}
              <span className="text-primary">(4 Credits)</span>
            </p>

            {/* Website URL Input with Generate Button */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  placeholder="Website URL"
                  className="pl-9 bg-gray-50 border-gray-200"
                  disabled={isSubmitting}
                />
              </div>
              <Button
                variant="default"
                className="px-6"
                disabled={isSubmitting}
              >
                Generate
              </Button>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">

              {/* Brand Logo Section */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Brand logo
                </p>
                <LogoImageUploader
                  onSelectImage={handleLogoSelect}
                  onDeleteImage={handleLogoDelete}
                  selectedImage={selectedLogo}
                  selectedImageData={selectedLogoData}
                  onFileSelect={handleFileUpload}
                />
              </div>

              {/* Brand Name Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {t('brand.name', 'Brand Name')}
                </p>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={handleBrandNameChange}
                  placeholder={t('brand.name_placeholder', 'Brand name')}
                  disabled={isSubmitting}
                />
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>

              {/* Industry/Vertical Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Industry/Vertical
                </p>
                <Input
                  id="industry"
                  value={industry}
                  onChange={handleIndustryChange}
                  placeholder="Industry/Vertical"
                  disabled={isSubmitting}
                />
              </div>

              {/* Website Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Website
                </p>
                <Input
                  id="website"
                  value={website}
                  onChange={handleWebsiteChange}
                  placeholder="Website"
                  disabled={isSubmitting}
                />
              </div>

              {/* Product/Service Description Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Product/Service description
                </p>
                <textarea
                  id="productDescription"
                  value={productDescription}
                  onChange={handleProductDescriptionChange}
                  placeholder="Outline the product range and services provided by the brand."
                  disabled={isSubmitting}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Target Audience Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Target audience (optional)
                </p>
                <textarea
                  id="targetAudience"
                  value={targetAudience}
                  onChange={handleTargetAudienceChange}
                  placeholder="Description of the target audience"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Functional Benefits Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Functional Benefits
                </p>
                <textarea
                  id="functionalBenefits"
                  value={functionalBenefits}
                  onChange={handleFunctionalBenefitsChange}
                  placeholder="Functional Benefits"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Brand Colors Section */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Brand colors
                </p>

                {/* Add Color Button */}
                <div
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={handleOpenColorModal}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md">
                    <Plus className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Add brand color</span>
                </div>

                {/* Color Cards */}
                {brandColors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {brandColors.map((color, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md w-fit">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-6 w-6 rounded-md border border-gray-300 dark:border-gray-600"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{color}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveColor(color)}
                          disabled={isSubmitting}
                          className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tone of Voice Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Tone of Voice
                </p>
                <Input
                  id="toneOfVoice"
                  value={toneOfVoice}
                  onChange={handleToneOfVoiceChange}
                  placeholder="Tone of Voice"
                  disabled={isSubmitting}
                />
              </div>

              {/* Font Direction Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Font Direction
                </p>
                <Input
                  id="fontDirection"
                  value={fontDirection}
                  onChange={handleFontDirectionChange}
                  placeholder="Font Direction"
                  disabled={isSubmitting}
                />
              </div>

              {/* Core Features Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Core Features
                </p>
                <textarea
                  id="coreFeatures"
                  value={coreFeatures}
                  onChange={handleCoreFeaturesChange}
                  placeholder="Core Features"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>


              {/* Emotional/Lifestyle Benefits Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Emotional/Lifestyle Benefits
                </p>
                <textarea
                  id="emotionalBenefits"
                  value={emotionalBenefits}
                  onChange={handleEmotionalBenefitsChange}
                  placeholder="Emotional/Lifestyle Benefits"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Proof Points Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Proof Points
                </p>
                <textarea
                  id="proofPoints"
                  value={proofPoints}
                  onChange={handleProofPointsChange}
                  placeholder="Proof Points"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Value Propositions Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Value Propositions
                </p>
                <textarea
                  id="valuePropositions"
                  value={valuePropositions}
                  onChange={handleValuePropositionsChange}
                  placeholder="Value Propositions"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
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

      {/* Hidden file input for logo upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />

      {/* Color Picker Modal */}
      <ColorPickerModal
        isOpen={isColorModalOpen}
        onClose={handleCloseColorModal}
        onAddColor={handleAddColor}
      />
    </Dialog>
  );
};

export default CreateBrandModal;
