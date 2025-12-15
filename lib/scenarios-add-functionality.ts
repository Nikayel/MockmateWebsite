/**
 * Add Functionality Scenarios
 *
 * These scenarios simulate real Meta/Google AI-assisted interviews
 * where candidates must add new features to an existing codebase.
 *
 * Key aspects:
 * - Real codebase with multiple files
 * - Clear feature requirements
 * - Existing tests to understand expected behavior
 * - Focus on code integration, not greenfield development
 */

import type { BaseScenario } from './scenarios';

export interface AddFunctionalityScenario extends BaseScenario {
  type: 'add-functionality';
  problemStatement: string;
  featureRequirements: string[];
  existingCode: {
    [language: string]: string;
  };
  codebaseFiles: {
    [language: string]: {
      fileName: string;
      content: string;
      description: string;
    }[];
  };
  hints: string[];
  testCases: {
    input: any;
    expected: any;
    description: string;
  }[];
  acceptanceCriteria: string[];
}

// =============================================================================
// ADD FUNCTIONALITY SCENARIOS - Real-world feature implementation
// =============================================================================

export const addFunctionalityScenarios: AddFunctionalityScenario[] = [
  {
    id: 'add-feature-search-autocomplete',
    title: 'Add Search Autocomplete to E-Commerce Platform',
    type: 'add-functionality',
    difficulty: 'medium',
    companies: ['Amazon', 'Shopify', 'Google', 'Meta'],
    description: 'Implement an autocomplete feature for the product search bar with debouncing and keyboard navigation',
    tags: ['frontend', 'search', 'debounce', 'accessibility', 'react'],
    estimatedTime: 45,
    problemStatement: `You're working on an e-commerce platform's search functionality. The product team wants to add autocomplete suggestions to improve user experience and conversion rates.

**Your task:**
1. Read the existing search component and API service
2. Implement autocomplete suggestions that appear as the user types
3. Add debouncing to avoid excessive API calls
4. Implement keyboard navigation (up/down arrows, enter to select, escape to close)
5. Ensure the feature is accessible (ARIA attributes, screen reader support)

**Context:** This is a high-traffic e-commerce site. The search bar is used by millions of users daily. Performance and accessibility are critical.`,
    featureRequirements: [
      'Show suggestions dropdown after user types at least 2 characters',
      'Debounce API calls by 300ms to avoid excessive requests',
      'Support keyboard navigation: Arrow Up/Down to navigate, Enter to select, Escape to close',
      'Highlight matching text in suggestions',
      'Show loading state while fetching suggestions',
      'Handle empty results gracefully',
      'Accessible: proper ARIA roles and labels',
    ],
    existingCode: {
      javascript: `// SearchBar.jsx
// Current search bar - needs autocomplete feature

import React, { useState } from 'react';
import { searchProducts } from './api/searchService';
import './SearchBar.css';

export function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const results = await searchProducts(query);
      onSearch(results);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="search-input"
      />
      <button type="submit" disabled={isLoading} className="search-button">
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}

// TODO: Add autocomplete functionality
// - Fetch suggestions as user types (debounced)
// - Show suggestions dropdown
// - Handle keyboard navigation
// - Make it accessible`,
      typescript: `// SearchBar.tsx
// Current search bar - needs autocomplete feature

import React, { useState } from 'react';
import { searchProducts, Product } from './api/searchService';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (results: Product[]) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const results = await searchProducts(query);
      onSearch(results);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="search-input"
      />
      <button type="submit" disabled={isLoading} className="search-button">
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}

// TODO: Add autocomplete functionality
// - Fetch suggestions as user types (debounced)
// - Show suggestions dropdown
// - Handle keyboard navigation
// - Make it accessible`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'api/searchService.js',
          content: `// searchService.js
// API service for product search

const API_BASE = '/api/v1';

export async function searchProducts(query, limit = 20) {
  const response = await fetch(
    \`\${API_BASE}/products/search?q=\${encodeURIComponent(query)}&limit=\${limit}\`
  );

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

// Suggestion endpoint - returns top matches quickly
export async function getSuggestions(query, limit = 8) {
  const response = await fetch(
    \`\${API_BASE}/products/suggestions?q=\${encodeURIComponent(query)}&limit=\${limit}\`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }

  return response.json();
}

// Response format for suggestions:
// {
//   suggestions: [
//     { id: 'prod_1', name: 'iPhone 15 Pro', category: 'Electronics' },
//     { id: 'prod_2', name: 'iPhone 15 Case', category: 'Accessories' },
//   ]
// }`,
          description: 'API service with existing getSuggestions endpoint ready to use',
        },
        {
          fileName: 'hooks/useDebounce.js',
          content: `// useDebounce.js
// Utility hook for debouncing values

import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage example:
// const debouncedQuery = useDebounce(query, 300);
// useEffect(() => {
//   if (debouncedQuery) fetchSuggestions(debouncedQuery);
// }, [debouncedQuery]);`,
          description: 'Reusable debounce hook - use this for debouncing search queries',
        },
        {
          fileName: 'SearchBar.css',
          content: `.search-bar {
  position: relative;
  display: flex;
  gap: 8px;
  max-width: 600px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #0066cc;
}

.search-button {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: #0066cc;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-button:hover:not(:disabled) {
  background: #0052a3;
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Suggestion dropdown styles - you can use these */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 320px;
  overflow-y: auto;
  z-index: 100;
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background: #f5f5f5;
}

.suggestion-name {
  font-weight: 500;
  color: #1a1a1a;
}

.suggestion-name mark {
  background: #fff3cd;
  color: inherit;
}

.suggestion-category {
  font-size: 12px;
  color: #666;
}

.suggestions-loading {
  padding: 16px;
  text-align: center;
  color: #666;
}

.suggestions-empty {
  padding: 16px;
  text-align: center;
  color: #999;
}`,
          description: 'CSS styles including pre-made suggestion dropdown styles',
        },
        {
          fileName: 'SearchBar.test.js',
          content: `// SearchBar.test.js
// Tests for SearchBar with autocomplete

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';
import { getSuggestions } from './api/searchService';

// Mock the API
jest.mock('./api/searchService');

describe('SearchBar Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should not show suggestions for queries less than 2 characters', async () => {
    render(<SearchBar onSearch={() => {}} />);

    const input = screen.getByPlaceholderText('Search products...');
    await userEvent.type(input, 'a');

    await waitFor(() => {
      expect(getSuggestions).not.toHaveBeenCalled();
    });
  });

  test('should fetch and display suggestions after typing 2+ characters', async () => {
    getSuggestions.mockResolvedValue({
      suggestions: [
        { id: '1', name: 'iPhone 15', category: 'Electronics' },
        { id: '2', name: 'iPhone Case', category: 'Accessories' },
      ]
    });

    render(<SearchBar onSearch={() => {}} />);

    const input = screen.getByPlaceholderText('Search products...');
    await userEvent.type(input, 'iph');

    await waitFor(() => {
      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
      expect(screen.getByText('iPhone Case')).toBeInTheDocument();
    });
  });

  test('should debounce API calls', async () => {
    jest.useFakeTimers();
    getSuggestions.mockResolvedValue({ suggestions: [] });

    render(<SearchBar onSearch={() => {}} />);

    const input = screen.getByPlaceholderText('Search products...');

    // Type quickly
    fireEvent.change(input, { target: { value: 'ip' } });
    fireEvent.change(input, { target: { value: 'iph' } });
    fireEvent.change(input, { target: { value: 'ipho' } });

    // Should not have called API yet
    expect(getSuggestions).not.toHaveBeenCalled();

    // Fast forward debounce time
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      // Should only call once with final value
      expect(getSuggestions).toHaveBeenCalledTimes(1);
      expect(getSuggestions).toHaveBeenCalledWith('ipho', 8);
    });

    jest.useRealTimers();
  });

  test('should navigate suggestions with keyboard', async () => {
    getSuggestions.mockResolvedValue({
      suggestions: [
        { id: '1', name: 'iPhone 15', category: 'Electronics' },
        { id: '2', name: 'iPhone Case', category: 'Accessories' },
      ]
    });

    render(<SearchBar onSearch={() => {}} />);

    const input = screen.getByPlaceholderText('Search products...');
    await userEvent.type(input, 'iph');

    await waitFor(() => {
      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
    });

    // Press down arrow - first item should be highlighted
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByText('iPhone 15').closest('.suggestion-item'))
      .toHaveClass('highlighted');

    // Press down arrow again - second item should be highlighted
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByText('iPhone Case').closest('.suggestion-item'))
      .toHaveClass('highlighted');

    // Press up arrow - first item should be highlighted again
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByText('iPhone 15').closest('.suggestion-item'))
      .toHaveClass('highlighted');
  });

  test('should select suggestion on Enter key', async () => {
    const onSearch = jest.fn();
    getSuggestions.mockResolvedValue({
      suggestions: [
        { id: '1', name: 'iPhone 15', category: 'Electronics' },
      ]
    });

    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Search products...');
    await userEvent.type(input, 'iph');

    await waitFor(() => {
      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Should have filled input with selected suggestion
    expect(input).toHaveValue('iPhone 15');
  });

  test('should close suggestions on Escape key', async () => {
    getSuggestions.mockResolvedValue({
      suggestions: [
        { id: '1', name: 'iPhone 15', category: 'Electronics' },
      ]
    });

    render(<SearchBar onSearch={() => {}} />);

    const input = screen.getByPlaceholderText('Search products...');
    await userEvent.type(input, 'iph');

    await waitFor(() => {
      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByText('iPhone 15')).not.toBeInTheDocument();
  });

  test('should have proper accessibility attributes', async () => {
    getSuggestions.mockResolvedValue({
      suggestions: [
        { id: '1', name: 'iPhone 15', category: 'Electronics' },
      ]
    });

    render(<SearchBar onSearch={() => {}} />);

    const input = screen.getByPlaceholderText('Search products...');

    // Input should have combobox role
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    await userEvent.type(input, 'iph');

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});`,
          description: 'Test file - your implementation should pass all these tests',
        },
      ],
      typescript: [
        {
          fileName: 'api/searchService.ts',
          content: `// searchService.ts
// API service for product search

const API_BASE = '/api/v1';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
}

export interface Suggestion {
  id: string;
  name: string;
  category: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export async function searchProducts(query: string, limit = 20): Promise<Product[]> {
  const response = await fetch(
    \`\${API_BASE}/products/search?q=\${encodeURIComponent(query)}&limit=\${limit}\`
  );

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

export async function getSuggestions(query: string, limit = 8): Promise<SuggestionsResponse> {
  const response = await fetch(
    \`\${API_BASE}/products/suggestions?q=\${encodeURIComponent(query)}&limit=\${limit}\`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }

  return response.json();
}`,
          description: 'TypeScript API service with types defined',
        },
        {
          fileName: 'hooks/useDebounce.ts',
          content: `// useDebounce.ts
// Utility hook for debouncing values

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}`,
          description: 'TypeScript debounce hook',
        },
      ],
    },
    hints: [
      'Use the existing useDebounce hook to debounce the query',
      'Store the highlighted index in state for keyboard navigation',
      'Use onKeyDown on the input to handle arrow keys, Enter, and Escape',
      'Use role="combobox" on input and role="listbox" on the suggestions dropdown',
      'Remember to handle the case when suggestions are loading',
    ],
    testCases: [
      {
        input: { query: 'iph', delay: 300 },
        expected: { suggestionsVisible: true, apiCalls: 1 },
        description: 'Shows suggestions after debounce',
      },
      {
        input: { query: 'a' },
        expected: { suggestionsVisible: false },
        description: 'No suggestions for single character',
      },
      {
        input: { keySequence: ['ArrowDown', 'ArrowDown', 'Enter'] },
        expected: { selectedIndex: 1, inputFilled: true },
        description: 'Keyboard navigation works',
      },
    ],
    acceptanceCriteria: [
      'Suggestions appear within 400ms of typing (300ms debounce + network)',
      'Keyboard navigation is fully functional',
      'Component passes all accessibility tests',
      'No console errors or warnings',
      'All provided tests pass',
    ],
  },

  {
    id: 'add-feature-undo-redo',
    title: 'Add Undo/Redo to Collaborative Document Editor',
    type: 'add-functionality',
    difficulty: 'hard',
    companies: ['Google', 'Meta', 'Notion', 'Figma', 'Microsoft'],
    description: 'Implement undo/redo functionality for a collaborative text editor using the Command pattern',
    tags: ['design-patterns', 'state-management', 'collaboration', 'typescript'],
    estimatedTime: 50,
    problemStatement: `You're building a collaborative document editor (like Google Docs or Notion). The editor already supports basic text operations, but users are requesting undo/redo functionality.

**Your task:**
1. Study the existing Document and Operation classes
2. Implement an UndoRedoManager using the Command pattern
3. Integrate undo/redo with the existing editor
4. Handle edge cases (nothing to undo, redo stack clearing on new operations)
5. Add keyboard shortcuts (Ctrl+Z for undo, Ctrl+Shift+Z for redo)

**Context:** This is a real-time collaborative editor. Multiple users can edit simultaneously. Your undo should only affect the current user's operations, not others'.`,
    featureRequirements: [
      'Undo reverses the last operation performed by the current user',
      'Redo re-applies an undone operation',
      'New operations clear the redo stack',
      'Undo/redo stacks have a maximum size (100 operations)',
      'Support Ctrl+Z (undo) and Ctrl+Shift+Z (redo) keyboard shortcuts',
      'Only undo current user operations (ignore remote operations)',
      'Operations should be undoable even if the document changed',
    ],
    existingCode: {
      javascript: `// Editor.js
// Main editor class - needs undo/redo integration

import { Document } from './Document';
import { Operation, InsertOperation, DeleteOperation } from './Operation';

export class Editor {
  constructor(userId) {
    this.userId = userId;
    this.document = new Document();
    this.socket = null; // WebSocket for real-time sync
    this.listeners = new Set();
  }

  // Connect to collaboration server
  connect(serverUrl) {
    this.socket = new WebSocket(serverUrl);
    this.socket.onmessage = (event) => {
      const { operation, userId } = JSON.parse(event.data);
      if (userId !== this.userId) {
        // Remote operation - apply without adding to undo stack
        this.applyOperation(operation, false);
      }
    };
  }

  // Insert text at position
  insert(position, text) {
    const operation = new InsertOperation(
      this.userId,
      position,
      text,
      Date.now()
    );
    this.applyOperation(operation, true);
    this.broadcastOperation(operation);
  }

  // Delete text at position
  delete(position, length) {
    const deletedText = this.document.getText(position, length);
    const operation = new DeleteOperation(
      this.userId,
      position,
      deletedText,
      Date.now()
    );
    this.applyOperation(operation, true);
    this.broadcastOperation(operation);
  }

  // Apply operation to document
  applyOperation(operation, isLocal) {
    operation.apply(this.document);
    this.notifyListeners();

    // TODO: Add to undo stack if isLocal is true
  }

  // Broadcast operation to other users
  broadcastOperation(operation) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        operation: operation.serialize(),
        userId: this.userId,
      }));
    }
  }

  // TODO: Implement undo()
  undo() {
    throw new Error('Not implemented');
  }

  // TODO: Implement redo()
  redo() {
    throw new Error('Not implemented');
  }

  // TODO: Implement canUndo()
  canUndo() {
    return false;
  }

  // TODO: Implement canRedo()
  canRedo() {
    return false;
  }

  // Subscribe to document changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    const content = this.document.getContent();
    this.listeners.forEach(fn => fn(content));
  }

  getContent() {
    return this.document.getContent();
  }
}`,
      typescript: `// Editor.ts
// Main editor class - needs undo/redo integration

import { Document } from './Document';
import { Operation, InsertOperation, DeleteOperation } from './Operation';

type Listener = (content: string) => void;

export class Editor {
  private userId: string;
  private document: Document;
  private socket: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();

  constructor(userId: string) {
    this.userId = userId;
    this.document = new Document();
  }

  connect(serverUrl: string): void {
    this.socket = new WebSocket(serverUrl);
    this.socket.onmessage = (event: MessageEvent) => {
      const { operation, userId } = JSON.parse(event.data);
      if (userId !== this.userId) {
        this.applyOperation(Operation.deserialize(operation), false);
      }
    };
  }

  insert(position: number, text: string): void {
    const operation = new InsertOperation(
      this.userId,
      position,
      text,
      Date.now()
    );
    this.applyOperation(operation, true);
    this.broadcastOperation(operation);
  }

  delete(position: number, length: number): void {
    const deletedText = this.document.getText(position, length);
    const operation = new DeleteOperation(
      this.userId,
      position,
      deletedText,
      Date.now()
    );
    this.applyOperation(operation, true);
    this.broadcastOperation(operation);
  }

  private applyOperation(operation: Operation, isLocal: boolean): void {
    operation.apply(this.document);
    this.notifyListeners();
    // TODO: Add to undo stack if isLocal is true
  }

  private broadcastOperation(operation: Operation): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        operation: operation.serialize(),
        userId: this.userId,
      }));
    }
  }

  // TODO: Implement undo()
  undo(): void {
    throw new Error('Not implemented');
  }

  // TODO: Implement redo()
  redo(): void {
    throw new Error('Not implemented');
  }

  // TODO: Implement canUndo()
  canUndo(): boolean {
    return false;
  }

  // TODO: Implement canRedo()
  canRedo(): boolean {
    return false;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const content = this.document.getContent();
    this.listeners.forEach(fn => fn(content));
  }

  getContent(): string {
    return this.document.getContent();
  }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'Document.js',
          content: `// Document.js
// Simple document model using rope-like structure

export class Document {
  constructor(initialContent = '') {
    this.content = initialContent;
  }

  insert(position, text) {
    if (position < 0 || position > this.content.length) {
      throw new Error(\`Invalid position: \${position}\`);
    }
    this.content =
      this.content.slice(0, position) +
      text +
      this.content.slice(position);
  }

  delete(position, length) {
    if (position < 0 || position + length > this.content.length) {
      throw new Error(\`Invalid delete range: \${position}-\${position + length}\`);
    }
    const deleted = this.content.slice(position, position + length);
    this.content =
      this.content.slice(0, position) +
      this.content.slice(position + length);
    return deleted;
  }

  getText(position, length) {
    return this.content.slice(position, position + length);
  }

  getContent() {
    return this.content;
  }

  getLength() {
    return this.content.length;
  }
}`,
          description: 'Document model with insert/delete operations',
        },
        {
          fileName: 'Operation.js',
          content: `// Operation.js
// Operation classes for document edits

export class Operation {
  constructor(userId, timestamp) {
    this.userId = userId;
    this.timestamp = timestamp;
  }

  apply(document) {
    throw new Error('Must implement apply()');
  }

  // Returns the inverse operation (for undo)
  inverse() {
    throw new Error('Must implement inverse()');
  }

  serialize() {
    throw new Error('Must implement serialize()');
  }

  static deserialize(data) {
    switch (data.type) {
      case 'insert':
        return new InsertOperation(
          data.userId,
          data.position,
          data.text,
          data.timestamp
        );
      case 'delete':
        return new DeleteOperation(
          data.userId,
          data.position,
          data.text,
          data.timestamp
        );
      default:
        throw new Error(\`Unknown operation type: \${data.type}\`);
    }
  }
}

export class InsertOperation extends Operation {
  constructor(userId, position, text, timestamp) {
    super(userId, timestamp);
    this.position = position;
    this.text = text;
  }

  apply(document) {
    document.insert(this.position, this.text);
  }

  // Inverse of insert is delete
  inverse() {
    return new DeleteOperation(
      this.userId,
      this.position,
      this.text,
      Date.now()
    );
  }

  serialize() {
    return {
      type: 'insert',
      userId: this.userId,
      position: this.position,
      text: this.text,
      timestamp: this.timestamp,
    };
  }
}

export class DeleteOperation extends Operation {
  constructor(userId, position, text, timestamp) {
    super(userId, timestamp);
    this.position = position;
    this.text = text;
  }

  apply(document) {
    document.delete(this.position, this.text.length);
  }

  // Inverse of delete is insert
  inverse() {
    return new InsertOperation(
      this.userId,
      this.position,
      this.text,
      Date.now()
    );
  }

  serialize() {
    return {
      type: 'delete',
      userId: this.userId,
      position: this.position,
      text: this.text,
      timestamp: this.timestamp,
    };
  }
}`,
          description: 'Operation classes with inverse() method for undo - use these!',
        },
        {
          fileName: 'Editor.test.js',
          content: `// Editor.test.js
// Tests for Editor undo/redo functionality

import { Editor } from './Editor';

describe('Editor Undo/Redo', () => {
  let editor;

  beforeEach(() => {
    editor = new Editor('user1');
  });

  test('should undo insert operation', () => {
    editor.insert(0, 'Hello');
    expect(editor.getContent()).toBe('Hello');

    editor.undo();
    expect(editor.getContent()).toBe('');
  });

  test('should undo delete operation', () => {
    editor.insert(0, 'Hello World');
    editor.delete(5, 6); // Delete " World"
    expect(editor.getContent()).toBe('Hello');

    editor.undo();
    expect(editor.getContent()).toBe('Hello World');
  });

  test('should redo undone operation', () => {
    editor.insert(0, 'Hello');
    editor.undo();
    expect(editor.getContent()).toBe('');

    editor.redo();
    expect(editor.getContent()).toBe('Hello');
  });

  test('should clear redo stack on new operation', () => {
    editor.insert(0, 'Hello');
    editor.undo();
    expect(editor.canRedo()).toBe(true);

    editor.insert(0, 'Hi');
    expect(editor.canRedo()).toBe(false);
  });

  test('should handle multiple undo/redo', () => {
    editor.insert(0, 'Hello');
    editor.insert(5, ' World');
    editor.insert(11, '!');
    expect(editor.getContent()).toBe('Hello World!');

    editor.undo();
    expect(editor.getContent()).toBe('Hello World');

    editor.undo();
    expect(editor.getContent()).toBe('Hello');

    editor.redo();
    expect(editor.getContent()).toBe('Hello World');

    editor.redo();
    expect(editor.getContent()).toBe('Hello World!');
  });

  test('should report canUndo correctly', () => {
    expect(editor.canUndo()).toBe(false);

    editor.insert(0, 'Hello');
    expect(editor.canUndo()).toBe(true);

    editor.undo();
    expect(editor.canUndo()).toBe(false);
  });

  test('should report canRedo correctly', () => {
    expect(editor.canRedo()).toBe(false);

    editor.insert(0, 'Hello');
    expect(editor.canRedo()).toBe(false);

    editor.undo();
    expect(editor.canRedo()).toBe(true);

    editor.redo();
    expect(editor.canRedo()).toBe(false);
  });

  test('should limit undo stack size', () => {
    // Insert 150 characters one by one
    for (let i = 0; i < 150; i++) {
      editor.insert(i, 'x');
    }
    expect(editor.getContent()).toBe('x'.repeat(150));

    // Should only be able to undo 100 times (max stack size)
    let undoCount = 0;
    while (editor.canUndo()) {
      editor.undo();
      undoCount++;
    }

    expect(undoCount).toBe(100);
    expect(editor.getContent()).toBe('x'.repeat(50));
  });

  test('should not throw when undo is called with empty stack', () => {
    expect(() => editor.undo()).not.toThrow();
    expect(editor.getContent()).toBe('');
  });

  test('should not throw when redo is called with empty stack', () => {
    expect(() => editor.redo()).not.toThrow();
    expect(editor.getContent()).toBe('');
  });
});`,
          description: 'Comprehensive tests for undo/redo functionality',
        },
        {
          fileName: 'EditorComponent.jsx',
          content: `// EditorComponent.jsx
// React component for the editor

import React, { useEffect, useRef, useState } from 'react';
import { Editor } from './Editor';

export function EditorComponent({ userId, serverUrl }) {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);
  const [content, setContent] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const editor = new Editor(userId);
    editorRef.current = editor;

    if (serverUrl) {
      editor.connect(serverUrl);
    }

    const unsubscribe = editor.subscribe((newContent) => {
      setContent(newContent);
      setCanUndo(editor.canUndo());
      setCanRedo(editor.canRedo());
    });

    return unsubscribe;
  }, [userId, serverUrl]);

  // TODO: Add keyboard shortcut handler
  const handleKeyDown = (e) => {
    // Implement Ctrl+Z (undo) and Ctrl+Shift+Z (redo)
    // Your code here
  };

  const handleChange = (e) => {
    const editor = editorRef.current;
    const textarea = textareaRef.current;

    // Simple implementation - in real app would be more sophisticated
    const newValue = e.target.value;
    const cursorPos = textarea.selectionStart;

    if (newValue.length > content.length) {
      // Insert
      const inserted = newValue.slice(cursorPos - (newValue.length - content.length), cursorPos);
      editor.insert(cursorPos - inserted.length, inserted);
    } else if (newValue.length < content.length) {
      // Delete
      const deleteLength = content.length - newValue.length;
      editor.delete(cursorPos, deleteLength);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button
          onClick={() => editorRef.current?.undo()}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          onClick={() => editorRef.current?.redo()}
          disabled={!canRedo}
        >
          Redo
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="editor-textarea"
        placeholder="Start typing..."
      />
    </div>
  );
}`,
          description: 'React component - needs keyboard shortcut implementation',
        },
      ],
      typescript: [
        {
          fileName: 'Document.ts',
          content: `// Document.ts
export class Document {
  private content: string;

  constructor(initialContent = '') {
    this.content = initialContent;
  }

  insert(position: number, text: string): void {
    if (position < 0 || position > this.content.length) {
      throw new Error(\`Invalid position: \${position}\`);
    }
    this.content =
      this.content.slice(0, position) +
      text +
      this.content.slice(position);
  }

  delete(position: number, length: number): string {
    if (position < 0 || position + length > this.content.length) {
      throw new Error(\`Invalid delete range: \${position}-\${position + length}\`);
    }
    const deleted = this.content.slice(position, position + length);
    this.content =
      this.content.slice(0, position) +
      this.content.slice(position + length);
    return deleted;
  }

  getText(position: number, length: number): string {
    return this.content.slice(position, position + length);
  }

  getContent(): string {
    return this.content;
  }

  getLength(): number {
    return this.content.length;
  }
}`,
          description: 'TypeScript Document model',
        },
        {
          fileName: 'Operation.ts',
          content: `// Operation.ts
import { Document } from './Document';

export abstract class Operation {
  constructor(
    public readonly userId: string,
    public readonly timestamp: number
  ) {}

  abstract apply(document: Document): void;
  abstract inverse(): Operation;
  abstract serialize(): OperationData;
}

export interface OperationData {
  type: 'insert' | 'delete';
  userId: string;
  position: number;
  text: string;
  timestamp: number;
}

export class InsertOperation extends Operation {
  constructor(
    userId: string,
    public readonly position: number,
    public readonly text: string,
    timestamp: number
  ) {
    super(userId, timestamp);
  }

  apply(document: Document): void {
    document.insert(this.position, this.text);
  }

  inverse(): DeleteOperation {
    return new DeleteOperation(
      this.userId,
      this.position,
      this.text,
      Date.now()
    );
  }

  serialize(): OperationData {
    return {
      type: 'insert',
      userId: this.userId,
      position: this.position,
      text: this.text,
      timestamp: this.timestamp,
    };
  }
}

export class DeleteOperation extends Operation {
  constructor(
    userId: string,
    public readonly position: number,
    public readonly text: string,
    timestamp: number
  ) {
    super(userId, timestamp);
  }

  apply(document: Document): void {
    document.delete(this.position, this.text.length);
  }

  inverse(): InsertOperation {
    return new InsertOperation(
      this.userId,
      this.position,
      this.text,
      Date.now()
    );
  }

  serialize(): OperationData {
    return {
      type: 'delete',
      userId: this.userId,
      position: this.position,
      text: this.text,
      timestamp: this.timestamp,
    };
  }
}

export function deserializeOperation(data: OperationData): Operation {
  switch (data.type) {
    case 'insert':
      return new InsertOperation(data.userId, data.position, data.text, data.timestamp);
    case 'delete':
      return new DeleteOperation(data.userId, data.position, data.text, data.timestamp);
  }
}`,
          description: 'TypeScript Operation classes with inverse() for undo',
        },
      ],
    },
    hints: [
      'Create a separate UndoRedoManager class to keep the Editor clean',
      'Use two stacks: one for undo, one for redo',
      'Use the operation.inverse() method to create the undo operation',
      'Clear the redo stack whenever a new operation is performed',
      'Check for metaKey (Mac) or ctrlKey (Windows) for keyboard shortcuts',
    ],
    testCases: [
      {
        input: { operations: ['insert Hello', 'undo'] },
        expected: { content: '' },
        description: 'Undo reverses insert',
      },
      {
        input: { operations: ['insert Hello', 'undo', 'redo'] },
        expected: { content: 'Hello' },
        description: 'Redo re-applies operation',
      },
      {
        input: { operations: ['insert A', 'insert B', 'undo', 'insert C'] },
        expected: { content: 'AC', canRedo: false },
        description: 'New operation clears redo stack',
      },
    ],
    acceptanceCriteria: [
      'All test cases pass',
      'Undo/redo keyboard shortcuts work',
      'Stack size is limited to 100 operations',
      'Only local operations can be undone',
      'UI correctly reflects canUndo/canRedo state',
    ],
  },

  {
    id: 'add-feature-notification-system',
    title: 'Add Real-Time Notification System',
    type: 'add-functionality',
    difficulty: 'medium',
    companies: ['Meta', 'Slack', 'Discord', 'Google'],
    description: 'Implement a notification system with real-time updates, grouping, and read/unread state management',
    tags: ['backend', 'websocket', 'database', 'real-time', 'nodejs'],
    estimatedTime: 45,
    problemStatement: `You're adding a notification system to a social media platform. Users need to receive real-time notifications for various events (likes, comments, follows, mentions).

**Your task:**
1. Study the existing User and Event models
2. Implement the NotificationService with methods for creating, fetching, and marking notifications
3. Add notification grouping (e.g., "John and 5 others liked your post")
4. Implement real-time push via WebSocket
5. Add proper database indexing for performance

**Context:** This platform has 10 million users. Notifications must be delivered within 500ms of the triggering event. Users average 50 notifications per day.`,
    featureRequirements: [
      'Create notifications for events: like, comment, follow, mention, reply',
      'Group similar notifications (e.g., multiple likes on same post)',
      'Fetch notifications with pagination (newest first)',
      'Mark individual or all notifications as read',
      'Real-time push to connected clients via WebSocket',
      'Unread count badge for the UI',
      'Support for notification preferences (which types to receive)',
    ],
    existingCode: {
      javascript: `// NotificationService.js
// Notification service skeleton - implement the methods

const { db } = require('./database');
const { WebSocketServer } = require('./websocket');

class NotificationService {
  constructor() {
    this.wsServer = WebSocketServer.getInstance();
  }

  /**
   * Create a new notification
   * @param {Object} params
   * @param {string} params.recipientId - User receiving the notification
   * @param {string} params.actorId - User who triggered the event
   * @param {string} params.type - Type: 'like', 'comment', 'follow', 'mention', 'reply'
   * @param {Object} params.data - Additional data (postId, commentId, etc.)
   * @returns {Promise<Notification>}
   */
  async createNotification({ recipientId, actorId, type, data }) {
    // TODO: Implement
    // 1. Check if should group with existing notification
    // 2. Create or update notification in database
    // 3. Push to recipient via WebSocket
    throw new Error('Not implemented');
  }

  /**
   * Get notifications for a user
   * @param {string} userId
   * @param {Object} options
   * @param {number} options.limit - Max notifications to return
   * @param {string} options.cursor - Pagination cursor (last notification id)
   * @param {boolean} options.unreadOnly - Only return unread
   * @returns {Promise<{ notifications: Notification[], nextCursor: string | null }>}
   */
  async getNotifications(userId, { limit = 20, cursor = null, unreadOnly = false } = {}) {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Mark notification(s) as read
   * @param {string} userId
   * @param {string|string[]} notificationIds - Single ID or array of IDs, or 'all'
   * @returns {Promise<number>} Number of notifications marked as read
   */
  async markAsRead(userId, notificationIds) {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Get unread notification count
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getUnreadCount(userId) {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Check if notifications should be grouped
   * Groups: multiple likes/comments on same post within 1 hour
   * @param {string} recipientId
   * @param {string} type
   * @param {Object} data
   * @returns {Promise<Notification|null>} Existing notification to group with, or null
   */
  async findGroupableNotification(recipientId, type, data) {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Push notification to connected client
   * @param {string} userId
   * @param {Notification} notification
   */
  pushToClient(userId, notification) {
    const connection = this.wsServer.getConnection(userId);
    if (connection) {
      connection.send(JSON.stringify({
        type: 'notification',
        payload: this.formatNotification(notification),
      }));
    }
  }

  /**
   * Format notification for client
   * @param {Notification} notification
   * @returns {Object}
   */
  formatNotification(notification) {
    // TODO: Implement - format grouped notifications nicely
    throw new Error('Not implemented');
  }
}

module.exports = { NotificationService };`,
      typescript: `// NotificationService.ts
// Notification service skeleton - implement the methods

import { db, Notification, NotificationDocument } from './database';
import { WebSocketServer } from './websocket';

interface CreateNotificationParams {
  recipientId: string;
  actorId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'reply';
  data: {
    postId?: string;
    commentId?: string;
    content?: string;
  };
}

interface GetNotificationsOptions {
  limit?: number;
  cursor?: string | null;
  unreadOnly?: boolean;
}

interface FormattedNotification {
  id: string;
  type: string;
  message: string;
  actors: { id: string; name: string; avatar: string }[];
  data: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  groupCount: number;
}

export class NotificationService {
  private wsServer: WebSocketServer;

  constructor() {
    this.wsServer = WebSocketServer.getInstance();
  }

  async createNotification(params: CreateNotificationParams): Promise<NotificationDocument> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async getNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<{ notifications: NotificationDocument[]; nextCursor: string | null }> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async markAsRead(userId: string, notificationIds: string | string[] | 'all'): Promise<number> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async getUnreadCount(userId: string): Promise<number> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findGroupableNotification(
    recipientId: string,
    type: string,
    data: Record<string, any>
  ): Promise<NotificationDocument | null> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  pushToClient(userId: string, notification: NotificationDocument): void {
    const connection = this.wsServer.getConnection(userId);
    if (connection) {
      connection.send(JSON.stringify({
        type: 'notification',
        payload: this.formatNotification(notification),
      }));
    }
  }

  formatNotification(notification: NotificationDocument): FormattedNotification {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'database.js',
          content: `// database.js
// Database models and connection

const mongoose = require('mongoose');

// User model (already exists)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: String,
  notificationPreferences: {
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    replies: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
});

// Notification model - you need to work with this
const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'mention', 'reply'],
    required: true,
  },
  // For grouped notifications, store multiple actors
  actors: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],
  // Reference to the related content
  data: {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    content: String, // Preview text for comments/mentions
  },
  isRead: { type: Boolean, default: false },
  // For grouping: notifications created within groupWindow can be merged
  groupKey: String, // e.g., "like:post:123" - unique per groupable event
  groupCount: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// TODO: Add indexes for performance
