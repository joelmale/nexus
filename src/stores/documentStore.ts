/**
 * Document Store - Zustand store for managing document state
 *
 * This store manages the state of documents from NexusCodex, including:
 * - Document library (list of documents)
 * - Currently viewed document
 * - Search results
 * - Upload/download progress
 * - Document filters
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { documentService, type Document, type DocumentType, type SearchResult, type QuickSearchResult } from '@/services/documentService';

/**
 * Document upload progress
 */
export interface UploadProgress {
  documentId?: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * Document filters for library view
 */
export interface DocumentFilters {
  search?: string;
  type?: DocumentType;
  campaign?: string;
  tag?: string;
  skip: number;
  limit: number;
}

/**
 * Document store state
 */
export interface DocumentStoreState {
  // Document library
  documents: Document[];
  totalDocuments: number;
  filters: DocumentFilters;
  isLoadingDocuments: boolean;
  documentsError: string | null;
  documentsAvailable: boolean;
  documentsUnavailableReason: string | null;

  // Currently viewed document
  currentDocument: Document | null;
  currentDocumentContent: string | null;
  isLoadingDocument: boolean;

  // Search
  searchResults: SearchResult[];
  quickSearchResults: QuickSearchResult[];
  searchQuery: string;
  isSearching: boolean;
  searchError: string | null;

  // Upload
  uploadQueue: UploadProgress[];

  // Actions
  loadDocuments: (force?: boolean) => Promise<void>;
  setFilters: (filters: Partial<DocumentFilters>) => void;
  resetFilters: () => void;

  searchDocuments: (query: string, filters?: { type?: DocumentType; campaigns?: string[]; tags?: string[] }) => Promise<void>;
  quickSearch: (query: string, campaign?: string) => Promise<void>;
  clearSearch: () => void;

  openDocument: (documentId: string) => Promise<void>;
  closeDocument: () => void;

  uploadDocument: (file: File, metadata: {
    title: string;
    description?: string;
    type: DocumentType;
    author?: string;
    tags?: string[];
    campaigns?: string[];
  }) => Promise<Document>;

