import React, { useState, useRef, useEffect } from 'react';
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
const CreateBrandModal = ({ isOpen, onClose, onBrandCreated, onBrandUpdated, adRequestId = null, editingBrand = null }) => {
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
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [createdBrandId, setCreatedBrandId] = useState(null);

  // Effect to preload data when editing a brand
  useEffect(() => {
    if (editingBrand) {
      // Fetch the complete brand data including AdRequestAssets
      const fetchBrandData = async () => {
        try {
          const response = await fetch(`/ads/api/brand-details/${editingBrand.id}/`);
          const data = await response.json();
          
          if (data.success && data.brand) {
            const brand = data.brand;
            setBrandName(brand.name || '');
            setIndustry(brand.industry || '');
            setWebsite(brand.website || '');
            setProductDescription(brand.product_description || '');
            setTargetAudience(brand.target_audience || '');
            setToneOfVoice(brand.tone_of_voice || '');
            setFontDirection(brand.font_direction || '');
            setCoreFeatures(brand.core_features || '');
            setFunctionalBenefits(brand.functional_benefits || '');
            setEmotionalBenefits(brand.emotional_lifestyle_benefits || '');
            setProofPoints(brand.proof_points || '');
            setValuePropositions(brand.value_propositions || '');
            setBrandColors(brand.brand_colors || []);
            
            // Set the created brand ID for update mode
            setCreatedBrandId(editingBrand.id);
            
            // Set logo if available
            if (brand.logo_url) {
              setSelectedLogoData({
                url: brand.logo_url,
                file: null
              });
            }
          }
        } catch (error) {
          console.error('Error fetching brand data:', error);
        }
      };
      
      fetchBrandData();
    } else {
      // Reset form when not editing
      setBrandName('');
      setIndustry('');
      setWebsite('');
      setProductDescription('');
      setTargetAudience('');
      setToneOfVoice('');
      setFontDirection('');
      setCoreFeatures('');
      setFunctionalBenefits('');
      setEmotionalBenefits('');
      setProofPoints('');
      setValuePropositions('');
      setBrandColors([]);
      setCreatedBrandId(null);
      setSelectedLogoData(null);
    }
  }, [editingBrand]);

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

  const handleWebsiteUrlChange = (e) => {
    setWebsiteUrl(e.target.value);
    if (analysisError) setAnalysisError('');
  };

  // Function to analyze website and populate form fields
  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl.trim()) {
      setAnalysisError('Please enter a website URL');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const formData = new FormData();
      formData.append('website_url', websiteUrl.trim());
      if (adRequestId) {
        formData.append('ad_request_id', adRequestId);
      }

      const response = await fetch('/ads/api/analyze-website/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze website');
      }

      if (data.success && data.extracted_assets) {
        const assets = data.extracted_assets;
        
        // Populate form fields with extracted data
        if (assets.brand_name) setBrandName(assets.brand_name);
        if (assets.industry) setIndustry(assets.industry);
        if (assets.product_description) setProductDescription(assets.product_description);
        if (assets.target_audience) setTargetAudience(assets.target_audience);
        if (assets.tone_of_voice) setToneOfVoice(assets.tone_of_voice);
        if (assets.core_features) setCoreFeatures(assets.core_features);
        if (assets.functional_benefits) setFunctionalBenefits(assets.functional_benefits);
        if (assets.emotional_benefits) setEmotionalBenefits(assets.emotional_benefits);
        if (assets.proof_points) setProofPoints(assets.proof_points);
        if (assets.value_propositions) setValuePropositions(assets.value_propositions);
        
        // Handle brand colors if they exist
        if (assets.brand_colors && Array.isArray(assets.brand_colors)) {
          const validColors = assets.brand_colors.filter(color => 
            color && typeof color === 'string' && color.startsWith('#')
          );
          setBrandColors(validColors);
        }

        // Set website field to the analyzed URL
        setWebsite(websiteUrl.trim());

        // Check if a brand was automatically created
        if (data.brand_created && data.brand) {
          console.log('Website analysis completed and brand created automatically:', data.brand.name);
          
          // Notify parent component about the new brand
          if (onBrandCreated) {
            onBrandCreated(data.brand);
          }
          
          // Show success message but keep modal open
          // Create a temporary notification container
          const notificationContainer = document.createElement('div');
          document.body.appendChild(notificationContainer);
          
          // Import and render AlertNotification
          import('@/components/ui/alert-notification.tsx').then(({ AlertNotification }) => {
            const { createRoot } = require('react-dom/client');
            const root = createRoot(notificationContainer);
            
            root.render(
              React.createElement(AlertNotification, {
                variant: 'success',
                message: `Brand "${data.brand.name}" has been created and associated with your ad request. You can now edit the details below.`,
                duration: 7000,
                onClose: () => {
                  root.unmount();
                  document.body.removeChild(notificationContainer);
                }
              })
            );
          });
          
          // Store the created brand ID for later updates
          setCreatedBrandId(data.brand.id);
          
          // Don't close modal - let user edit the created brand
          console.log('Brand created successfully - modal remains open for editing');
          return; // Exit early since brand was created
        } else if (data.brand_created === false && data.brand_creation_error) {
          console.warn('Brand creation failed:', data.brand_creation_error);
          // Continue with form population even if brand creation failed
        }

        console.log('Website analysis completed successfully - form populated');
      } else {
        throw new Error('No data extracted from website');
      }

    } catch (err) {
      console.error('Website analysis error:', err);
      setAnalysisError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
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
      // Prepare form data for submission
      const formData = {
        brand_name: brandName.trim(),
        industry: industry.trim(),
        website: website.trim(),
        product_description: productDescription.trim(),
        target_audience: targetAudience.trim(),
        functional_benefits: functionalBenefits.trim(),
        brand_colors: brandColors,
        tone_of_voice: toneOfVoice.trim(),
        font_direction: fontDirection.trim(),
        core_features: coreFeatures.trim(),
        emotional_lifestyle_benefits: emotionalBenefits.trim(),
        proof_points: proofPoints.trim(),
        value_propositions: valuePropositions.trim()
      };

      let response;
      
      // Determine if we're creating or updating
      const isUpdating = createdBrandId !== null;
      const endpoint = isUpdating ? `/ads/api/update-user-brand/${createdBrandId}/` : '/ads/api/create-user-brand/';
      
      // Check if we need to handle logo changes
      const hasNewLogoFile = selectedLogoData && selectedLogoData.file;
      const shouldRemoveLogo = isUpdating && !selectedLogoData; // In edit mode, null means remove logo
      
      // Debug logs
      console.log('=== LOGO DEBUG ===');
      console.log('isUpdating:', isUpdating);
      console.log('selectedLogoData:', selectedLogoData);
      console.log('hasNewLogoFile:', hasNewLogoFile);
      console.log('shouldRemoveLogo:', shouldRemoveLogo);
      
      // If there's a logo file or we need to remove logo, use FormData for multipart upload
      if (hasNewLogoFile || shouldRemoveLogo) {
        const formDataMultipart = new FormData();
        
        // Add all text fields
        Object.keys(formData).forEach(key => {
          if (key === 'brand_colors') {
            formDataMultipart.append(key, JSON.stringify(formData[key]));
          } else {
            formDataMultipart.append(key, formData[key]);
          }
        });
        
        // Handle logo changes
        if (hasNewLogoFile) {
          // Add new logo file
          console.log('Adding logo file to FormData:', selectedLogoData.file);
          formDataMultipart.append('logo_file', selectedLogoData.file);
        } else if (shouldRemoveLogo) {
          // Signal to remove logo
          console.log('Adding remove_logo flag to FormData');
          formDataMultipart.append('remove_logo', 'true');
        }
        
        // Debug FormData contents
        console.log('FormData entries:');
        for (let [key, value] of formDataMultipart.entries()) {
          console.log(`${key}:`, value);
        }

        // Use POST for multipart data (PUT can have issues with multipart)
        const multipartEndpoint = isUpdating ? `/ads/api/update-user-brand/${createdBrandId}/` : '/ads/api/create-user-brand/';
        
        response = await fetch(multipartEndpoint, {
          method: 'POST', // Always use POST for multipart data
          headers: {
            'X-CSRFToken': getCsrfToken(),
            // Add a custom header to indicate this is an update
            ...(isUpdating && { 'X-Update-Mode': 'true' })
          },
          body: formDataMultipart,
        });
      } else {
        // No logo file, use JSON
        response = await fetch(endpoint, {
          method: isUpdating ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify(formData),
        });
      }

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
      setWebsiteUrl('');
      setAnalysisError('');
      setCreatedBrandId(null);
      
      // Call appropriate callback based on operation type
      if (isUpdating && onBrandUpdated) {
        onBrandUpdated(data.brand);
      } else if (!isUpdating && onBrandCreated) {
        onBrandCreated(data.brand);
      }
      
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
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <DialogTitle className="text-gray-900 dark:text-gray-100">{editingBrand ? 'Edit Brand' : 'Create Brand'}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {/* Website Analysis Section - Only show when creating new brand */}
          {!editingBrand && (
            <div className="space-y-3 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Analyze your brand website to generate the fields below{' '}
              <span className="text-primary dark:text-primary">(4 Credits)</span>
            </p>

            {/* Website URL Input with Generate Button */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
                <Input
                  placeholder="Website URL"
                  className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  value={websiteUrl}
                  onChange={handleWebsiteUrlChange}
                  disabled={isSubmitting || isAnalyzing}
                />
              </div>
              <Button
                variant="default"
                className="px-6"
                onClick={handleAnalyzeWebsite}
                disabled={isSubmitting || isAnalyzing || !websiteUrl.trim()}
              >
                {isAnalyzing ? 'Analyzing...' : 'Generate'}
              </Button>
            </div>
            
            {/* Analysis Error Display */}
            {analysisError && (
              <div className="text-sm text-red-500 dark:text-red-400 mt-2">
                {analysisError}
              </div>
            )}
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">

              {/* Brand Logo Section */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
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
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('brand.name', 'Brand Name')}
                </p>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={handleBrandNameChange}
                  placeholder={t('brand.name_placeholder', 'Brand name')}
                  disabled={isSubmitting}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
                {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
              </div>

              {/* Industry/Vertical Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Industry/Vertical
                </p>
                <Input
                  id="industry"
                  value={industry}
                  onChange={handleIndustryChange}
                  placeholder="Industry/Vertical"
                  disabled={isSubmitting}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>

              {/* Website Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Website
                </p>
                <Input
                  id="website"
                  value={website}
                  onChange={handleWebsiteChange}
                  placeholder="Website"
                  disabled={isSubmitting}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>

              {/* Product/Service Description Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Product/Service description
                </p>
                <textarea
                  id="productDescription"
                  value={productDescription}
                  onChange={handleProductDescriptionChange}
                  placeholder="Outline the product range and services provided by the brand."
                  disabled={isSubmitting}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Target Audience Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Target audience (optional)
                </p>
                <textarea
                  id="targetAudience"
                  value={targetAudience}
                  onChange={handleTargetAudienceChange}
                  placeholder="Description of the target audience"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Functional Benefits Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Functional Benefits
                </p>
                <textarea
                  id="functionalBenefits"
                  value={functionalBenefits}
                  onChange={handleFunctionalBenefitsChange}
                  placeholder="Functional Benefits"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
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
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Tone of Voice
                </p>
                <Input
                  id="toneOfVoice"
                  value={toneOfVoice}
                  onChange={handleToneOfVoiceChange}
                  placeholder="Tone of Voice"
                  disabled={isSubmitting}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>

              {/* Font Direction Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Font Direction
                </p>
                <Input
                  id="fontDirection"
                  value={fontDirection}
                  onChange={handleFontDirectionChange}
                  placeholder="Font Direction"
                  disabled={isSubmitting}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>

              {/* Core Features Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Core Features
                </p>
                <textarea
                  id="coreFeatures"
                  value={coreFeatures}
                  onChange={handleCoreFeaturesChange}
                  placeholder="Core Features"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>


              {/* Emotional/Lifestyle Benefits Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Emotional/Lifestyle Benefits
                </p>
                <textarea
                  id="emotionalBenefits"
                  value={emotionalBenefits}
                  onChange={handleEmotionalBenefitsChange}
                  placeholder="Emotional/Lifestyle Benefits"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Proof Points Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Proof Points
                </p>
                <textarea
                  id="proofPoints"
                  value={proofPoints}
                  onChange={handleProofPointsChange}
                  placeholder="Proof Points"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Value Propositions Field */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Value Propositions
                </p>
                <textarea
                  id="valuePropositions"
                  value={valuePropositions}
                  onChange={handleValuePropositionsChange}
                  placeholder="Value Propositions"
                  disabled={isSubmitting}
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
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
            className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common.saving', 'Saving...') : (createdBrandId ? t('common.update', 'Update') : t('common.save', 'Save'))}
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
