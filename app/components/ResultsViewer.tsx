'use client';

import { ApiResponse, ProcessingResult, ShipResult } from '../types';

interface ResultsViewerProps {
  data: ApiResponse;
}

export const ResultsViewer = ({ data }: ResultsViewerProps) => {
  if (!data || !data.success || !data.results) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <h3 className="text-lg font-medium text-red-800">Error</h3>
        <p className="text-sm text-red-700 mt-1">{data?.error || data?.details || 'Failed to process the image'}</p>
      </div>
    );
  }

  const { results, figures } = data;
  const { metadata, ships } = results;
  const sessionId = data.id || data.sessionId || 'unknown';

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Processing Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard 
            title="Ships Detected" 
            value={metadata.num_ships_detected.toString()} 
            icon="🚢" 
          />
          <InfoCard 
            title="Image Size" 
            value={`${metadata.image_shape[0]} × ${metadata.image_shape[1]}`} 
            icon="📐" 
          />
          <InfoCard 
            title="Session ID" 
            value={sessionId.substring(0, 8)} 
            icon="🔑" 
          />
        </div>
      </div>

      {/* Display base64 encoded figures */}
      {figures && Object.keys(figures).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Visualizations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(figures).map(([key, imgData]) => (
              <div key={key} className="border rounded overflow-hidden">
                <h3 className="text-md font-medium p-2 bg-gray-50 border-b capitalize">
                  {key.replace(/_/g, ' ')}
                </h3>
                <div className="p-2">
                  <img 
                    src={imgData} 
                    alt={`${key} visualization`} 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ships.length > 0 ? (
        <div className="space-y-6">
          {ships.map((ship) => (
            <ShipResultCard 
              key={ship.ship_id} 
              ship={ship}
            />
          ))}
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-yellow-700">No ships were detected in the provided SAR image.</p>
        </div>
      )}
    </div>
  );
};

interface InfoCardProps {
  title: string;
  value: string;
  icon: string;
}

const InfoCard = ({ title, value, icon }: InfoCardProps) => (
  <div className="bg-gray-50 p-4 rounded-md">
    <div className="flex items-center">
      <span className="text-2xl mr-3">{icon}</span>
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  </div>
);

interface ShipResultCardProps {
  ship: ShipResult;
}

const ShipResultCard = ({ ship }: ShipResultCardProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4">Ship {ship.ship_id + 1}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium mb-2">Region of Interest</h4>
          <p className="text-sm text-gray-600">
            Y: [{ship.region[0]}, {ship.region[1]}], X: [{ship.region[2]}, {ship.region[3]}]
          </p>
          
          <h4 className="text-md font-medium mt-4 mb-2">Dominant Frequency Modes</h4>
          <div className="space-y-2">
            {ship.dominant_frequencies.map((freq, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Mode {idx + 1}</span>
                  <span className="text-sm font-semibold">{freq.amplitude.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  Frequency: [{freq.frequency[0].toFixed(4)}, {freq.frequency[1].toFixed(4)}]
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 