  updateDocument: (documentId: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;

  reset: () => void;
}

/**
 * Default filters
 */
const defaultFilters: DocumentFilters = {
  skip: 0,
  limit: 50,
};

/**
 * Initial state
 */
const initialState = {
  documents: [],
  totalDocuments: 0,
  filters: { ...defaultFilters },
  isLoadingDocuments: false,
  documentsError: null,
  documentsAvailable: true,
  documentsUnavailableReason: null,

  currentDocument: null,
  currentDocumentContent: null,
  isLoadingDocument: false,

  searchResults: [],
  quickSearchResults: [],
  searchQuery: '',
  isSearching: false,
  searchError: null,

  uploadQueue: [],
};

/**
 * Document store
 */
export const useDocumentStore = create<DocumentStoreState>()(
  immer((set, get) => ({
    ...initialState,

    /**
     * Load documents with current filters
     */
    loadDocuments: async (force = false) => {
      set((state) => {
        state.isLoadingDocuments = true;
        state.documentsError = null;
      });

      try {
        const { filters, documentsAvailable, documentsUnavailableReason } =
          get();

        // If the document service is known to be unavailable, avoid spamming requests unless forced
        if (!force && !documentsAvailable && documentsUnavailableReason) {
          set((state) => {
            state.isLoadingDocuments = false;
            state.documentsError = documentsUnavailableReason;
          });
          return;
        }

        const response = await documentService.listDocuments(filters);

        set((state) => {
          state.documents = response.documents;
          state.totalDocuments = response.pagination.total;
          state.isLoadingDocuments = false;
          state.documentsAvailable = true;
          state.documentsUnavailableReason = null;
        });
      } catch (error) {
        console.error('Failed to load documents:', error);
        set((state) => {
          const message =
            error instanceof Error ? error.message : 'Failed to load documents';
          state.documentsError = message;
          // Flag the document service as unavailable when we detect it, so the UI can degrade gracefully
          if (
            message.includes('Document service unavailable') ||
            message.toLowerCase().includes('fetch failed') ||
            message.includes('ECONNREFUSED') ||
            message.includes('Request failed: 503')
          ) {
            state.documentsAvailable = false;
            state.documentsUnavailableReason = message;
          }
          state.isLoadingDocuments = false;
        });
      }
    },

    /**
     * Update filters and reload documents
     */
    setFilters: (newFilters: Partial<DocumentFilters>) => {
      set((state) => {
        state.filters = { ...state.filters, ...newFilters };
        // Reset to first page when filters change
        if (newFilters.search !== undefined || newFilters.type !== undefined || newFilters.campaign !== undefined || newFilters.tag !== undefined) {
          state.filters.skip = 0;
        }
      });
      get().loadDocuments();
    },

    /**
     * Reset filters to defaults
     */
    resetFilters: () => {
      set((state) => {
        state.filters = { ...defaultFilters };
      });
      get().loadDocuments();
    },

    /**
     * Search documents with full-text search
     */
    searchDocuments: async (query: string, filters?: { type?: DocumentType; campaigns?: string[]; tags?: string[] }) => {
      set((state) => {
        state.isSearching = true;
        state.searchError = null;
        state.searchQuery = query;
      });

      try {
        const { documentsAvailable, documentsUnavailableReason } = get();
        if (!documentsAvailable && documentsUnavailableReason) {
          throw new Error(documentsUnavailableReason);
        }

        const response = await documentService.searchDocuments({
          query,
          ...filters,
          from: 0,
          size: 20,
        });

        set((state) => {
          state.searchResults = response.results;
          state.isSearching = false;
          state.documentsAvailable = true;
          state.documentsUnavailableReason = null;
        });
      } catch (error) {
        console.error('Search failed:', error);
        set((state) => {
          const message = error instanceof Error ? error.message : 'Search failed';
          state.searchError = message;
          if (
            message.includes('Document service unavailable') ||
            message.toLowerCase().includes('fetch failed') ||
            message.includes('ECONNREFUSED') ||
            message.includes('Request failed: 503')
          ) {
            state.documentsAvailable = false;
            state.documentsUnavailableReason = message;
          }
          state.isSearching = false;
        });
      }
    },

    /**
     * Quick search for top results
     */
    quickSearch: async (query: string, campaign?: string) => {
      set((state) => {
        state.isSearching = true;
        state.searchError = null;
        state.searchQuery = query;
      });

      try {
        const { documentsAvailable, documentsUnavailableReason } = get();
        if (!documentsAvailable && documentsUnavailableReason) {
          throw new Error(documentsUnavailableReason);
        }

        const response = await documentService.quickSearch(query, campaign, 5);

        set((state) => {
          state.quickSearchResults = response.results;
          state.isSearching = false;
          state.documentsAvailable = true;
          state.documentsUnavailableReason = null;
        });
      } catch (error) {
        console.error('Quick search failed:', error);
        set((state) => {
          const message =
            error instanceof Error ? error.message : 'Quick search failed';
          state.searchError = message;
          if (
            message.includes('Document service unavailable') ||
            message.toLowerCase().includes('fetch failed') ||
            message.includes('ECONNREFUSED') ||
            message.includes('Request failed: 503')
          ) {
            state.documentsAvailable = false;
            state.documentsUnavailableReason = message;
          }
          state.isSearching = false;
        });
      }
    },

    /**
     * Clear search results
     */
    clearSearch: () => {
      set((state) => {
        state.searchResults = [];
        state.quickSearchResults = [];
        state.searchQuery = '';
        state.searchError = null;
      });
    },

    /**
     * Open a document for viewing
     */
    openDocument: async (documentId: string) => {
      set((state) => {
        state.isLoadingDocument = true;
      });

      try {
        const { documentsAvailable, documentsUnavailableReason } = get();
        if (!documentsAvailable && documentsUnavailableReason) {
          throw new Error(documentsUnavailableReason);
        }

        const document = await documentService.getDocument(documentId);
        const contentUrl = await documentService.getDocumentContentUrl(documentId);

        set((state) => {
          state.currentDocument = document;
          state.currentDocumentContent = contentUrl;
          state.isLoadingDocument = false;
        });
      } catch (error) {
        console.error('Failed to open document:', error);
        set((state) => {
          state.isLoadingDocument = false;
        });
        throw error;
      }
    },

    /**
     * Close the currently viewed document
     */
    closeDocument: () => {
      set((state) => {
        state.currentDocument = null;
        state.currentDocumentContent = null;
      });
    },

    /**
     * Upload a new document
     */
    uploadDocument: async (file: File, metadata) => {
      const { documentsAvailable, documentsUnavailableReason } = get();
      if (!documentsAvailable && documentsUnavailableReason) {
        throw new Error(documentsUnavailableReason);
      }

      // Add to upload queue
      set((state) => {
        state.uploadQueue.push({
          fileName: file.name,
          progress: 0,
          status: 'pending',
        });
      });

      try {
        // Update progress
        set((state) => {
          const upload = state.uploadQueue.find(u => u.fileName === file.name);
          if (upload) {
            upload.status = 'uploading';
            upload.progress = 10;
          }
        });

        // Create document and get upload URL
        const response = await documentService.createDocument({
          ...metadata,
          fileSize: file.size,
          fileName: file.name,
          format: file.type === 'application/pdf' ? 'pdf' : 'html',
        });

        set((state) => {
          const upload = state.uploadQueue.find(u => u.fileName === file.name);
          if (upload) {
            upload.documentId = response.document.id;
            upload.progress = 30;
          }
        });

        // Upload file to S3
        await documentService.uploadFile(response.uploadUrl, file);

        set((state) => {
          const upload = state.uploadQueue.find(u => u.fileName === file.name);
          if (upload) {
            upload.progress = 80;
            upload.status = 'processing';
          }
        });

        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mark as completed
        set((state) => {
          const upload = state.uploadQueue.find(u => u.fileName === file.name);
          if (upload) {
            upload.progress = 100;
            upload.status = 'completed';
          }
        });

        // Remove from queue after a delay
        setTimeout(() => {
          set((state) => {
            state.uploadQueue = state.uploadQueue.filter(u => u.fileName !== file.name);
          });
        }, 3000);

        // Reload documents
        get().loadDocuments();

        return response.document;
      } catch (error) {
        console.error('Upload failed:', error);

        set((state) => {
          const upload = state.uploadQueue.find(u => u.fileName === file.name);
          if (upload) {
            upload.status = 'error';
            upload.error = error instanceof Error ? error.message : 'Upload failed';
          }
        });

        throw error;
      }
    },

    /**
     * Update document metadata
     */
    updateDocument: async (documentId: string, updates: Partial<Document>) => {
      try {
        const { documentsAvailable, documentsUnavailableReason } = get();
        if (!documentsAvailable && documentsUnavailableReason) {
          throw new Error(documentsUnavailableReason);
        }

        const updated = await documentService.updateDocument(documentId, updates);

        set((state) => {
          // Update in documents list
          const index = state.documents.findIndex(d => d.id === documentId);
          if (index !== -1) {
            state.documents[index] = updated;
          }

          // Update current document if it's open
          if (state.currentDocument?.id === documentId) {
            state.currentDocument = updated;
          }
        });
      } catch (error) {
        console.error('Failed to update document:', error);
        throw error;
      }
    },

    /**
     * Delete a document
     */
    deleteDocument: async (documentId: string) => {
      try {
        const { documentsAvailable, documentsUnavailableReason } = get();
        if (!documentsAvailable && documentsUnavailableReason) {
          throw new Error(documentsUnavailableReason);
        }

        await documentService.deleteDocument(documentId);

        set((state) => {
          // Remove from documents list
          state.documents = state.documents.filter(d => d.id !== documentId);
          state.totalDocuments--;

          // Close if currently open
          if (state.currentDocument?.id === documentId) {
            state.currentDocument = null;
            state.currentDocumentContent = null;
          }
        });
      } catch (error) {
        console.error('Failed to delete document:', error);
        throw error;
      }
    },

    /**
     * Reset store to initial state
     */
    reset: () => {
      set(initialState);
    },
  }))
);
