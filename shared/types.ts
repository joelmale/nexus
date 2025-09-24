// Shared types between frontend and asset server

export interface AssetMetadata {
  id: string;
  name: string;
  category: string;
  tags: string[];
  thumbnail: string; // Relative path: thumbnails/abc123_thumb.webp
  fullImage: string; // Relative path: assets/abc123.webp
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number; // Original file size in bytes
  format: 'jpg' | 'png' | 'webp';
}

export interface AssetManifest {
  version: string;
  generatedAt: string;
  totalAssets: number;
  categories: string[];
  assets: AssetMetadata[];
}

export interface AssetSearchResult {
  query: string;
  results: AssetMetadata[];
  total: number;
}

export interface AssetCategoryResult {
  category: string;
  page: number;
  limit: number;
  assets: AssetMetadata[];
  hasMore: boolean;
  total: number;
}

// Asset server configuration
export interface AssetServerConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}
