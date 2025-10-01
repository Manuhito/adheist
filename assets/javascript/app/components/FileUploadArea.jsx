import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * Reusable file upload area component with drag & drop support
 * Matches the exact implementation from brand-assets-detail.jsx
 * @param {Array} selectedFiles - Array of selected files
 * @param {Function} setSelectedFiles - Function to update selected files
 */
export function FileUploadArea({ selectedFiles, setSelectedFiles }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border border-dashed rounded-lg p-6 transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5 dark:bg-primary/10' 
            : 'border-gray-200 hover:border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
        } ${selectedFiles.length > 0 ? '' : 'text-center'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFiles.length === 0 ? (
          // Vertical layout when no files selected
          <>
            {/* Plus Icon in Container */}
            <div 
              className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-600 border border-dashed border-gray-300 dark:border-gray-500 rounded-lg flex items-center justify-center mb-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <Plus className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
            
            <p className="text-lg text-gray-900 dark:text-gray-100 mb-2">
              Choose images or drag & drop it here.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              JPG, JPEG, PNG and WEBP. Max 20 MB.
            </p>
          </>
        ) : (
          // Horizontal layout when files are selected
          <div className="flex items-center gap-4">
            {/* Plus Icon in Container */}
            <div 
              className="w-12 h-12 bg-gray-100 dark:bg-gray-600 border border-dashed border-gray-300 dark:border-gray-500 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors flex-shrink-0"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <Plus className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
            
            <div className="flex-1">
              <p className="text-base text-gray-900 dark:text-gray-100 mb-1">
                Choose images or drag & drop it here.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                JPG, JPEG, PNG and WEBP. Max 20 MB.
              </p>
            </div>
          </div>
        )}
        
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Selected Files ({selectedFiles.length})
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay with trash icon */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => removeFile(index)}
                      className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
