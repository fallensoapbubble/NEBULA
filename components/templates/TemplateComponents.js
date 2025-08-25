/**
 * Template Components
 * Reusable components for portfolio templates
 */

import React from 'react';

/**
 * Detect asset type from file extension
 * @param {string} extension - File extension
 * @returns {string} Asset type
 */
function detectAssetType(extension) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (audioExtensions.includes(extension)) return 'audio';
  
  return 'unknown';
}

/**
 * Basic template component
 */
export const BasicTemplateComponent = ({ children, className = '' }) => {
  return (
    <div className={`template-component ${className}`}>
      {children}
    </div>
  );
};

export default BasicTemplateComponent;