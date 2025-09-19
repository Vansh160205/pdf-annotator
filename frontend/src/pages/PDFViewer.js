import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import toast from 'react-hot-toast';
import { pdfAPI, highlightAPI, drawingAPI } from '../services/api';
import DrawingTools from '../components/DrawingTools';
import DrawingRenderer from '../components/DrawingRenderer';

// PDF.js worker setup
const setupPDFWorker = () => {
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const workerUrls = [
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`,
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
    ];
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrls[0];
  }
};

setupPDFWorker();

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PDF Viewer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">PDF Viewer Error</div>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PDFViewer = () => {
  const { uuid } = useParams();
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [pageLoaded, setPageLoaded] = useState(false);

  const pageContainerRef = useRef(null);
  const documentRef = useRef(null);
  const drawingOverlayRef = useRef(null);
  const queryClient = useQueryClient();

  // Memoize document options to prevent unnecessary reloads
  const documentOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  // Debug: Log UUID when component mounts
  useEffect(() => {
    console.log('🔍 PDFViewer mounted with UUID:', uuid);
    if (!uuid) {
      console.error('❌ No UUID provided!');
    }
  }, [uuid]);

  // PDF data processing - Create a proper copy to avoid detached ArrayBuffer
  const processPdfData = useCallback(async (rawData) => {
    if (!rawData) {
      console.log('❌ No raw PDF data provided');
      return null;
    }

    try {
      console.log('🔄 Processing PDF data:', {
        type: typeof rawData,
        constructor: rawData.constructor.name,
        size: rawData.byteLength || rawData.length || 'unknown'
      });

      let sourceBuffer;

      if (rawData instanceof ArrayBuffer) {
        sourceBuffer = rawData;
      } else if (rawData instanceof Uint8Array) {
        sourceBuffer = rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength);
      } else if (rawData instanceof Blob) {
        sourceBuffer = await rawData.arrayBuffer();
      } else if (typeof rawData === 'string') {
        try {
          const binaryString = atob(rawData);
          sourceBuffer = new ArrayBuffer(binaryString.length);
          const uint8View = new Uint8Array(sourceBuffer);
          for (let i = 0; i < binaryString.length; i++) {
            uint8View[i] = binaryString.charCodeAt(i);
          }
        } catch (e) {
          const encoder = new TextEncoder();
          const uint8Array = encoder.encode(rawData);
          sourceBuffer = uint8Array.buffer.slice();
        }
      } else {
        throw new Error('Unsupported data type: ' + typeof rawData);
      }

      if (sourceBuffer.byteLength === 0) {
        throw new Error('PDF data is empty');
      }

      const copiedBuffer = sourceBuffer.slice();
      const uint8Array = new Uint8Array(copiedBuffer);

      const header = String.fromCharCode(...uint8Array.slice(0, 5));
      if (!header.startsWith('%PDF')) {
        throw new Error(`Invalid PDF header: ${header}. Expected %PDF`);
      }

      console.log('✅ PDF data processed successfully:', {
        size: copiedBuffer.byteLength,
        header: header
      });

      const blob = new Blob([copiedBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      console.log('📄 Created blob URL:', url);
      return url;

    } catch (error) {
      console.error('❌ Error processing PDF data:', error);
      setPdfError(error);
      throw error;
    }
  }, []);

  // Fetch PDF file
  const { isLoading: pdfLoading, error: fetchError, data: rawPdfData } = useQuery(
    ['pdf', uuid],
    async () => {
      console.log('🚀 Starting PDF fetch for UUID:', uuid);
      try {
        const response = await pdfAPI.get(uuid);
        console.log('✅ PDF fetch successful:', {
          status: response.status,
          dataType: typeof response.data,
          size: response.data.byteLength || response.data.length
        });
        return response.data;
      } catch (error) {
        console.error('❌ PDF fetch failed:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url
        });
        throw error;
      }
    },
    {
      enabled: !!uuid,
      retry: (failureCount, error) => {
        console.log(`🔄 Retry attempt ${failureCount} for PDF fetch`);
        if (error.response?.status === 404) return false;
        return failureCount < 2;
      },
      onError: (error) => {
        console.error('❌ PDF Query error:', error);
        toast.error('Failed to load PDF: ' + (error.response?.data?.error || error.message));
      },
      onSuccess: (data) => {
        console.log('✅ PDF Query successful, data received');
      }
    }
  );

  // Process PDF data when it changes
  useEffect(() => {
    if (!rawPdfData) {
      console.log('⏳ No raw PDF data available yet');
      return;
    }

    console.log('🔄 Processing raw PDF data...');
    const loadPDF = async () => {
      try {
        setPdfError(null);
        const processedData = await processPdfData(rawPdfData);
        if (processedData) {
          console.log('✅ Setting PDF document with URL:', processedData);
          setPdfDocument(processedData);
        }
      } catch (error) {
        console.error('❌ Failed to process PDF:', error);
        toast.error('Failed to process PDF: ' + error.message);
      }
    };

    loadPDF();
  }, [rawPdfData, processPdfData]);

  const { data: drawingsData } = useQuery(
    ['drawings', uuid],
    () => drawingAPI.getByPDF(uuid),
    {
      enabled: !!uuid,
      onSuccess: (response) => {
        setDrawings(response.data.drawings || []);
      },
      onError: (error) => {
        console.error('Failed to load drawings:', error);
      },
    }
  );

 const deleteDrawingMutation = useMutation(drawingAPI.delete, {
  onMutate: (drawingUuid) => {
    console.log('🔄 Starting delete mutation for:', drawingUuid);
  },
  onSuccess: (data, drawingUuid) => {
    console.log('✅ Drawing deleted successfully:', drawingUuid);
    queryClient.invalidateQueries(['drawings', uuid]);
    // Optimistically update the UI
    setDrawings(prev => prev.filter(d => d.uuid !== drawingUuid));
    toast.success('Drawing deleted!');
  },
  onError: (error, drawingUuid) => {
    console.error('❌ Failed to delete drawing:', drawingUuid, error);
    toast.error('Failed to delete drawing: ' + (error.response?.data?.message || error.message));
  },
});
  const handleDrawingClick = (drawing) => {
  console.log('🗑️ Attempting to delete drawing:', drawing.uuid);
  if (window.confirm('Delete this drawing?')) {
    console.log('✅ User confirmed deletion');
    deleteDrawingMutation.mutate(drawing.uuid);
  } else {
    console.log('❌ User cancelled deletion');
  }
};

  // Cleanup blob URLs when component unmounts or PDF changes
  useEffect(() => {
    return () => {
      if (pdfDocument && typeof pdfDocument === 'string' && pdfDocument.startsWith('blob:')) {
        console.log('🧹 Cleaning up blob URL:', pdfDocument);
        URL.revokeObjectURL(pdfDocument);
      }
      if (documentRef.current) {
        try {
          documentRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying PDF document:', error);
        }
      }
    };
  }, [pdfDocument]);

  // Fetch highlights for this PDF
  const { data: highlightsData } = useQuery(
    ['highlights', uuid],
    () => highlightAPI.getByPDF(uuid),
    {
      enabled: !!uuid,
      onSuccess: (response) => {
        console.log('✅ Highlights loaded:', response.data.highlights?.length || 0);
        setHighlights(response.data.highlights || []);
      },
      onError: (error) => {
        console.error('❌ Failed to load highlights:', error);
        toast.error('Failed to load highlights');
      },
    }
  );

  // Create highlight mutation
  const createHighlightMutation = useMutation(highlightAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['highlights', uuid]);
      toast.success('Highlight created!');
      setIsCreatingHighlight(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create highlight');
      setIsCreatingHighlight(false);
    },
  });

  // Delete highlight mutation
  const deleteHighlightMutation = useMutation(highlightAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(['highlights', uuid]);
      toast.success('Highlight deleted!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete highlight');
    },
  });

  const onDocumentLoadSuccess = (pdf) => {
    console.log('✅ PDF Document loaded successfully:', {
      numPages: pdf.numPages,
      fingerprint: pdf.fingerprint
    });
    documentRef.current = pdf;
    setNumPages(pdf.numPages);
    toast.success(`PDF loaded successfully (${pdf.numPages} pages)`);
    setPdfError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('❌ PDF Document load error:', error);
    let errorMessage = 'Failed to load PDF document';
    if (error.message.includes('Invalid PDF')) {
      errorMessage = 'Invalid PDF format';
    } else if (error.message.includes('Password')) {
      errorMessage = 'PDF is password protected';
    } else if (error.message.includes('worker')) {
      errorMessage = 'PDF worker initialization failed';
      setupPDFWorker();
    }
    
    setPdfError(error);
    toast.error(errorMessage);
  };

  const onPageLoadSuccess = () => {
    console.log('📄 Page loaded successfully');
    setPageLoaded(true);
  };

  const onPageLoadError = (error) => {
    console.error(`❌ Page ${pageNumber} load error:`, error);
    toast.error(`Failed to load page ${pageNumber}: ${error.message}`);
  };

  // Text selection handler
  const handleTextSelection = useCallback(async () => {
    if (!isSelecting || isCreatingHighlight) return;

    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.toString().trim()) return;

    setIsCreatingHighlight(true);

    try {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      const pageContainer = pageContainerRef.current?.querySelector('.react-pdf__Page');
      if (!pageContainer) {
        throw new Error('Page container not found');
      }

      const canvas = pageContainer.querySelector('canvas');
      if (!canvas) {
        throw new Error('Canvas not found');
      }

      const pageRect = canvas.getBoundingClientRect();
      const rangeRect = range.getBoundingClientRect();

      const relativeRect = {
        left: Math.max(0, (rangeRect.left - pageRect.left) / pageRect.width),
        top: Math.max(0, (rangeRect.top - pageRect.top) / pageRect.height),
        right: Math.min(1, (rangeRect.right - pageRect.left) / pageRect.width),
        bottom: Math.min(1, (rangeRect.bottom - pageRect.top) / pageRect.height),
      };

      const tolerance = 0.05;
      if (relativeRect.left < -tolerance || relativeRect.top < -tolerance || 
          relativeRect.right > (1 + tolerance) || relativeRect.bottom > (1 + tolerance)) {
        throw new Error('Selection is outside page bounds');
      }

      const boundedRect = {
        left: Math.max(0, Math.min(1, relativeRect.left)),
        top: Math.max(0, Math.min(1, relativeRect.top)),
        right: Math.max(0, Math.min(1, relativeRect.right)),
        bottom: Math.max(0, Math.min(1, relativeRect.bottom)),
      };

      const highlightData = {
        pdfUuid: uuid,
        pageNumber,
        highlightedText: selectedText,
        position: {
          x: boundedRect.left,
          y: boundedRect.top,
          width: boundedRect.right - boundedRect.left,
          height: boundedRect.bottom - boundedRect.top,
        },
        boundingBox: {
          left: boundedRect.left,
          top: boundedRect.top,
          right: boundedRect.right,
          bottom: boundedRect.bottom,
        },
      };

      await createHighlightMutation.mutateAsync(highlightData);
      
    } catch (error) {
      toast.error('Failed to create highlight: ' + error.message);
      setIsCreatingHighlight(false);
    } finally {
      selection.removeAllRanges();
    }
  }, [isSelecting, pageNumber, uuid, createHighlightMutation, isCreatingHighlight]);

  const handleMouseUp = useCallback((event) => {
    if (!isSelecting || isDrawingMode) return;
    
    const pageContainer = pageContainerRef.current?.querySelector('.react-pdf__Page');
    if (!pageContainer) return;

    const canvas = pageContainer.querySelector('canvas');
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const { clientX, clientY } = event;

    if (clientX >= canvasRect.left && clientX <= canvasRect.right &&
        clientY >= canvasRect.top && clientY <= canvasRect.bottom) {
      
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection.toString().trim()) {
          handleTextSelection();
        }
      }, 100);
    }
  }, [isSelecting, isDrawingMode, handleTextSelection]);

  useEffect(() => {
    const pageContainer = pageContainerRef.current?.querySelector('.react-pdf__Page');
    if (!pageContainer) return;

    if (isSelecting && !isDrawingMode) {
      document.addEventListener('mouseup', handleMouseUp);
      pageContainer.style.userSelect = 'text';
      pageContainer.style.cursor = 'text';
    } else {
      document.removeEventListener('mouseup', handleMouseUp);
      if (!isDrawingMode) {
        pageContainer.style.userSelect = 'none';
        pageContainer.style.cursor = 'default';
      }
    }

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, isDrawingMode, handleMouseUp, pageNumber, pageLoaded]);

  const renderHighlights = useCallback(() => {
    const pageHighlights = highlights.filter(h => h.pageNumber === pageNumber);
    
    return pageHighlights.map((highlight) => (
      <div
        key={highlight.uuid}
        className="absolute cursor-pointer transition-opacity hover:opacity-70"
        style={{
          left: `${highlight.boundingBox.left * 100}%`,
          top: `${highlight.boundingBox.top * 100}%`,
          width: `${(highlight.boundingBox.right - highlight.boundingBox.left) * 100}%`,
          height: `${(highlight.boundingBox.bottom - highlight.boundingBox.top) * 100}%`,
          backgroundColor: highlight.color || '#ffff00',
          opacity: 0.4,
          mixBlendMode: 'multiply',
          border: '1px solid rgba(255, 255, 0, 0.6)',
          borderRadius: '2px',
          pointerEvents: 'auto',
          zIndex: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (window.confirm(`Delete highlight: "${highlight.highlightedText.substring(0, 50)}${highlight.highlightedText.length > 50 ? '...' : ''}"?`)) {
            deleteHighlightMutation.mutate(highlight.uuid);
          }
        }}
        title={`"${highlight.highlightedText}" - Click to delete`}
      />
    ));
  }, [highlights, pageNumber, deleteHighlightMutation]);

  // Handle mode switching
  const handleDrawingModeToggle = () => {
    if (isSelecting) {
      setIsSelecting(false);
    }
    setIsDrawingMode(!isDrawingMode);
  };

  const handleHighlightModeToggle = () => {
    if (isDrawingMode) {
      setIsDrawingMode(false);
    }
    setIsSelecting(!isSelecting);
  };

  // Reset page loaded state when page changes
  useEffect(() => {
    setPageLoaded(false);
  }, [pageNumber]);

  if (!uuid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-2xl">
          <div className="text-red-500 text-xl mb-4">No PDF UUID provided</div>
          <p className="text-gray-600 mb-4">The PDF UUID is missing from the URL</p>
          <Link 
            to="/dashboard" 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (pdfLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
              <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Library
            </Link>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-gray-100 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Loading PDF document...</p>
            <p className="text-sm text-gray-500 mt-2">UUID: {uuid}</p>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || pdfError) {
    const error = fetchError || pdfError;
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-2xl">
          <div className="text-red-500 text-xl mb-4">Failed to load PDF</div>
          <p className="text-gray-600 mb-4">{error.message}</p>
          {error.response?.status && (
            <p className="text-sm text-gray-500 mb-2">Status: {error.response.status}</p>
          )}
          <p className="text-sm text-gray-500 mb-4">UUID: {uuid}</p>
          
          <div className="space-x-4">
            <button
              onClick={() => {
                queryClient.invalidateQueries(['pdf', uuid]);
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
            <Link 
              to="/dashboard" 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Library
              </Link>
              <span className="text-sm text-gray-500">UUID: {uuid}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleHighlightModeToggle}
                disabled={isCreatingHighlight || !pdfDocument}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                  isSelecting
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM6 6v10h12V6H6zm3 3h6v2H9V9z" />
                </svg>
                {isCreatingHighlight ? 'Creating...' : (isSelecting ? 'Highlighting On' : 'Enable Highlighting')}
              </button>

              <button
                onClick={handleDrawingModeToggle}
                disabled={!pdfDocument}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                  isDrawingMode
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {isDrawingMode ? 'Drawing On' : 'Enable Drawing'}
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  disabled={!pdfDocument}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <span className="text-sm text-gray-700 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(Math.min(3.0, scale + 0.1))}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  disabled={!pdfDocument}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM15 10h-3m0 0H9m3 0v3m0-3V7" />
                  </svg>
                </button>
              </div>

              {/* Page Navigation */}
              {numPages && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-700 min-w-[80px] text-center">
                    {pageNumber} of {numPages}
                  </span>
                  <button
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PDF Viewer Container */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4 relative">
          <div className="flex justify-center">
            <div 
              className={`relative ${isSelecting ? 'highlighting-mode' : ''} ${isDrawingMode ? 'drawing-mode' : ''}`} 
              ref={pageContainerRef}
            >
              {pdfDocument ? (
                <Document
                  file={pdfDocument}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3">Loading document...</span>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center p-8 text-red-600">
                      <div className="text-center">
                        <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>Failed to load PDF document</div>
                        <button
                          onClick={() => window.location.reload()}
                          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Reload
                        </button>
                      </div>
                    </div>
                  }
                  className="shadow-lg"
                  options={documentOptions}
                >
                  <div className="relative pdf-page-container">
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      onLoadSuccess={onPageLoadSuccess}
                      onLoadError={onPageLoadError}
                      loading={
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="ml-2">Loading page...</span>
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center p-4 text-red-600">
                          <span>Failed to load page {pageNumber}</span>
                        </div>
                      }
                      className="pdf-page"
                    />
                    
                    {/* Highlight overlay */}
                    <div className="absolute inset-0 pointer-events-none highlight-overlay" style={{ zIndex: 10 }}>
                      {renderHighlights()}
                    </div>

                    {/* Drawing renderer */}
                    <DrawingRenderer
                      drawings={drawings}
                      pageNumber={pageNumber}
                      scale={scale}
                      onDrawingClick={handleDrawingClick}
                    />

                    {/* Drawing overlay - This is key! */}
                    {isDrawingMode && pageLoaded && (
                      <div 
                        ref={drawingOverlayRef}
                        className="absolute inset-0"
                        style={{ 
                          zIndex: 25,
                          cursor: 'crosshair'
                        }}
                      />
                    )}
                    
                    {/* Loading overlay for highlight creation */}
                    {isCreatingHighlight && (
                      <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center pointer-events-none z-30">
                        <div className="bg-white rounded-lg shadow-lg p-4 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-sm">Creating highlight...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Document>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 mb-2">No PDF loaded</p>
                    <p className="text-sm text-gray-400">UUID: {uuid}</p>
                    <button
                      onClick={() => {
                        console.log('🔄 Manual refresh triggered');
                        queryClient.invalidateQueries(['pdf', uuid]);
                      }}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Retry Loading
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Drawing Tools - Now positioned after the PDF container */}
          {isDrawingMode && pageLoaded && (
            <DrawingTools
              pdfUuid={uuid}
              pageNumber={pageNumber}
              scale={scale}
              isEnabled={isDrawingMode}
              onDrawingChange={(drawing) => {
                setDrawings(prev => [...prev, drawing]);
              }}
              pageContainerRef={pageContainerRef}
              drawingOverlayRef={drawingOverlayRef}
            />
          )}
        </div>

        {/* Instructions */}
        {isSelecting && pdfDocument && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2">
            <p className="text-sm text-yellow-800">
              <strong>Highlighting Mode:</strong> Select text with your mouse to create highlights. 
              Click on existing highlights to delete them.
              {isCreatingHighlight && <span className="ml-2 text-yellow-600">(Creating highlight...)</span>}
            </p>
          </div>
        )}

        {isDrawingMode && pdfDocument && (
          <div className="bg-green-50 border-t border-green-200 px-4 py-2">
            <p className="text-sm text-green-800">
              <strong>Drawing Mode:</strong> Use the drawing tools on the left to create annotations. 
              Click on existing drawings to delete them.
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PDFViewer;