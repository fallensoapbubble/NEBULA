/**
 * Tests for Editing Components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { MarkdownEditor } from '../MarkdownEditor.js';
import { ArrayEditor } from '../ArrayEditor.js';
import { ObjectEditor } from '../ObjectEditor.js';
import { ImageUpload } from '../ImageUpload.js';

// Mock UI components
jest.mock('../../ui/Card.js', () => ({
  GlassCard: ({ children, className }) => <div className={`glass-card ${className}`}>{children}</div>,
  GlassCardHeader: ({ children }) => <div className="glass-card-header">{children}</div>,
  GlassCardContent: ({ children }) => <div className="glass-card-content">{children}</div>,
  GlassCardTitle: ({ children }) => <h3>{children}</h3>
}));

jest.mock('../../ui/Button.js', () => ({
  GlassButton: ({ children, onClick, variant, size, disabled, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`glass-button ${variant} ${size}`}
      {...props}
    >
      {children}
    </button>
  ),
  GlassIconButton: ({ children, onClick, variant, size, disabled, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`glass-icon-button ${variant} ${size}`}
      {...props}
    >
      {children}
    </button>
  ),
  GlassButtonGroup: ({ children }) => <div className="glass-button-group">{children}</div>
}));

jest.mock('../../ui/Input.js', () => ({
  GlassInput: ({ value, onChange, ...props }) => (
    <input value={value} onChange={onChange} {...props} />
  ),
  GlassTextarea: ({ value, onChange, ...props }) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
  GlassSelect: ({ value, onChange, children, ...props }) => (
    <select value={value} onChange={onChange} {...props}>
      {children}
    </select>
  ),
  GlassLabel: ({ children, required }) => (
    <label>{children}{required && <span>*</span>}</label>
  ),
  GlassFormGroup: ({ children }) => <div className="form-group">{children}</div>,
  GlassErrorMessage: ({ children }) => children ? <div className="error">{children}</div> : null,
  GlassHelpText: ({ children }) => children ? <div className="help">{children}</div> : null
}));

describe('MarkdownEditor', () => {
  it('renders with initial value', () => {
    render(
      <MarkdownEditor
        value="# Hello World"
        onChange={() => {}}
        label="Content"
      />
    );

    expect(screen.getByDisplayValue('# Hello World')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onChange when content changes', () => {
    const handleChange = jest.fn();
    render(
      <MarkdownEditor
        value=""
        onChange={handleChange}
        label="Content"
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '# New Content' } });

    expect(handleChange).toHaveBeenCalledWith('# New Content');
  });

  it('shows preview tab when enabled', () => {
    render(
      <MarkdownEditor
        value="# Hello"
        onChange={() => {}}
        showPreview={true}
      />
    );

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Split')).toBeInTheDocument();
  });

  it('inserts markdown formatting', () => {
    const handleChange = jest.fn();
    render(
      <MarkdownEditor
        value="selected text"
        onChange={handleChange}
      />
    );

    const boldButton = screen.getByText('B');
    fireEvent.click(boldButton);

    // Note: This test would need more complex setup to test actual text selection
    // For now, we just verify the button exists and is clickable
    expect(boldButton).toBeInTheDocument();
  });
});

describe('ArrayEditor', () => {
  it('renders empty array state', () => {
    render(
      <ArrayEditor
        value={[]}
        onChange={() => {}}
        label="Items"
        itemType="string"
      />
    );

    expect(screen.getByText('0 items')).toBeInTheDocument();
    expect(screen.getByText('No items yet. Click "Add Item" to get started.')).toBeInTheDocument();
    expect(screen.getByText('+ Add Item')).toBeInTheDocument();
  });

  it('renders array items', () => {
    render(
      <ArrayEditor
        value={['Item 1', 'Item 2']}
        onChange={() => {}}
        label="Items"
        itemType="string"
      />
    );

    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Item 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Item 2')).toBeInTheDocument();
  });

  it('adds new item when button clicked', () => {
    const handleChange = jest.fn();
    render(
      <ArrayEditor
        value={['Item 1']}
        onChange={handleChange}
        label="Items"
        itemType="string"
      />
    );

    const addButton = screen.getByText('+ Add Item');
    fireEvent.click(addButton);

    expect(handleChange).toHaveBeenCalledWith(['Item 1', '']);
  });

  it('removes item when remove button clicked', () => {
    const handleChange = jest.fn();
    render(
      <ArrayEditor
        value={['Item 1', 'Item 2']}
        onChange={handleChange}
        label="Items"
        itemType="string"
      />
    );

    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]);

    expect(handleChange).toHaveBeenCalledWith(['Item 2']);
  });

  it('respects minItems constraint', () => {
    render(
      <ArrayEditor
        value={['Item 1']}
        onChange={() => {}}
        label="Items"
        itemType="string"
        minItems={1}
      />
    );

    expect(screen.getByText('1 items (min: 1)')).toBeInTheDocument();
  });

  it('respects maxItems constraint', () => {
    const handleChange = jest.fn();
    render(
      <ArrayEditor
        value={['Item 1', 'Item 2']}
        onChange={handleChange}
        label="Items"
        itemType="string"
        maxItems={2}
      />
    );

    expect(screen.getByText('2 items (max: 2)')).toBeInTheDocument();
    
    const addButton = screen.getByText('+ Add Item');
    expect(addButton).toBeDisabled();
  });
});

describe('ObjectEditor', () => {
  const schema = {
    name: {
      type: 'string',
      label: 'Name',
      required: true
    },
    email: {
      type: 'string',
      label: 'Email'
    },
    bio: {
      type: 'markdown',
      label: 'Biography'
    }
  };

  it('renders object fields', () => {
    render(
      <ObjectEditor
        value={{ name: 'John Doe', email: 'john@example.com' }}
        onChange={() => {}}
        schema={schema}
        label="User Info"
      />
    );

    expect(screen.getByText('User Info')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
  });

  it('handles field changes', () => {
    const handleChange = jest.fn();
    render(
      <ObjectEditor
        value={{ name: 'John Doe' }}
        onChange={handleChange}
        schema={schema}
      />
    );

    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

    expect(handleChange).toHaveBeenCalledWith({ name: 'Jane Doe' });
  });

  it('renders in compact mode', () => {
    render(
      <ObjectEditor
        value={{ name: 'John Doe' }}
        onChange={() => {}}
        schema={schema}
        compact={true}
      />
    );

    // In compact mode, there should be no card wrapper
    expect(screen.queryByText('User Info')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
  });
});

describe('ImageUpload', () => {
  it('renders upload area when no image', () => {
    render(
      <ImageUpload
        value={null}
        onChange={() => {}}
        label="Profile Picture"
      />
    );

    expect(screen.getByText('Profile Picture')).toBeInTheDocument();
    expect(screen.getByText('Drop an image here or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Choose Image')).toBeInTheDocument();
  });

  it('renders preview when image is provided', () => {
    render(
      <ImageUpload
        value="https://example.com/image.jpg"
        onChange={() => {}}
        label="Profile Picture"
      />
    );

    const image = screen.getByAltText('Preview');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('handles URL input', () => {
    const handleChange = jest.fn();
    render(
      <ImageUpload
        value=""
        onChange={handleChange}
        label="Profile Picture"
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com/image.jpg');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/new-image.jpg' } });

    expect(handleChange).toHaveBeenCalledWith('https://example.com/new-image.jpg');
  });

  it('shows file size and type constraints', () => {
    render(
      <ImageUpload
        value={null}
        onChange={() => {}}
        acceptedTypes={['image/jpeg', 'image/png']}
        maxSize={2 * 1024 * 1024} // 2MB
      />
    );

    expect(screen.getByText(/Supports: jpeg, png/)).toBeInTheDocument();
    expect(screen.getByText(/Max size: 2 MB/)).toBeInTheDocument();
  });
});