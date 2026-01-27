import React, { useState, useRef, useEffect } from 'react';
import { SidebarResizerProps } from './types';



export const SidebarResizer: React.FC<SidebarResizerProps> = ({
  onResize,
  currentWidth,
  minWidth = 240,
  maxWidth = 600,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(currentWidth);

  useEffect(() => {
    if (!isDragging) {
      startWidthRef.current = currentWidth;
    }
  }, [currentWidth, isDragging]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + diff));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minWidth, maxWidth, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute top-0 right-0 w-1 h-full cursor-col-resize z-50 group ${
        isDragging ? 'bg-emerald-500' : 'bg-transparent hover:bg-emerald-400/30'
      } transition-colors`}
      style={{ touchAction: 'none' }}
    >
      {/* Indicador visual - linha central */}
      <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors ${
        isDragging ? 'bg-emerald-600' : 'bg-slate-300 group-hover:bg-emerald-500'
      }`} />
      
      {/* Área de hover expandida */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
};
