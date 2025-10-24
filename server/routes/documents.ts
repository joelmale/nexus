import { Router, Request, Response } from 'express';
import { DocumentServiceClient } from '../services/documentServiceClient.js';
import { Session } from 'express-session';

interface CustomSession extends Session {
  guestUser?: {
    id: string;
    name: string;
    provider: string;
  };
}

/**
 * Helper to check if user is authenticated
 */
function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated() || !!(req.session as CustomSession)?.guestUser;
}

/**
 * Get user ID from session (authenticated or guest)
 */
function getUserId(req: Request): string | null {
  if (req.isAuthenticated()) {
    return (req.user as { id: string })?.id || null;
  }
  return (req.session as CustomSession)?.guestUser?.id || null;
}

/**
 * Create document routes
 * @param documentClient - DocumentServiceClient instance
 */
export function createDocumentRoutes(documentClient: DocumentServiceClient): Router {
  const router = Router();

  /**
   * POST /api/documents - Create document and get signed upload URL
   * Requires authentication
   */
  router.post('/documents', async (req: Request, res: Response) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'User ID not found' });
      }

      const result = await documentClient.createDocument(req.body, userId);
      return res.status(201).json(result);
    } catch (error: unknown) {
      console.error('Failed to create document:', error);
      return res.status(400).json({
        error: 'Failed to create document',
        details: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/documents - List documents with filtering
   * Requires authentication
   */
  router.get('/documents', async (req: Request, res: Response) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const params = {
        skip: req.query.skip ? parseInt(req.query.skip as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        type: req.query.type as string | undefined,
        campaign: req.query.campaign as string,
        tag: req.query.tag as string,
        search: req.query.search as string,
      };

      const result = await documentClient.listDocuments(params);
      return res.json(result);
    } catch (error: unknown) {
      console.error('Failed to list documents:', error);
      return res.status(400).json({
        error: 'Failed to list documents',
        details: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/documents/:id - Get document metadata
   * Requires authentication
   */
  router.get('/documents/:id', async (req: Request, res: Response) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const document = await documentClient.getDocument(req.params.id);
      return res.json(document);
    } catch (error: unknown) {
      console.error('Failed to get document:', error);
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({ error: 'Document not found' });
      }
      return res.status(500).json({
        error: 'Failed to get document',
        details: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/documents/:id/content - Get document content URL
   * Requires authentication
   * Returns a redirect to the doc-api service for streaming content
   */
  router.get('/documents/:id/content', async (req: Request, res: Response) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // First verify the document exists and user has access
      await documentClient.getDocument(req.params.id);

      // Return the content URL for the frontend to fetch
      const contentUrl = documentClient.getDocumentContentUrl(req.params.id);
      return res.json({ contentUrl });
    } catch (error: unknown) {
      console.error('Failed to get document content:', error);
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({ error: 'Document not found' });
      }
      return res.status(500).json({
        error: 'Failed to get document content',
        details: (error as Error).message,
      });
    }
  });

  /**
   * PUT /api/documents/:id - Update document metadata
   * Requires authentication
   */
  router.put('/documents/:id', async (req: Request, res: Response) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const document = await documentClient.updateDocument(req.params.id, req.body);
      return res.json(document);
    } catch (error: unknown) {
      console.error('Failed to update document:', error);
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({ error: 'Document not found' });
      }
      return res.status(400).json({
        error: 'Failed to update document',
        details: (error as Error).message,
      });
    }
  });

  /**
   * DELETE /api/documents/:id - Delete document
   * Requires authentication
   */
  router.delete('/documents/:id', async (req: Request, res: Response) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await documentClient.deleteDocument(req.params.id);
      return res.status(204).send();
    } catch (error: unknown) {
      console.error('Failed to delete document:', error);
      if ((error as Error).message.includes('not found')) {
        return res.status(404).json({ error: 'Document not found' });
      }
      return res.status(500).json({
        error: 'Failed to delete document',
        details: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/documents/search - Full-text search across documents
   * Requires authentication
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const query = req.query.query as string;
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const params = {
        query,
        type: req.query.type as string | undefined,
        campaigns: req.query.campaigns
          ? (req.query.campaigns as string).split(',')
          : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        from: req.query.from ? parseInt(req.query.from as string) : undefined,
        size: req.query.size ? parseInt(req.query.size as string) : undefined,
      };

      const result = await documentClient.searchDocuments(params);
      return res.json(result);
    } catch (error: unknown) {
      console.error('Failed to search documents:', error);
      return res.status(400).json({
        error: 'Search failed',
        details: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/documents/search/quick - Quick search for top results
   * Requires authentication
   */
  router.get('/search/quick', async (req: Request, res: Response) => {
    try {
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const query = req.query.query as string;
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const campaign = req.query.campaign as string | undefined;
      const size = req.query.size ? parseInt(req.query.size as string) : 5;

      const result = await documentClient.quickSearch(query, campaign, size);
      return res.json(result);
    } catch (error: unknown) {
      console.error('Failed to quick search:', error);
      return res.status(400).json({
        error: 'Quick search failed',
        details: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/documents/health - Health check for document service
   * Does not require authentication
   */
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const health = await documentClient.healthCheck();
      return res.json(health);
    } catch (error: unknown) {
      console.error('Document service health check failed:', error);
      return res.status(503).json({
        status: 'unhealthy',
        error: (error as Error).message,
      });
    }
  });

  return router;
}
