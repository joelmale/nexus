/**
 * DocumentViewer Component
 * Displays document content with PDF.js support
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDocumentStore } from '@/stores/documentStore';

import { PDFDocumentProxy } from 'pdfjs-dist';

export const DocumentViewer: React.FC = () => {
  const { currentDocument, currentDocumentContent, isLoadingDocument, closeDocument } =
    useDocumentStore();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDocument();
      }
    };

    if (currentDocument) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentDocument, closeDocument]);

  /**
   * Render a PDF page
   */
  const renderPage = useCallback(async (pdf: PDFDocumentProxy, pageNum: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Set canvas dimensions
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;
  }, [scale]);

  // Load and render PDF
  useEffect(() => {
    if (!currentDocumentContent || currentDocument?.format !== 'pdf') {
      return;
    }

    const loadPdf = async () => {
      try {
        // Dynamically import PDF.js
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker path
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(currentDocumentContent);
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setPage(1);
        // First page will be rendered by the page change useEffect
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError('Failed to load PDF document');
      }
    };

    loadPdf();

    return () => {
      pdfDocRef.current = null;
    };
  }, [currentDocumentContent, currentDocument]);

  // Render page when page number or scale changes
  useEffect(() => {
    if (pdfDocRef.current && page > 0 && page <= totalPages) {
      renderPage(pdfDocRef.current, page);
    }
  }, [page, scale, totalPages, renderPage]);

  /**
   * Navigate to previous page
   */
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  /**
   * Navigate to next page
   */
  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  /**
   * Zoom in
   */
  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.25, 3.0));
  };

  /**
   * Zoom out
   */
  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5));
  };

  /**
   * Reset zoom
   */
  const handleZoomReset = () => {
    setScale(1.0);
  };

  if (!currentDocument) {
    return null;
  }

  return (
    <div className="document-viewer-overlay" onClick={closeDocument}>
      <div className="document-viewer glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="document-viewer-header">
          <div className="document-viewer-title">
            <h2>{currentDocument.title}</h2>
            {currentDocument.description && (
              <p className="document-viewer-description">{currentDocument.description}</p>
            )}
          </div>
          <button className="document-viewer-close" onClick={closeDocument} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Toolbar */}
        {currentDocument.format === 'pdf' && (
          <div className="document-viewer-toolbar">
            {/* Pagination */}
            <div className="toolbar-group">
              <button
                onClick={handlePrevPage}
                disabled={page <= 1}
                className="toolbar-btn"
                aria-label="Previous page"
              >
                ←
              </button>
              <span className="page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className="toolbar-btn"
                aria-label="Next page"
              >
                →
              </button>
            </div>

            {/* Zoom */}
            <div className="toolbar-group">
              <button onClick={handleZoomOut} className="toolbar-btn" aria-label="Zoom out">
                −
              </button>
              <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
              <button onClick={handleZoomIn} className="toolbar-btn" aria-label="Zoom in">
                +
              </button>
              <button onClick={handleZoomReset} className="toolbar-btn" aria-label="Reset zoom">
                100%
              </button>
            </div>

            {/* Download */}
            <div className="toolbar-group">
              <a
                href={currentDocumentContent || ''}
                download={`${currentDocument.title}.pdf`}
                className="toolbar-btn"
                aria-label="Download"
              >
                ⬇️ Download
              </a>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="document-viewer-content">
          {isLoadingDocument ? (
            <div className="loading-state">
              <span className="loading-spinner"></span>
              <p>Loading document...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          ) : currentDocument.format === 'pdf' ? (
            <div className="pdf-canvas-container">
              <canvas ref={canvasRef} className="pdf-canvas" />
            </div>
          ) : currentDocument.format === 'markdown' || currentDocument.format === 'html' ? (
            <iframe
              src={currentDocumentContent || ''}
              className="document-iframe"
              title={currentDocument.title}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <p>Unsupported document format: {currentDocument.format}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="document-viewer-footer">
          <div className="document-meta">
            {currentDocument.author && (
              <span className="meta-item">📝 {currentDocument.author}</span>
            )}
            <span className="meta-item">
              📅 {new Date(currentDocument.uploadedAt).toLocaleDateString()}
            </span>
            <span className="meta-item">
              📦 {(currentDocument.fileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          {currentDocument.tags.length > 0 && (
            <div className="document-tags">
              {currentDocument.tags.map((tag) => (
                <span key={tag} className="document-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
