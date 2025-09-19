import React, { useMemo } from 'react';

const DrawingRenderer = ({ drawings, pageNumber, scale = 1, onDrawingClick }) => {
  const pageDrawings = useMemo(() => {
    return drawings.filter(drawing => drawing.pageNumber === pageNumber);
  }, [drawings, pageNumber]);

  const renderDrawing = (drawing) => {
    const { type, data, style } = drawing;
    const { color = '#000000', strokeWidth = 2, opacity = 1 } = style;

    const commonProps = {
      stroke: color,
      strokeWidth: strokeWidth,
      opacity,
      style: { 
        cursor: 'pointer',
        pointerEvents: 'auto' // Enable pointer events on individual elements
      },
      onClick: (e) => {
        e.stopPropagation();
        console.log('🎯 Drawing clicked:', drawing.uuid);
        onDrawingClick && onDrawingClick(drawing);
      },
      onMouseEnter: (e) => {
        // Visual feedback on hover
        e.target.style.opacity = '0.7';
      },
      onMouseLeave: (e) => {
        // Reset opacity on mouse leave
        e.target.style.opacity = opacity.toString();
      }
    };

    switch (type) {
      case 'freehand':
        if (!data.path || data.path.length < 2) return null;
        const pathData = `M ${data.path[0].x} ${data.path[0].y} ` +
          data.path.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        return (
          <path
            key={drawing.uuid}
            d={pathData}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            {...commonProps}
          />
        );
      
      case 'line':
        if (!data.path || data.path.length < 2) return null;
        return (
          <line
            key={drawing.uuid}
            x1={data.path[0].x}
            y1={data.path[0].y}
            x2={data.path[1].x}
            y2={data.path[1].y}
            vectorEffect="non-scaling-stroke"
            {...commonProps}
          />
        );
      
      case 'rectangle':
        if (!data.path || data.path.length < 2) return null;
        const rect = {
          x: Math.min(data.path[0].x, data.path[1].x),
          y: Math.min(data.path[0].y, data.path[1].y),
          width: Math.abs(data.path[1].x - data.path[0].x),
          height: Math.abs(data.path[1].y - data.path[0].y)
        };
        return (
          <rect
            key={drawing.uuid}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill="none"
            vectorEffect="non-scaling-stroke"
            {...commonProps}
          />
        );
      
      case 'circle':
        if (!data.path || data.path.length < 2) return null;
        const radius = Math.sqrt(
          Math.pow(data.path[1].x - data.path[0].x, 2) +
          Math.pow(data.path[1].y - data.path[0].y, 2)
        );
        return (
          <circle
            key={drawing.uuid}
            cx={data.path[0].x}
            cy={data.path[0].y}
            r={radius}
            fill="none"
            vectorEffect="non-scaling-stroke"
            {...commonProps}
          />
        );
      
      case 'arrow':
        if (!data.path || data.path.length < 2) return null;
        const start = data.path[0];
        const end = data.path[1];
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const arrowLength = 0.02; // Relative to page size
        const arrowAngle = Math.PI / 6;
        
        return (
          <g key={drawing.uuid} {...commonProps}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={`M ${end.x} ${end.y} 
                  L ${end.x - arrowLength * Math.cos(angle - arrowAngle)} ${end.y - arrowLength * Math.sin(angle - arrowAngle)}
                  M ${end.x} ${end.y}
                  L ${end.x - arrowLength * Math.cos(angle + arrowAngle)} ${end.y - arrowLength * Math.sin(angle + arrowAngle)}`}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      
      default:
        return null;
    }
  };

  if (pageDrawings.length === 0) return null;

  return (
    <svg
      className="absolute inset-0"
      style={{ 
        width: '100%', 
        height: '100%', 
        zIndex: 15,
        pointerEvents: 'none' // Disable on container
      }}
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
    >
      {pageDrawings.map(renderDrawing)}
    </svg>
  );
};

export default DrawingRenderer;