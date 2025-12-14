/**
 * Document Service - Frontend API client for NexusCodex documents
 *
 * This service provides document management capabilities to the Nexus VTT frontend
 * by communicating with the Nexus VTT backend, which acts as an authenticated proxy
 * to the separate NexusCodex microservices.
 */

/**
 * Document type from NexusCodex
 */
export type DocumentType =
  | 'rulebook'
  | 'campaign_note'
  | 'handout'
  | 'map'
  | 'character_sheet'
  | 'homebrew';

/**
 * Document format
 */
export type DocumentFormat = 'pdf' | 'markdown' | 'html';

/**
 * Document metadata
 */
export interface Document {
  id: string;
  title: string;
  description: string;
  type: DocumentType;
  format: DocumentFormat;
  storageKey: string;
  fileSize: number;
  author?: string;
  uploadedBy: string;
  tags: string[];
  collections: string[];
  campaigns: string[];
  isPublic: boolean;
  metadata: Record<string, unknown>;
  uploadedAt: Date;
  updatedAt: Date;
  thumbnailKey?: string;
}

/**
 * Parameters for creating a new document
 */
export interface CreateDocumentParams {
  title: string;
  description?: string;
  type: DocumentType;
  format: DocumentFormat;
  author?: string;
  tags?: string[];
  collections?: string[];
  campaigns?: string[];
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
  fileSize: number;
  fileName: string;
}

/**
 * Response from creating a document
 */
export interface CreateDocumentResponse {
  document: Document;
  uploadUrl: string;
  expiresIn: number;
}

/**
 * Parameters for listing documents
 */
export interface ListDocumentsParams {
  skip?: number;
  limit?: number;
  type?: DocumentType;
  campaign?: string;
  tag?: string;
  search?: string;
}

/**
 * Response from listing documents
 */
export interface ListDocumentsResponse {
  documents: Document[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
  };
}

/**
 * Parameters for searching documents
 */
export interface SearchParams {
  query: string;
  type?: DocumentType;
  campaigns?: string[];
  tags?: string[];
  from?: number;
  size?: number;
}

/**
 * Search result item
 */
export interface SearchResult {
  documentId: string;
  source: {
    title: string;
    type: DocumentType;
    description: string;
    campaigns: string[];
    tags: string[];
  };
  score: number;
  highlights?: {
    content?: string[];
    title?: string[];
    description?: string[];
  };
}

/**
 * Response from search endpoint
 */
export interface SearchResponse {
  query: string;
  total: number;
  from: number;
  size: number;
  results: SearchResult[];
}

/**
 * Quick search result
 */
export interface QuickSearchResult {
  documentId: string;
  title: string;
  type: DocumentType;
  score: number;
  snippet: string;
}

/**
 * Response from quick search endpoint
 */
export interface QuickSearchResponse {
  query: string;
  results: QuickSearchResult[];
}

/**
 * Document service class for frontend
 */
class DocumentService {
  private baseUrl: string;
  private initialized = false;

  constructor() {
    // In production, use relative path (nginx proxy handles routing)
    // In development, use localhost with port
    this.baseUrl = import.meta.env.DEV
      ? import.meta.env.VITE_API_URL || 'http://localhost:5001'
      : ''; // Empty string = relative URLs in production
    this.initialized = true;
  }

  /**
   * Make a request to the API
   * @private
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        // Surface clearer message when the document service is disabled/offline
        if (response.status === 503) {
          throw new Error(
            error.error ||
              'Document service unavailable. Start NexusCodex or set DOC_API_URL/VITE_DOC_API_URL.',
          );
        }

        throw new Error(error.error || `Request failed: ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`Document service error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Create a new document and get a signed upload URL
   * @param params - Document creation parameters
   */
  async createDocument(params: CreateDocumentParams): Promise<CreateDocumentResponse> {
    return this.request<CreateDocumentResponse>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Upload a file to the signed URL
   * @param uploadUrl - Signed upload URL from createDocument
   * @param file - File to upload
   */
  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
  }

  /**
   * List documents with optional filtering
   * @param params - List parameters
   */
  async listDocuments(params: ListDocumentsParams = {}): Promise<ListDocumentsResponse> {
    const queryParams = new URLSearchParams();

    if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params.type) queryParams.append('type', params.type);
    if (params.campaign) queryParams.append('campaign', params.campaign);
    if (params.tag) queryParams.append('tag', params.tag);
    if (params.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    const endpoint = query ? `/api/documents?${query}` : '/api/documents';

    return this.request<ListDocumentsResponse>(endpoint);
  }

  /**
   * Get document metadata by ID
   * @param documentId - Document ID
   */
  async getDocument(documentId: string): Promise<Document> {
    return this.request<Document>(`/api/documents/${documentId}`);
  }

  /**
   * Get document content URL for streaming/downloading
   * @param documentId - Document ID
   */
  async getDocumentContentUrl(documentId: string): Promise<string> {
    const response = await this.request<{ contentUrl: string }>(
      `/api/documents/${documentId}/content`
    );
    return response.contentUrl;
  }

  /**
   * Update document metadata
   * @param documentId - Document ID
   * @param updates - Fields to update
   */
  async updateDocument(
    documentId: string,
    updates: Partial<CreateDocumentParams>
  ): Promise<Document> {
    return this.request<Document>(`/api/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a document
   * @param documentId - Document ID
   */
  async deleteDocument(documentId: string): Promise<void> {
    return this.request<void>(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search documents with full-text search
   * @param params - Search parameters
   */
  async searchDocuments(params: SearchParams): Promise<SearchResponse> {
    const queryParams = new URLSearchParams();

    queryParams.append('query', params.query);
    if (params.type) queryParams.append('type', params.type);
    if (params.campaigns) queryParams.append('campaigns', params.campaigns.join(','));
    if (params.tags) queryParams.append('tags', params.tags.join(','));
    if (params.from !== undefined) queryParams.append('from', params.from.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    return this.request<SearchResponse>(`/api/search?${queryParams.toString()}`);
  }

  /**
   * Quick search for top results
   * @param query - Search query
   * @param campaign - Optional campaign filter
   * @param size - Number of results (default: 5)
   */
  async quickSearch(
    query: string,
    campaign?: string,
    size: number = 5
  ): Promise<QuickSearchResponse> {
    const queryParams = new URLSearchParams();

    queryParams.append('query', query);
    if (campaign) queryParams.append('campaign', campaign);
    queryParams.append('size', size.toString());

    return this.request<QuickSearchResponse>(`/api/search/quick?${queryParams.toString()}`);
  }

  /**
   * Health check for the document service
   */
  async healthCheck(): Promise<{ status: string; database: string }> {
    return this.request<{ status: string; database: string }>('/api/health');
  }
}

// Export singleton instance
export const documentService = new DocumentService();

// Export class for testing
export { DocumentService };