// Hint: You'll need indexes on recipientId, createdAt, isRead, groupKey

const User = mongoose.model('User', userSchema);
const Notification = mongoose.model('Notification', notificationSchema);

module.exports = {
  db: mongoose.connection,
  User,
  Notification,
};`,
          description: 'Database models - note the notification schema structure',
        },
        {
          fileName: 'websocket.js',
          content: `// websocket.js
// WebSocket server for real-time updates

const WebSocket = require('ws');

class WebSocketServer {
  static instance = null;

  constructor() {
    this.connections = new Map(); // userId -> WebSocket
    this.wss = null;
  }

  static getInstance() {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      // User ID is passed as query param after auth
      const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');

      if (userId) {
        this.connections.set(userId, ws);
        console.log(\`User \${userId} connected\`);

        ws.on('close', () => {
          this.connections.delete(userId);
          console.log(\`User \${userId} disconnected\`);
        });
      }
    });
  }

  getConnection(userId) {
    return this.connections.get(userId);
  }

  broadcast(message) {
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  isConnected(userId) {
    const ws = this.connections.get(userId);
    return ws && ws.readyState === WebSocket.OPEN;
  }
}

module.exports = { WebSocketServer };`,
          description: 'WebSocket server - use getConnection() and send()',
        },
        {
          fileName: 'NotificationService.test.js',
          content: `// NotificationService.test.js
// Tests for NotificationService

const { NotificationService } = require('./NotificationService');
const { Notification, User } = require('./database');

jest.mock('./websocket', () => ({
  WebSocketServer: {
    getInstance: () => ({
      getConnection: jest.fn().mockReturnValue({
        send: jest.fn(),
      }),
    }),
  },
}));

describe('NotificationService', () => {
  let service;
  let mockUser1, mockUser2, mockUser3;

  beforeAll(async () => {
    service = new NotificationService();

    // Create test users
    mockUser1 = await User.create({ email: 'user1@test.com', name: 'User One' });
    mockUser2 = await User.create({ email: 'user2@test.com', name: 'User Two' });
    mockUser3 = await User.create({ email: 'user3@test.com', name: 'User Three' });
  });

  afterEach(async () => {
    await Notification.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('createNotification', () => {
    test('should create a new notification', async () => {
      const notification = await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'follow',
        data: {},
      });

      expect(notification.recipientId.toString()).toBe(mockUser1._id.toString());
      expect(notification.type).toBe('follow');
      expect(notification.actors).toHaveLength(1);
      expect(notification.isRead).toBe(false);
    });

    test('should group similar notifications on same post', async () => {
      const postId = 'post_123';

      // First like
      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'like',
        data: { postId },
      });

      // Second like on same post (within grouping window)
      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser3._id.toString(),
        type: 'like',
        data: { postId },
      });

      // Should only have 1 notification with 2 actors
      const notifications = await Notification.find({
        recipientId: mockUser1._id
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].actors).toHaveLength(2);
      expect(notifications[0].groupCount).toBe(2);
    });

    test('should not group follow notifications', async () => {
      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'follow',
        data: {},
      });

      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser3._id.toString(),
        type: 'follow',
        data: {},
      });

      const notifications = await Notification.find({
        recipientId: mockUser1._id
      });

      expect(notifications).toHaveLength(2);
    });
  });

  describe('getNotifications', () => {
    test('should return notifications sorted by newest first', async () => {
      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'follow',
        data: {},
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser3._id.toString(),
        type: 'like',
        data: { postId: 'post_1' },
      });

      const { notifications } = await service.getNotifications(
        mockUser1._id.toString()
      );

      expect(notifications[0].type).toBe('like');
      expect(notifications[1].type).toBe('follow');
    });

    test('should paginate with cursor', async () => {
      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await service.createNotification({
          recipientId: mockUser1._id.toString(),
          actorId: mockUser2._id.toString(),
          type: 'like',
          data: { postId: \`post_\${i}\` },
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const page1 = await service.getNotifications(
        mockUser1._id.toString(),
        { limit: 2 }
      );

      expect(page1.notifications).toHaveLength(2);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await service.getNotifications(
        mockUser1._id.toString(),
        { limit: 2, cursor: page1.nextCursor }
      );

      expect(page2.notifications).toHaveLength(2);
      expect(page2.notifications[0]._id.toString())
        .not.toBe(page1.notifications[0]._id.toString());
    });

    test('should filter unread only', async () => {
      const n1 = await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'follow',
        data: {},
      });

      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser3._id.toString(),
        type: 'like',
        data: { postId: 'post_1' },
      });

      await service.markAsRead(mockUser1._id.toString(), n1._id.toString());

      const { notifications } = await service.getNotifications(
        mockUser1._id.toString(),
        { unreadOnly: true }
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('like');
    });
  });

  describe('markAsRead', () => {
    test('should mark single notification as read', async () => {
      const notification = await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'follow',
        data: {},
      });

      const count = await service.markAsRead(
        mockUser1._id.toString(),
        notification._id.toString()
      );

      expect(count).toBe(1);

      const updated = await Notification.findById(notification._id);
      expect(updated.isRead).toBe(true);
    });

    test('should mark all notifications as read', async () => {
      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'follow',
        data: {},
      });

      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser3._id.toString(),
        type: 'like',
        data: { postId: 'post_1' },
      });

      const count = await service.markAsRead(mockUser1._id.toString(), 'all');

      expect(count).toBe(2);

      const unreadCount = await service.getUnreadCount(mockUser1._id.toString());
      expect(unreadCount).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    test('should return correct unread count', async () => {
      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'follow',
        data: {},
      });

      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser3._id.toString(),
        type: 'like',
        data: { postId: 'post_1' },
      });

      const count = await service.getUnreadCount(mockUser1._id.toString());
      expect(count).toBe(2);
    });
  });

  describe('formatNotification', () => {
    test('should format single actor notification', async () => {
      const notification = await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'follow',
        data: {},
      });

      const formatted = service.formatNotification(notification);

      expect(formatted.message).toContain('User Two');
      expect(formatted.message).toContain('followed you');
    });

    test('should format grouped notification with multiple actors', async () => {
      await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser2._id.toString(),
        type: 'like',
        data: { postId: 'post_1' },
      });

      const notification = await service.createNotification({
        recipientId: mockUser1._id.toString(),
        actorId: mockUser3._id.toString(),
        type: 'like',
        data: { postId: 'post_1' },
      });

      const formatted = service.formatNotification(notification);

      expect(formatted.message).toContain('User Three');
      expect(formatted.message).toContain('1 other');
      expect(formatted.message).toContain('liked');
      expect(formatted.groupCount).toBe(2);
    });
  });
});`,
          description: 'Test file - all tests should pass when implementation is complete',
        },
        {
          fileName: 'EventHandler.js',
          content: `// EventHandler.js
// Event handlers that trigger notifications

const { NotificationService } = require('./NotificationService');

const notificationService = new NotificationService();

// Called when a user likes a post
async function handleLike(event) {
  const { postId, postAuthorId, likerId } = event;

  // Don't notify if user likes their own post
  if (postAuthorId === likerId) return;

  await notificationService.createNotification({
    recipientId: postAuthorId,
    actorId: likerId,
    type: 'like',
    data: { postId },
  });
}

// Called when a user comments on a post
async function handleComment(event) {
  const { postId, postAuthorId, commenterId, commentId, content } = event;

  if (postAuthorId === commenterId) return;

  await notificationService.createNotification({
    recipientId: postAuthorId,
    actorId: commenterId,
    type: 'comment',
    data: {
      postId,
      commentId,
      content: content.slice(0, 100), // Preview
    },
  });
}

// Called when a user follows another user
async function handleFollow(event) {
  const { followedId, followerId } = event;

  await notificationService.createNotification({
    recipientId: followedId,
    actorId: followerId,
    type: 'follow',
    data: {},
  });
}

// Called when a user is mentioned in a post/comment
async function handleMention(event) {
  const { mentionedUserId, mentionerId, postId, content } = event;

  await notificationService.createNotification({
    recipientId: mentionedUserId,
    actorId: mentionerId,
    type: 'mention',
    data: {
      postId,
      content: content.slice(0, 100),
    },
  });
}

module.exports = {
  handleLike,
  handleComment,
  handleFollow,
  handleMention,
};`,
          description: 'Event handlers that will call your NotificationService',
        },
      ],
      typescript: [
        {
          fileName: 'database.ts',
          content: `// database.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface UserDocument extends Document {
  email: string;
  name: string;
  avatar?: string;
  notificationPreferences: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    mentions: boolean;
    replies: boolean;
  };
  createdAt: Date;
}

export interface NotificationDocument extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'reply';
  actors: Array<{
    userId: mongoose.Types.ObjectId;
    addedAt: Date;
  }>;
  data: {
    postId?: mongoose.Types.ObjectId;
    commentId?: mongoose.Types.ObjectId;
    content?: string;
  };
  isRead: boolean;
  groupKey?: string;
  groupCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: String,
  notificationPreferences: {
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    replies: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
});

const notificationSchema = new Schema<NotificationDocument>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'mention', 'reply'],
    required: true,
  },
  actors: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],
  data: {
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    content: String,
  },
  isRead: { type: Boolean, default: false },
  groupKey: String,
  groupCount: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<UserDocument>('User', userSchema);
export const Notification = mongoose.model<NotificationDocument>('Notification', notificationSchema);
export const db = mongoose.connection;`,
          description: 'TypeScript database models with types',
        },
      ],
    },
    hints: [
      'Use a groupKey like "like:post:123" to identify groupable notifications',
      'Only group likes and comments on the same post, not follows or mentions',
      'Use findOneAndUpdate with upsert for atomic group-or-create operations',
      'Add compound index on (recipientId, createdAt, isRead) for efficient queries',
      'Format messages like: "User and 5 others liked your post"',
    ],
    testCases: [
      {
        input: { type: 'like', postId: 'post_1', actors: ['user1', 'user2'] },
        expected: { groupCount: 2, notificationCount: 1 },
        description: 'Multiple likes on same post should be grouped',
      },
      {
        input: { type: 'follow', actors: ['user1', 'user2'] },
        expected: { notificationCount: 2 },
        description: 'Follow notifications should not be grouped',
      },
      {
        input: { limit: 10, totalNotifications: 25 },
        expected: { returned: 10, hasNextCursor: true },
        description: 'Pagination should work correctly',
      },
    ],
    acceptanceCriteria: [
      'All test cases pass',
      'Notifications are delivered within 500ms',
      'Grouped notifications show correct message format',
      'Unread count is accurate',
      'Proper indexes are added for query performance',
    ],
  },

  // =============================================================================
  // SIMPLER TESTABLE ADD-FUNCTIONALITY SCENARIOS
  // These are pure functions that can be tested with the current execution engine
  // =============================================================================

  {
    id: 'add-feature-cache-system',
    title: 'Add TTL Expiration to Cache',
    type: 'add-functionality',
    difficulty: 'medium',
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    description: 'Add time-to-live (TTL) expiration feature to an existing cache system',
    tags: ['cache', 'data-structures', 'time-based'],
    estimatedTime: 30,
    problemStatement: `You're working on a caching system. The existing cache supports get/set operations but doesn't support TTL expiration.

**Your task:**
1. Read the existing cache implementation
2. Add TTL support: entries should expire after a specified duration
3. Modify the get method to check expiration
4. Ensure expired entries don't count toward cache size
5. All existing tests must still pass

**Context:** This cache is used by multiple microservices. TTL is critical for avoiding stale data.`,
    featureRequirements: [
      'set(key, value, ttlMs) - store with optional TTL in milliseconds',
      'get(key) - returns null if expired or not found',
      'has(key) - returns false if expired',
      'delete(key) - removes entry',
      'size() - returns count of non-expired entries',
      'cleanup() - removes all expired entries',
    ],
    existingCode: {
      javascript: `// cache.js - Simple cache implementation
// TODO: Add TTL (time-to-live) expiration support

class Cache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.store = new Map();
  }

  /**
   * Store a value in the cache
   * @param {string} key - The cache key
   * @param {any} value - The value to store
   * @param {number} ttlMs - Time to live in milliseconds (optional)
   */
  set(key, value, ttlMs = null) {
    // TODO: Implement TTL support
    // Store the value along with expiration time if ttlMs is provided
    if (this.store.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    this.store.set(key, value);
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {any} The cached value or null if not found/expired
   */
  get(key) {
    // TODO: Check if entry is expired before returning
    return this.store.get(key) || null;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - The cache key
   * @returns {boolean}
   */
  has(key) {
    // TODO: Return false if expired
    return this.store.has(key);
  }

  /**
   * Delete a key from the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Get count of non-expired entries
   * @returns {number}
   */
  size() {
    // TODO: Only count non-expired entries
    return this.store.size;
  }

  /**
   * Remove all expired entries
   * @returns {number} Number of entries removed
   */
  cleanup() {
    // TODO: Implement cleanup of expired entries
    return 0;
  }
}

// Test helper function - DO NOT MODIFY
function testCache(operations) {
  const cache = new Cache(10);
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'set':
        cache.set(op.key, op.value, op.ttl);
        results.push({ type: 'set', key: op.key });
        break;
      case 'get':
        results.push({ type: 'get', key: op.key, value: cache.get(op.key) });
        break;
      case 'has':
        results.push({ type: 'has', key: op.key, exists: cache.has(op.key) });
        break;
      case 'size':
        results.push({ type: 'size', count: cache.size() });
        break;
      case 'wait':
        // Simulate time passing (in test mode, we manipulate time)
        if (typeof op.ms === 'number') {
          // Advance mock time
          global.__mockTime = (global.__mockTime || Date.now()) + op.ms;
        }
        break;
      case 'cleanup':
        results.push({ type: 'cleanup', removed: cache.cleanup() });
        break;
    }
  }

  return results;
}`,
      python: `# cache.py - Simple cache implementation
# TODO: Add TTL (time-to-live) expiration support

import time

class Cache:
    def __init__(self, max_size=100):
        self.max_size = max_size
        self.store = {}

    def set(self, key, value, ttl_ms=None):
        """
        Store a value in the cache
        Args:
            key: The cache key
            value: The value to store
            ttl_ms: Time to live in milliseconds (optional)
        """
        # TODO: Implement TTL support
        # Store the value along with expiration time if ttl_ms is provided
        if len(self.store) >= self.max_size:
            # Remove first entry (oldest)
            first_key = next(iter(self.store))
            del self.store[first_key]
        self.store[key] = value

    def get(self, key):
        """
        Get a value from the cache
        Returns: The cached value or None if not found/expired
        """
        # TODO: Check if entry is expired before returning
        return self.store.get(key)

    def has(self, key):
        """Check if key exists and is not expired"""
        # TODO: Return False if expired
        return key in self.store

    def delete(self, key):
        """Delete a key from the cache"""
        if key in self.store:
            del self.store[key]
            return True
        return False

    def size(self):
        """Get count of non-expired entries"""
        # TODO: Only count non-expired entries
        return len(self.store)

    def cleanup(self):
        """Remove all expired entries"""
        # TODO: Implement cleanup of expired entries
        return 0


# Test helper function - DO NOT MODIFY
def test_cache(operations):
    cache = Cache(10)
    results = []

    for op in operations:
        if op['type'] == 'set':
            cache.set(op['key'], op['value'], op.get('ttl'))
            results.append({'type': 'set', 'key': op['key']})
        elif op['type'] == 'get':
            results.append({'type': 'get', 'key': op['key'], 'value': cache.get(op['key'])})
        elif op['type'] == 'has':
            results.append({'type': 'has', 'key': op['key'], 'exists': cache.has(op['key'])})
        elif op['type'] == 'size':
            results.append({'type': 'size', 'count': cache.size()})
        elif op['type'] == 'cleanup':
            results.append({'type': 'cleanup', 'removed': cache.cleanup()})

    return results`,
    },
    codebaseFiles: {
      javascript: [
        {
          fileName: 'utils/time.js',
          content: `// Time utilities for cache
// Use these for time-based operations

function getCurrentTime() {
  // In tests, this may return mock time
  return global.__mockTime || Date.now();
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return getCurrentTime() >= expiresAt;
}

module.exports = { getCurrentTime, isExpired };`,
          description: 'Time utilities - use getCurrentTime() instead of Date.now() for testability',
        },
      ],
      python: [
        {
          fileName: 'utils/time_utils.py',
          content: `# Time utilities for cache
# Use these for time-based operations

_mock_time = None

def get_current_time():
    """Returns current time in milliseconds"""
    global _mock_time
    if _mock_time is not None:
        return _mock_time
    return int(time.time() * 1000)

def is_expired(expires_at):
    """Check if a timestamp has expired"""
    if expires_at is None:
        return False
    return get_current_time() >= expires_at`,
          description: 'Time utilities - use get_current_time() for testability',
        },
      ],
    },
    hints: [
      'Store expiration timestamp along with value (e.g., { value, expiresAt })',
      'Calculate expiresAt as getCurrentTime() + ttlMs when setting',
      'In get(), check if entry exists AND is not expired',
      'Use the isExpired() utility from time.js',
      'For cleanup(), iterate through entries and delete expired ones',
    ],
    testCases: [
      {
        input: { operations: [
          { type: 'set', key: 'a', value: 1 },
          { type: 'get', key: 'a' }
        ]},
        expected: [
          { type: 'set', key: 'a' },
          { type: 'get', key: 'a', value: 1 }
        ],
        description: 'Basic set and get without TTL',
      },
      {
        input: { operations: [
          { type: 'set', key: 'b', value: 2 },
          { type: 'has', key: 'b' },
          { type: 'has', key: 'c' }
        ]},
        expected: [
          { type: 'set', key: 'b' },
          { type: 'has', key: 'b', exists: true },
          { type: 'has', key: 'c', exists: false }
        ],
        description: 'has() returns correct boolean',
      },
      {
        input: { operations: [
          { type: 'set', key: 'x', value: 10 },
          { type: 'set', key: 'y', value: 20 },
          { type: 'size' }
        ]},
        expected: [
          { type: 'set', key: 'x' },
          { type: 'set', key: 'y' },
          { type: 'size', count: 2 }
        ],
        description: 'size() returns correct count',
      },
    ],
    acceptanceCriteria: [
      'All existing functionality still works',
      'TTL expiration works correctly',
      'Expired entries are not returned by get()',
      'size() only counts non-expired entries',
      'cleanup() removes expired entries',
    ],
  },

  {
    id: 'add-feature-rate-limiter',
    title: 'Add Sliding Window Rate Limiter',
    type: 'add-functionality',
    difficulty: 'medium',
    companies: ['Amazon', 'Google', 'Stripe', 'Cloudflare'],
    description: 'Implement a sliding window rate limiter for API requests',
    tags: ['rate-limiting', 'algorithms', 'api'],
    estimatedTime: 30,
    problemStatement: `You're building an API rate limiter. The existing implementation uses a fixed window, which allows request bursts at window boundaries.

**Your task:**
1. Implement a sliding window rate limiter
2. The limiter should allow N requests per window (e.g., 100 requests per minute)
3. Use sliding window algorithm to avoid burst issues
4. Return remaining quota and reset time with each check

**Context:** This rate limiter protects backend services from abuse. Accurate limiting is critical.`,
    featureRequirements: [
      'isAllowed(clientId) - check if request is allowed',
      'Sliding window algorithm (not fixed window)',
      'Return { allowed, remaining, resetTime } from check',
      'Support configurable limits per client',
      'Efficient cleanup of old entries',
    ],
    existingCode: {
      javascript: `// rate-limiter.js - Implement sliding window rate limiter

class RateLimiter {
  /**
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Window size in milliseconds
   */
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map(); // clientId -> request timestamps
  }

  /**
   * Check if a request is allowed for the given client
   * @param {string} clientId - Unique client identifier
   * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
   */
  isAllowed(clientId) {
    // TODO: Implement sliding window rate limiting
    // 1. Get current timestamp
    // 2. Clean up old timestamps outside the window
    // 3. Check if client has exceeded limit
    // 4. If allowed, record the new request
    // 5. Return { allowed, remaining, resetTime }

    return {
      allowed: true,
      remaining: this.maxRequests,
      resetTime: Date.now() + this.windowMs
    };
  }

  /**
   * Get current usage for a client
   * @param {string} clientId
   * @returns {{ used: number, remaining: number }}
   */
  getUsage(clientId) {
    // TODO: Return current usage stats
    return {
      used: 0,
      remaining: this.maxRequests
    };
  }

  /**
   * Reset limits for a client
   * @param {string} clientId
   */
  reset(clientId) {
    this.clients.delete(clientId);
  }

  /**
   * Clean up old entries to prevent memory leaks
   * @returns {number} Number of entries cleaned up
   */
  cleanup() {
    // TODO: Remove timestamps older than windowMs for all clients
    return 0;
  }
}

// Test function - DO NOT MODIFY
function testRateLimiter(config, requests) {
  const limiter = new RateLimiter(config.maxRequests, config.windowMs);
  const results = [];

  for (const req of requests) {
    if (req.type === 'check') {
      const result = limiter.isAllowed(req.clientId);
      results.push({
        clientId: req.clientId,
        ...result
      });
    } else if (req.type === 'usage') {
      results.push({
        clientId: req.clientId,
        ...limiter.getUsage(req.clientId)
      });
    } else if (req.type === 'reset') {
      limiter.reset(req.clientId);
      results.push({ clientId: req.clientId, reset: true });
    }
  }

  return results;
}`,
      python: `# rate_limiter.py - Implement sliding window rate limiter

import time

class RateLimiter:
    def __init__(self, max_requests=100, window_ms=60000):
        """
        Args:
            max_requests: Maximum requests per window
            window_ms: Window size in milliseconds
        """
        self.max_requests = max_requests
        self.window_ms = window_ms
        self.clients = {}  # clientId -> list of request timestamps

    def is_allowed(self, client_id):
        """
        Check if a request is allowed for the given client
        Returns: { 'allowed': bool, 'remaining': int, 'reset_time': int }
        """
        # TODO: Implement sliding window rate limiting
        # 1. Get current timestamp
        # 2. Clean up old timestamps outside the window
        # 3. Check if client has exceeded limit
        # 4. If allowed, record the new request
        # 5. Return { allowed, remaining, reset_time }

        return {
            'allowed': True,
            'remaining': self.max_requests,
            'reset_time': int(time.time() * 1000) + self.window_ms
        }

    def get_usage(self, client_id):
        """Get current usage for a client"""
        # TODO: Return current usage stats
        return {
            'used': 0,
            'remaining': self.max_requests
        }

    def reset(self, client_id):
        """Reset limits for a client"""
        if client_id in self.clients:
            del self.clients[client_id]

    def cleanup(self):
        """Clean up old entries to prevent memory leaks"""
        # TODO: Remove timestamps older than window_ms for all clients
        return 0


# Test function - DO NOT MODIFY
def test_rate_limiter(config, requests):
    limiter = RateLimiter(config['max_requests'], config['window_ms'])
    results = []

    for req in requests:
        if req['type'] == 'check':
            result = limiter.is_allowed(req['client_id'])
            results.append({
                'client_id': req['client_id'],
                **result
            })
        elif req['type'] == 'usage':
            result = limiter.get_usage(req['client_id'])
            results.append({
                'client_id': req['client_id'],
                **result
            })
        elif req['type'] == 'reset':
            limiter.reset(req['client_id'])
            results.append({'client_id': req['client_id'], 'reset': True})

    return results`,
    },
    codebaseFiles: {
      javascript: [],
      python: [],
    },
    hints: [
      'Store request timestamps in an array for each client',
      'Filter out timestamps older than (now - windowMs)',
      'Compare array length against maxRequests',
      'Add current timestamp if request is allowed',
      'resetTime is the oldest timestamp + windowMs',
    ],
    testCases: [
      {
        input: {
          config: { maxRequests: 3, windowMs: 60000 },
          requests: [
            { type: 'check', clientId: 'user1' },
            { type: 'check', clientId: 'user1' },
            { type: 'check', clientId: 'user1' }
          ]
        },
        expected: [
          { clientId: 'user1', allowed: true, remaining: 2 },
          { clientId: 'user1', allowed: true, remaining: 1 },
          { clientId: 'user1', allowed: true, remaining: 0 }
        ],
        description: 'Allows requests up to limit',
        orderMatters: false,
      },
      {
        input: {
          config: { maxRequests: 2, windowMs: 60000 },
          requests: [
            { type: 'check', clientId: 'user1' },
            { type: 'check', clientId: 'user1' },
            { type: 'check', clientId: 'user1' }
          ]
        },
        expected: [
          { clientId: 'user1', allowed: true },
          { clientId: 'user1', allowed: true },
          { clientId: 'user1', allowed: false }
        ],
        description: 'Blocks requests over limit',
        orderMatters: false,
      },
    ],
    acceptanceCriteria: [
      'Sliding window algorithm implemented correctly',
      'Returns accurate remaining count',
      'Blocks requests when limit exceeded',
      'Different clients have independent limits',
      'cleanup() removes old entries',
    ],
  },

  {
    id: 'add-feature-text-search',
    title: 'Add Fuzzy Search to Text Matcher',
    type: 'add-functionality',
    difficulty: 'medium',
    companies: ['Google', 'Algolia', 'Elasticsearch', 'Meta'],
    description: 'Add fuzzy matching capability to a text search system',
    tags: ['search', 'algorithms', 'string-matching'],
    estimatedTime: 35,
    problemStatement: `You're working on a search system. The existing implementation only supports exact substring matching. Users want fuzzy search that tolerates typos.

**Your task:**
1. Implement fuzzy string matching using edit distance (Levenshtein)
2. Add a threshold parameter for match tolerance
3. Rank results by relevance (exact matches first, then by edit distance)
4. Keep existing exact match functionality working

**Context:** This powers the search-as-you-type feature. Performance matters for large datasets.`,
    featureRequirements: [
      'Implement Levenshtein distance calculation',
      'search(query, maxDistance) - returns fuzzy matches',
      'Results sorted by relevance (lower distance = higher rank)',
      'Exact matches should have distance of 0',
      'Support configurable max edit distance threshold',
    ],
    existingCode: {
      javascript: `// text-search.js - Add fuzzy matching

class TextSearch {
  constructor() {
    this.items = [];
  }

  /**
   * Add items to the search index
   * @param {string[]} items - Array of strings to index
   */
  addItems(items) {
    this.items = [...this.items, ...items];
  }

  /**
   * Calculate Levenshtein (edit) distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Edit distance
   */
  editDistance(a, b) {
    // TODO: Implement Levenshtein distance algorithm
    // This should return the minimum number of single-character edits
    // (insertions, deletions, substitutions) to transform a into b
    return 0;
  }

  /**
   * Search for items matching the query
   * @param {string} query - Search query
   * @param {number} maxDistance - Maximum edit distance (0 = exact match only)
   * @returns {{ item: string, distance: number }[]} Sorted by distance
   */
  search(query, maxDistance = 2) {
    // TODO: Implement fuzzy search
    // 1. Calculate edit distance for each item
    // 2. Filter items within maxDistance
    // 3. Sort by distance (ascending)
    // 4. Return array of { item, distance }

    return [];
  }

  /**
   * Find exact matches (existing functionality - DO NOT MODIFY)
   * @param {string} query
   * @returns {string[]}
   */
  exactMatch(query) {
    return this.items.filter(item =>
      item.toLowerCase().includes(query.toLowerCase())
    );
  }
}

// Test function - DO NOT MODIFY
function testTextSearch(items, queries) {
  const search = new TextSearch();
  search.addItems(items);

  return queries.map(q => ({
    query: q.query,
    maxDistance: q.maxDistance,
    results: search.search(q.query, q.maxDistance)
  }));
}`,
      python: `# text_search.py - Add fuzzy matching

class TextSearch:
    def __init__(self):
        self.items = []

    def add_items(self, items):
        """Add items to the search index"""
        self.items.extend(items)

    def edit_distance(self, a, b):
        """
        Calculate Levenshtein (edit) distance between two strings
        Returns: Edit distance (minimum single-character edits)
        """
        # TODO: Implement Levenshtein distance algorithm
        # This should return the minimum number of single-character edits
        # (insertions, deletions, substitutions) to transform a into b
        return 0

    def search(self, query, max_distance=2):
        """
        Search for items matching the query
        Args:
            query: Search query
            max_distance: Maximum edit distance (0 = exact match only)
        Returns: List of { 'item': str, 'distance': int } sorted by distance
        """
        # TODO: Implement fuzzy search
        # 1. Calculate edit distance for each item
        # 2. Filter items within max_distance
        # 3. Sort by distance (ascending)
        # 4. Return list of { item, distance }

        return []

    def exact_match(self, query):
        """Find exact matches (existing functionality - DO NOT MODIFY)"""
        query_lower = query.lower()
        return [item for item in self.items if query_lower in item.lower()]


# Test function - DO NOT MODIFY
def test_text_search(items, queries):
    search = TextSearch()
    search.add_items(items)

    return [
        {
            'query': q['query'],
            'max_distance': q['max_distance'],
            'results': search.search(q['query'], q['max_distance'])
        }
        for q in queries
    ]`,
    },
    codebaseFiles: {
      javascript: [],
      python: [],
    },
    hints: [
      'Use dynamic programming for edit distance: dp[i][j] = min edits to transform a[0:i] to b[0:j]',
      'Base cases: dp[i][0] = i, dp[0][j] = j',
      'Transition: if a[i-1] == b[j-1], dp[i][j] = dp[i-1][j-1], else min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1',
      'For search(), compare query against each item name (case-insensitive)',
      'Filter results where distance <= maxDistance, then sort',
    ],
    testCases: [
      {
        input: {
          items: ['apple', 'banana', 'grape'],
          queries: [{ query: 'apple', maxDistance: 0 }]
        },
        expected: [
          { query: 'apple', maxDistance: 0, results: [{ item: 'apple', distance: 0 }] }
        ],
        description: 'Exact match has distance 0',
      },
      {
        input: {
          items: ['apple', 'apply', 'maple'],
          queries: [{ query: 'aple', maxDistance: 1 }]
        },
        expected: [
          { query: 'aple', maxDistance: 1, results: [{ item: 'apple', distance: 1 }] }
        ],
        description: 'Finds items within edit distance 1',
      },
      {
        input: {
          items: ['cat', 'bat', 'rat', 'car'],
          queries: [{ query: 'cat', maxDistance: 1 }]
        },
        expected: [
          { query: 'cat', maxDistance: 1, results: [
            { item: 'cat', distance: 0 },
            { item: 'bat', distance: 1 },
            { item: 'rat', distance: 1 },
            { item: 'car', distance: 1 }
          ]}
        ],
        description: 'Returns multiple matches sorted by distance',
      },
    ],
    acceptanceCriteria: [
      'Edit distance calculation is correct',
      'Fuzzy search returns relevant results',
      'Results sorted by distance (ascending)',
      'Exact matches have distance of 0',
      'maxDistance parameter works correctly',
    ],
  },
];

export default addFunctionalityScenarios;
