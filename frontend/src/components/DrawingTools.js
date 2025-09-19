import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { drawingAPI } from '../services/api';
import { Pen, ArrowRight, Square, Circle, Minus, Palette, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const DrawingTools = ({ pdfUuid, pageNumber, scale, isEnabled, onDrawingChange, pageContainerRef, drawingOverlayRef }) => {
  const [tool, setTool] = useState('freehand');
  const [color, setColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [showTools, setShowTools] = useState(true);
  
  const svgRef = useRef(null);
  const queryClient = useQueryClient();
  const isDrawingRef = useRef(false);
  const startPosRef = useRef(null);

  const createDrawingMutation = useMutation(drawingAPI.create, {
    onMutate: () => {
      console.log('🎨 Starting drawing mutation...');
    },
    onSuccess: (data) => {
      console.log('✅ Drawing saved successfully:', data);
      queryClient.invalidateQueries(['drawings', pdfUuid]);
      toast.success('Drawing saved!');
    },
    onError: (error) => {
      console.error('❌ Failed to save drawing:', error);
      toast.error('Failed to save drawing: ' + (error.response?.data?.message || error.message));
    }
  });

  const tools = [
    { id: 'freehand', icon: Pen, name: 'Freehand' },
    { id: 'arrow', icon: ArrowRight, name: 'Arrow' },
    { id: 'rectangle', icon: Square, name: 'Rectangle' },
    { id: 'circle', icon: Circle, name: 'Circle' },
    { id: 'line', icon: Minus, name: 'Line' }
  ];

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000'];

  const getDrawingOverlay = useCallback(() => {
    if (!drawingOverlayRef?.current) {
      console.log('❌ No drawing overlay ref');
      return null;
    }
    return drawingOverlayRef.current;
  }, [drawingOverlayRef]);

  const getRelativePosition = useCallback((e) => {
    const overlay = getDrawingOverlay();
    if (!overlay) return { x: 0, y: 0 };
    
    const rect = overlay.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    const clampedPos = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y))
    };
    
    console.log('📍 Position:', { 
      client: { x: e.clientX, y: e.clientY },
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      relative: { x, y },
      clamped: clampedPos
    });
    
    return clampedPos;
  }, [getDrawingOverlay]);

  const handleMouseDown = useCallback((e) => {
    if (!isEnabled) {
      console.log('❌ Drawing not enabled');
      return;
    }
    
    console.log('🖱️ Mouse down - starting drawing', { tool, enabled: isEnabled });
    
    e.preventDefault();
    e.stopPropagation();
    
    isDrawingRef.current = true;
    setIsDrawing(true);
    
    const pos = getRelativePosition(e);
    startPosRef.current = pos;
    setCurrentPath([pos]);
    
    console.log('🎨 Started drawing with position:', pos);
  }, [isEnabled, getRelativePosition, tool]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawingRef.current || !isEnabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getRelativePosition(e);
    
    if (tool === 'freehand') {
      setCurrentPath(prev => {
        const newPath = [...prev, pos];
        console.log('✏️ Freehand path update, length:', newPath.length);
        return newPath;
      });
    } else {
      // For shapes, only keep start and current position
      setCurrentPath([startPosRef.current, pos]);
    }
  }, [isEnabled, tool, getRelativePosition]);

  const handleMouseUp = useCallback(async (e) => {
    console.log('🖱️ Mouse up triggered', { 
      isDrawing: isDrawingRef.current, 
      pathLength: currentPath.length,
      tool 
    });
    
    if (!isDrawingRef.current || currentPath.length === 0) {
      console.log('❌ Not drawing or no path');
      isDrawingRef.current = false;
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Validate path based on tool
    let validPath = [...currentPath];
    if (tool !== 'freehand' && validPath.length > 2) {
      validPath = [validPath[0], validPath[validPath.length - 1]];
    }
    
    console.log('🔍 Validating path:', { 
      originalLength: currentPath.length, 
      validLength: validPath.length,
      tool,
      validPath
    });
    
    if (validPath.length < 2) {
      console.log('❌ Path too short, canceling');
      toast.error('Drawing too short - please draw a longer line');
      isDrawingRef.current = false;
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }

    const drawingData = {
      uuid: uuidv4(),
      pdfUuid,
      pageNumber,
      type: tool,
      data: {
        path: validPath,
        scale
      },
      style: {
        color,
        strokeWidth,
        opacity: 1
      }
    };

    console.log('💾 Attempting to save drawing:', drawingData);

    try {
      await createDrawingMutation.mutateAsync(drawingData);
      onDrawingChange && onDrawingChange(drawingData);
      console.log('✅ Drawing save initiated successfully');
    } catch (error) {
      console.error('❌ Failed to save drawing:', error);
    } finally {
      isDrawingRef.current = false;
      setIsDrawing(false);
      setCurrentPath([]);
      startPosRef.current = null;
    }
  }, [currentPath, tool, pdfUuid, pageNumber, scale, color, strokeWidth, createDrawingMutation, onDrawingChange]);

  // Add event listeners to the drawing overlay
  useEffect(() => {
    if (!isEnabled) {
      console.log('❌ Drawing not enabled, skipping event listeners');
      return;
    }

    const overlay = getDrawingOverlay();
    if (!overlay) {
      console.log('❌ No overlay found, cannot add event listeners');
      return;
    }

    console.log('🎯 Adding event listeners to drawing overlay');
    
    overlay.addEventListener('mousedown', handleMouseDown, { passive: false });
    overlay.addEventListener('mousemove', handleMouseMove, { passive: false });
    overlay.addEventListener('mouseup', handleMouseUp, { passive: false });
    
    // Global mouse up to handle dragging outside overlay
    document.addEventListener('mouseup', handleMouseUp, { passive: false });

    return () => {
      console.log('🧹 Removing event listeners');
      overlay.removeEventListener('mousedown', handleMouseDown);
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEnabled, handleMouseDown, handleMouseMove, handleMouseUp, getDrawingOverlay]);

  const renderCurrentDrawing = () => {
    if (currentPath.length === 0) return null;

    const overlay = getDrawingOverlay();
    if (!overlay) return null;

    const rect = overlay.getBoundingClientRect();

    switch (tool) {
      case 'freehand':
        if (currentPath.length < 2) return null;
        const pathData = `M ${currentPath[0].x * rect.width} ${currentPath[0].y * rect.height} ` +
          currentPath.slice(1).map(p => `L ${p.x * rect.width} ${p.y * rect.height}`).join(' ');
        return (
          <path
            d={pathData}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      
      case 'line':
        if (currentPath.length < 2) return null;
        return (
          <line
            x1={currentPath[0].x * rect.width}
            y1={currentPath[0].y * rect.height}
            x2={currentPath[currentPath.length - 1].x * rect.width}
            y2={currentPath[currentPath.length - 1].y * rect.height}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      
      case 'rectangle':
        if (currentPath.length < 2) return null;
        const last = currentPath[currentPath.length - 1];
        const rectData = {
          x: Math.min(currentPath[0].x, last.x) * rect.width,
          y: Math.min(currentPath[0].y, last.y) * rect.height,
          width: Math.abs(last.x - currentPath[0].x) * rect.width,
          height: Math.abs(last.y - currentPath[0].y) * rect.height
        };
        return (
          <rect
            x={rectData.x}
            y={rectData.y}
            width={rectData.width}
            height={rectData.height}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
          />
        );
      
      case 'circle':
        if (currentPath.length < 2) return null;
        const lastPos = currentPath[currentPath.length - 1];
        const radius = Math.sqrt(
          Math.pow((lastPos.x - currentPath[0].x) * rect.width, 2) +
          Math.pow((lastPos.y - currentPath[0].y) * rect.height, 2)
        );
        return (
          <circle
            cx={currentPath[0].x * rect.width}
            cy={currentPath[0].y * rect.height}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
          />
        );
      
      case 'arrow':
        if (currentPath.length < 2) return null;
        const start = currentPath[0];
        const end = currentPath[currentPath.length - 1];
        const angle = Math.atan2((end.y - start.y) * rect.height, (end.x - start.x) * rect.width);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;
        
        return (
          <g>
            <line
              x1={start.x * rect.width}
              y1={start.y * rect.height}
              x2={end.x * rect.width}
              y2={end.y * rect.height}
              stroke={color}
              strokeWidth={strokeWidth}
            />
            <path
              d={`M ${end.x * rect.width} ${end.y * rect.height} 
                  L ${end.x * rect.width - arrowLength * Math.cos(angle - arrowAngle)} ${end.y * rect.height - arrowLength * Math.sin(angle - arrowAngle)}
                  M ${end.x * rect.width} ${end.y * rect.height}
                  L ${end.x * rect.width - arrowLength * Math.cos(angle + arrowAngle)} ${end.y * rect.height - arrowLength * Math.sin(angle + arrowAngle)}`}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
            />
          </g>
        );
      
      default:
        return null;
    }
  };

  if (!isEnabled) return null;

  const overlay = getDrawingOverlay();
  const overlayRect = overlay?.getBoundingClientRect();

  return (
    <>
      {/* Tools Panel */}
      <div className={`fixed left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg p-4 z-50 transition-transform ${showTools ? '' : '-translate-x-full'}`}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Drawing Tools</h3>
            <button
              onClick={() => setShowTools(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Debug Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <div>Mode: {isEnabled ? 'ON' : 'OFF'}</div>
            <div>Tool: {tool}</div>
            <div>Drawing: {isDrawing ? 'YES' : 'NO'}</div>
            <div>Path: {currentPath.length} points</div>
            <div>Overlay: {overlay ? 'Found' : 'Missing'}</div>
          </div>

          {/* Test Button */}
          <button
            onClick={async () => {
              console.log('🧪 Testing drawing creation...');
              const testDrawing = {
                uuid: uuidv4(),
                pdfUuid,
                pageNumber,
                type: 'line',
                data: {
                  path: [
                    { x: 0.1, y: 0.1 },
                    { x: 0.9, y: 0.9 }
                  ],
                  scale
                },
                style: {
                  color: '#ff0000',
                  strokeWidth: 2,
                  opacity: 1
                }
              };
              
              try {
                await createDrawingMutation.mutateAsync(testDrawing);
                console.log('✅ Test drawing created');
              } catch (error) {
                console.error('❌ Test drawing failed:', error);
              }
            }}
            className="w-full px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Test API Call
          </button>

          {/* Tool Selection */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600">Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((toolItem) => {
                const Icon = toolItem.icon;
                return (
                  <button
                    key={toolItem.id}
                    onClick={() => {
                      console.log('🔧 Tool changed to:', toolItem.id);
                      setTool(toolItem.id);
                    }}
                    className={`p-2 rounded border flex items-center justify-center ${
                      tool === toolItem.id
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title={toolItem.name}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600">Color</h4>
            <div className="flex flex-wrap gap-1">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={`w-6 h-6 rounded border-2 ${
                    color === colorOption ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-8 rounded border"
            />
          </div>

          {/* Stroke Width */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600">Stroke Width</h4>
            <input
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-600">{strokeWidth}px</div>
          </div>
        </div>
      </div>

      {/* Show Tools Button (when hidden) */}
      {!showTools && (
        <button
          onClick={() => setShowTools(true)}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg p-2 z-50"
          title="Show Drawing Tools"
        >
          <Palette className="h-5 w-5" />
        </button>
      )}

      {/* Drawing Preview Overlay */}
      {isDrawing && overlayRect && (
        <svg
          ref={svgRef}
          className="fixed pointer-events-none z-40"
          style={{ 
            left: overlayRect.left,
            top: overlayRect.top,
            width: overlayRect.width,
            height: overlayRect.height
          }}
        >
          {renderCurrentDrawing()}
        </svg>
      )}
    </>
  );
};

export default DrawingTools;