/**
 * Image Upload Component
 * Handles image upload with asset management, preview, and optimization
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from '../ui/Card.js';
import { GlassButton, GlassIconButton } from '../ui/Button.js';
import { GlassInput, GlassLabel, GlassFormGroup, GlassErrorMessage, GlassHelpText } from '../ui/Input.js';

/**
 * Image Upload Component
 * @param {Object} props
 * @param {string|File} props.value - Current image value (URL or File)
 * @param {Function} props.onChange - Change handler
 * @param {string} props.label - Field label
 * @param {boolean} props.required - Required field
 * @param {string} props.error - Error message
 * @param {string} props.helpText - Help text
 * @param {Array} props.acceptedTypes - Accepted file types
 * @param {number} props.maxSize - Maximum file size in bytes
 * @param {number} props.maxWidth - Maximum image width
 * @param {number} props.maxHeight - Maximum image height
 * @param {boolean} props.multiple - Allow multiple images
 * @param {string} props.uploadPath - Upload path for images
 * @param {Function} props.onUpload - Custom upload handler
 * @param {string} props.className - Additional CSS classes
 */
export const ImageUpload = ({
  value,
  onChange,
  label,
  required = false,
  error,
  helpText,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSize = 5 * 1024 * 1024, // 5MB
  maxWidth = 2048,
  maxHeight = 2048,
  multiple = false,
  uploadPath = 'public/images',
  onUpload,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Handle current value and preview
  useEffect(() => {
    if (value) {
      if (typeof value === 'string') {
        // URL string
        setPreview(value);
      } else if (value instanceof File) {
        // File object
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(value);
      }
    } else {
      setPreview(null);
    }
  }, [value]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // For now, handle single file
    
    try {
      // Validate file
      const validationError = validateFile(file, acceptedTypes, maxSize);
      if (validationError) {
        throw new Error(validationError);
      }

      // Optimize image if needed
      const optimizedFile = await optimizeImage(file, maxWidth, maxHeight);
      
      if (onUpload) {
        // Custom upload handler
        setIsUploading(true);
        setUploadProgress(0);
        
        const uploadResult = await onUpload(optimizedFile, {
          path: uploadPath,
          onProgress: setUploadProgress
        });
        
        onChange(uploadResult.url || uploadResult);
      } else {
        // Use file directly
        onChange(optimizedFile);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      // Handle error - could set local error state
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [acceptedTypes, maxSize, maxWidth, maxHeight, onUpload, uploadPath, onChange]);

  // Handle drag and drop
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    handleFileSelect(files);
  }, [handleFileSelect]);

  // Handle remove image
  const handleRemove = useCallback(() => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  // Handle URL input
  const handleUrlChange = useCallback((e) => {
    const url = e.target.value;
    onChange(url);
  }, [onChange]);

  const dropZoneClasses = `
    border-2 border-dashed rounded-lg p-6 text-center transition-colors
    ${isDragging ? 'border-accent-1 bg-accent-1/10' : 'border-border-1'}
    ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-accent-1 hover:bg-accent-1/5'}
  `;

  return (
    <GlassFormGroup className={className}>
      {label && (
        <GlassLabel required={required}>
          {label}
        </GlassLabel>
      )}

      <div className="space-y-4">
        {/* Current Image Preview */}
        {preview && (
          <GlassCard>
            <GlassCardContent>
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full h-auto max-h-64 mx-auto rounded-lg"
                />
                <GlassIconButton
                  size="sm"
                  variant="error"
                  onClick={handleRemove}
                  className="absolute top-2 right-2"
                  aria-label="Remove image"
                >
                  ×
                </GlassIconButton>
              </div>
              
              {/* Image Info */}
              {value instanceof File && (
                <div className="mt-3 text-xs text-text-3 space-y-1">
                  <div>File: {value.name}</div>
                  <div>Size: {formatFileSize(value.size)}</div>
                  <div>Type: {value.type}</div>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Upload Area */}
        {!preview && (
          <div
            className={dropZoneClasses}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="space-y-3">
                <div className="text-text-1">Uploading...</div>
                <div className="w-full bg-border-1 rounded-full h-2">
                  <div 
                    className="bg-accent-1 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-text-3">{uploadProgress}%</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl text-text-3">📷</div>
                <div className="text-text-1 font-medium">
                  Drop an image here or click to browse
                </div>
                <div className="text-xs text-text-3">
                  Supports: {acceptedTypes.map(type => type.split('/')[1]).join(', ')}
                  <br />
                  Max size: {formatFileSize(maxSize)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* URL Input Alternative */}
        <div className="space-y-2">
          <div className="text-sm text-text-2">Or enter image URL:</div>
          <GlassInput
            type="url"
            value={typeof value === 'string' ? value : ''}
            onChange={handleUrlChange}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {/* Upload Button (alternative to drag & drop) */}
        {!preview && (
          <div className="flex justify-center">
            <GlassButton
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Choose Image
            </GlassButton>
          </div>
        )}
      </div>

      {helpText && <GlassHelpText>{helpText}</GlassHelpText>}
      <GlassErrorMessage>{error}</GlassErrorMessage>
    </GlassFormGroup>
  );
};

/**
 * Image Gallery Component for managing multiple images
 */
export const ImageGallery = ({
  value = [],
  onChange,
  label,
  required = false,
  error,
  helpText,
  maxImages = 10,
  ...imageUploadProps
}) => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleAddImage = useCallback((newImage) => {
    if (value.length >= maxImages) return;
    
    const newImages = [...value, newImage];
    onChange(newImages);
  }, [value, maxImages, onChange]);

  const handleRemoveImage = useCallback((index) => {
    const newImages = value.filter((_, i) => i !== index);
    onChange(newImages);
    setSelectedIndex(null);
  }, [value, onChange]);

  const handleReplaceImage = useCallback((index, newImage) => {
    const newImages = [...value];
    newImages[index] = newImage;
    onChange(newImages);
  }, [value, onChange]);

  return (
    <GlassFormGroup>
      {label && (
        <GlassLabel required={required}>
          {label} ({value.length}/{maxImages})
        </GlassLabel>
      )}

      <div className="space-y-4">
        {/* Image Grid */}
        {value.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {value.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                  alt={`Image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg cursor-pointer"
                  onClick={() => setSelectedIndex(index)}
                />
                <GlassIconButton
                  size="sm"
                  variant="error"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  ×
                </GlassIconButton>
              </div>
            ))}
          </div>
        )}

        {/* Add New Image */}
        {value.length < maxImages && (
          <ImageUpload
            value={null}
            onChange={handleAddImage}
            {...imageUploadProps}
          />
        )}

        {/* Selected Image Modal */}
        {selectedIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="max-w-4xl max-h-full p-4">
              <GlassCard>
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <GlassCardTitle>Image {selectedIndex + 1}</GlassCardTitle>
                    <div className="flex gap-2">
                      <GlassButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          // Replace image functionality
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = imageUploadProps.acceptedTypes?.join(',') || 'image/*';
                          input.onchange = (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleReplaceImage(selectedIndex, file);
                            }
                          };
                          input.click();
                        }}
                      >
                        Replace
                      </GlassButton>
                      <GlassIconButton
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedIndex(null)}
                        aria-label="Close"
                      >
                        ×
                      </GlassIconButton>
                    </div>
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  <img
                    src={typeof value[selectedIndex] === 'string' ? 
                      value[selectedIndex] : 
                      URL.createObjectURL(value[selectedIndex])
                    }
                    alt={`Image ${selectedIndex + 1}`}
                    className="max-w-full max-h-[70vh] mx-auto"
                  />
                </GlassCardContent>
              </GlassCard>
            </div>
          </div>
        )}
      </div>

      {helpText && <GlassHelpText>{helpText}</GlassHelpText>}
      <GlassErrorMessage>{error}</GlassErrorMessage>
    </GlassFormGroup>
  );
};

// Utility functions

/**
 * Validate uploaded file
 */
function validateFile(file, acceptedTypes, maxSize) {
  if (!acceptedTypes.includes(file.type)) {
    return `File type ${file.type} is not supported. Accepted types: ${acceptedTypes.join(', ')}`;
  }
  
  if (file.size > maxSize) {
    return `File size ${formatFileSize(file.size)} exceeds maximum ${formatFileSize(maxSize)}`;
  }
  
  return null;
}

/**
 * Optimize image by resizing if needed
 */
function optimizeImage(file, maxWidth, maxHeight) {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Resize if needed
      if (width !== img.width || height !== img.height) {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const optimizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(optimizedFile);
        }, file.type, 0.9);
      } else {
        resolve(file);
      }
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default ImageUpload;