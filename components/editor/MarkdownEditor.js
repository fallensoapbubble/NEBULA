/**
 * Markdown Editor with Preview
 * A rich markdown editor component with live preview functionality
 */

import React, { useState, useCallback, useMemo } from 'react';
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardTitle } from '../ui/Card.js';
import { GlassButton, GlassButtonGroup } from '../ui/Button.js';
import { GlassTextarea, GlassLabel, GlassFormGroup, GlassErrorMessage, GlassHelpText } from '../ui/Input.js';

/**
 * Markdown Editor Component
 * @param {Object} props
 * @param {string} props.value - Current markdown content
 * @param {Function} props.onChange - Change handler
 * @param {string} props.label - Field label
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Required field
 * @param {string} props.error - Error message
 * @param {string} props.helpText - Help text
 * @param {number} props.minHeight - Minimum height in pixels
 * @param {boolean} props.showPreview - Show preview by default
 * @param {string} props.className - Additional CSS classes
 */
export const MarkdownEditor = ({
  value = '',
  onChange,
  label,
  placeholder = 'Enter markdown content...',
  required = false,
  error,
  helpText,
  minHeight = 200,
  showPreview = true,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle content change
  const handleChange = useCallback((e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  }, [onChange]);

  // Insert markdown formatting
  const insertMarkdown = useCallback((before, after = '') => {
    const textarea = document.getElementById('markdown-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    if (onChange) {
      onChange(newText);
    }

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  }, [value, onChange]);

  // Toolbar actions
  const toolbarActions = useMemo(() => [
    { label: 'Bold', action: () => insertMarkdown('**', '**'), icon: 'B', shortcut: 'Ctrl+B' },
    { label: 'Italic', action: () => insertMarkdown('*', '*'), icon: 'I', shortcut: 'Ctrl+I' },
    { label: 'Code', action: () => insertMarkdown('`', '`'), icon: '</>', shortcut: 'Ctrl+`' },
    { label: 'Link', action: () => insertMarkdown('[', '](url)'), icon: '🔗', shortcut: 'Ctrl+K' },
    { label: 'Image', action: () => insertMarkdown('![alt](', ')'), icon: '🖼️', shortcut: 'Ctrl+Shift+I' },
    { label: 'Heading', action: () => insertMarkdown('## '), icon: 'H', shortcut: 'Ctrl+H' },
    { label: 'List', action: () => insertMarkdown('- '), icon: '•', shortcut: 'Ctrl+L' },
    { label: 'Quote', action: () => insertMarkdown('> '), icon: '"', shortcut: 'Ctrl+Q' }
  ], [insertMarkdown]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertMarkdown('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown('*', '*');
          break;
        case '`':
          e.preventDefault();
          insertMarkdown('`', '`');
          break;
        case 'k':
          e.preventDefault();
          insertMarkdown('[', '](url)');
          break;
        case 'h':
          e.preventDefault();
          insertMarkdown('## ');
          break;
        case 'l':
          e.preventDefault();
          insertMarkdown('- ');
          break;
        case 'q':
          e.preventDefault();
          insertMarkdown('> ');
          break;
      }
    }
  }, [insertMarkdown]);

  // Render markdown preview
  const renderPreview = useMemo(() => {
    return parseMarkdown(value);
  }, [value]);

  const containerClasses = `markdown-editor ${isFullscreen ? 'fixed inset-0 z-50 bg-background-1' : ''} ${className}`;

  return (
    <GlassFormGroup className={containerClasses}>
      {label && (
        <GlassLabel required={required}>
          {label}
        </GlassLabel>
      )}

      <GlassCard>
        {/* Toolbar */}
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Tab Switcher */}
              <GlassButtonGroup>
                <GlassButton
                  size="sm"
                  variant={activeTab === 'edit' ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab('edit')}
                >
                  Edit
                </GlassButton>
                {showPreview && (
                  <GlassButton
                    size="sm"
                    variant={activeTab === 'preview' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('preview')}
                  >
                    Preview
                  </GlassButton>
                )}
                {showPreview && (
                  <GlassButton
                    size="sm"
                    variant={activeTab === 'split' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('split')}
                  >
                    Split
                  </GlassButton>
                )}
              </GlassButtonGroup>

              {/* Formatting Toolbar */}
              {activeTab !== 'preview' && (
                <div className="flex items-center gap-1 ml-4 border-l border-border-1 pl-4">
                  {toolbarActions.map((action) => (
                    <GlassButton
                      key={action.label}
                      size="sm"
                      variant="secondary"
                      onClick={action.action}
                      title={`${action.label} (${action.shortcut})`}
                      className="min-w-[32px] font-mono"
                    >
                      {action.icon}
                    </GlassButton>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? '⤓' : '⤢'}
            </GlassButton>
          </div>
        </GlassCardHeader>

        <GlassCardContent>
          <div className={`markdown-editor-content ${activeTab === 'split' ? 'grid grid-cols-2 gap-4' : ''}`}>
            {/* Editor */}
            {(activeTab === 'edit' || activeTab === 'split') && (
              <div className="markdown-editor-input">
                <GlassTextarea
                  id="markdown-textarea"
                  value={value}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={Math.max(8, Math.floor(minHeight / 24))}
                  className="font-mono text-sm"
                  style={{ minHeight: `${minHeight}px` }}
                  error={!!error}
                />
              </div>
            )}

            {/* Preview */}
            {(activeTab === 'preview' || activeTab === 'split') && (
              <div className="markdown-preview">
                <div 
                  className="prose prose-invert max-w-none p-4 border border-border-1 rounded-lg bg-glass-1"
                  style={{ minHeight: `${minHeight}px` }}
                  dangerouslySetInnerHTML={{ __html: renderPreview }}
                />
              </div>
            )}
          </div>

          {/* Character Count */}
          <div className="flex items-center justify-between mt-3 text-xs text-text-3">
            <div>
              {value.length} characters, {value.split(/\s+/).filter(word => word.length > 0).length} words
            </div>
            {activeTab !== 'preview' && (
              <div className="text-text-3">
                Use Ctrl+B for bold, Ctrl+I for italic, Ctrl+K for links
              </div>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {helpText && <GlassHelpText>{helpText}</GlassHelpText>}
      <GlassErrorMessage>{error}</GlassErrorMessage>
    </GlassFormGroup>
  );
};

/**
 * Simple markdown parser for preview
 * This is a basic implementation - in production, consider using a library like marked or remark
 */
function parseMarkdown(markdown) {
  if (!markdown) return '';

  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/__(.*?)__/gim, '<strong>$1</strong>')
    
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/_(.*?)_/gim, '<em>$1</em>')
    
    // Code
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />')
    
    // Line breaks
    .replace(/\n$/gim, '<br />')
    
    // Lists
    .replace(/^\s*\* (.+)/gim, '<li>$1</li>')
    .replace(/^\s*- (.+)/gim, '<li>$1</li>')
    .replace(/^\s*\+ (.+)/gim, '<li>$1</li>')
    
    // Blockquotes
    .replace(/^\> (.+)/gim, '<blockquote>$1</blockquote>')
    
    // Paragraphs
    .replace(/^\s*(.+)/gim, '<p>$1</p>');

  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
  
  // Clean up multiple ul tags
  html = html.replace(/<\/ul>\s*<ul>/gim, '');

  return html;
}

export default MarkdownEditor;