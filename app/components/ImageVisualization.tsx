'use client';

import { useEffect, useRef, useState } from 'react';
import { ShipResult } from '../types';

interface ImageVisualizationProps {
  imageData?: string; // Base64 encoded image
  ships?: ShipResult[];
  showMockData?: boolean;
}

export const ImageVisualization = ({ imageData, ships = [], showMockData = false }: ImageVisualizationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mockImage, setMockImage] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    shipId: number;
    x: number;
    y: number;
  } | null>(null);
  
  // Generate mock image on client-side only
  useEffect(() => {
    if (showMockData && !imageData) {
      setMockImage(generateMockSARImage());
    }
  }, [imageData, showMockData]);
  
  // Get the image source - either from props, mock data (client-side generated), or null
  const imageSrc = imageData || mockImage;
  
  useEffect(() => {
    if (!canvasRef.current || !imageSrc) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the base image
      ctx.drawImage(img, 0, 0);
      
      // Draw ship regions
      ships.forEach(ship => {
        const [yStart, yEnd, xStart, xEnd] = ship.region;
        
        // Draw rectangle for ship region
        ctx.strokeStyle = getColorForShip(ship.ship_id);
        ctx.lineWidth = 2;
        ctx.strokeRect(xStart, yStart, xEnd - xStart, yEnd - yStart);
        
        // Add ship ID label
        ctx.fillStyle = getColorForShip(ship.ship_id);
        ctx.font = '14px Arial';
        ctx.fillText(`Ship ${ship.ship_id + 1}`, xStart, yStart - 5);
      });
    };
    
    img.src = imageSrc;
  }, [imageSrc, ships]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || ships.length === 0) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if mouse is over any ship region
    for (const ship of ships) {
      const [yStart, yEnd, xStart, xEnd] = ship.region;
      if (x >= xStart && x <= xEnd && y >= yStart && y <= yEnd) {
        setHoverInfo({
          shipId: ship.ship_id,
          x,
          y
        });
        return;
      }
    }
    
    setHoverInfo(null);
  };
  
  if (!imageSrc) {
    return (
      <div className="p-4 bg-gray-50 rounded-md text-center">
        <p className="text-gray-500">No image data available for visualization</p>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <div className="border rounded overflow-hidden">
        <canvas 
          ref={canvasRef}
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
        />
      </div>
      
      {hoverInfo && (
        <div
          className="absolute z-10 bg-black bg-opacity-75 text-white p-2 rounded text-sm pointer-events-none"
          style={{
            left: `${hoverInfo.x + 10}px`,
            top: `${hoverInfo.y + 10}px`,
          }}
        >
          <div>Ship {hoverInfo.shipId + 1}</div>
          {ships.find(s => s.ship_id === hoverInfo.shipId) && (
            <div className="text-xs text-gray-300">
              Click to view detailed analysis
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {ships.map(ship => (
          <div 
            key={ship.ship_id}
            className="flex items-center p-2 rounded border cursor-pointer hover:bg-gray-50"
          >
            <div 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: getColorForShip(ship.ship_id) }}
            />
            <div>
              <div className="font-medium">Ship {ship.ship_id + 1}</div>
              <div className="text-xs text-gray-500">
                Region: Y:[{ship.region[0]}, {ship.region[1]}], X:[{ship.region[2]}, {ship.region[3]}]
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper functions
function getColorForShip(shipId: number): string {
  const colors = [
    'rgba(255, 99, 132, 1)',   // Red
    'rgba(54, 162, 235, 1)',   // Blue
    'rgba(255, 206, 86, 1)',   // Yellow
    'rgba(75, 192, 192, 1)',   // Teal
    'rgba(153, 102, 255, 1)',  // Purple
    'rgba(255, 159, 64, 1)',   // Orange
  ];
  return colors[shipId % colors.length];
}

// Client-side only function to generate a mock SAR image
function generateMockSARImage(): string {
  // Only run in browser environment
  if (typeof document === 'undefined') {
    // Return a tiny transparent image as a fallback for server rendering
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  }
  
  // Create a mock SAR image
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Fill with dark gray background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some noise to simulate SAR image texture
    for (let i = 0; i < 100000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const brightness = Math.random() * 100;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness / 200})`;
      ctx.fillRect(x, y, 1, 1);
    }
    
    // Add some brighter areas to simulate ships
    for (let i = 0; i < 3; i++) {
      const shipX = 100 + i * 150;
      const shipY = 150 + i * 40;
      const shipWidth = 50 + Math.random() * 50;
      const shipHeight = 20 + Math.random() * 20;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(shipX, shipY, shipWidth, shipHeight);
      
      // Add some internal structure
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(shipX + shipWidth * 0.3, shipY, shipWidth * 0.1, shipHeight);
      ctx.fillRect(shipX + shipWidth * 0.6, shipY, shipWidth * 0.1, shipHeight);
    }
    
    // Add ocean-like patterns
    for (let i = 0; i < 50; i++) {
      const startX = Math.random() * canvas.width;
      const startY = Math.random() * canvas.height;
      const length = 20 + Math.random() * 80;
      const angle = Math.random() * Math.PI;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + Math.cos(angle) * length, 
        startY + Math.sin(angle) * length
      );
      ctx.stroke();
    }
    
    return canvas.toDataURL('image/png');
  }
  
  // Fallback if canvas is not supported
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
} 