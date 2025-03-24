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
        <p className="text-sm text-red-700 mt-1">{data?.error || 'Failed to process the image'}</p>
      </div>
    );
  }

  const { results, figures } = data;
  const { metadata, ships } = results;

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
            value={data.sessionId.substring(0, 8)} 
            icon="🔑" 
          />
        </div>
      </div>

      {ships.length > 0 ? (
        <div className="space-y-6">
          {ships.map((ship) => (
            <ShipResultCard 
              key={ship.ship_id} 
              ship={ship} 
              figures={getFiguresForShip(figures || [], ship.ship_id)} 
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

const getFiguresForShip = (figures: string[], shipId: number): string[] => {
  return figures.filter(url => url.includes(`ship_${shipId}_`));
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
  figures: string[];
}

const ShipResultCard = ({ ship, figures }: ShipResultCardProps) => {
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
        
        <div>
          <h4 className="text-md font-medium mb-2">Visualizations</h4>
          <div className="space-y-4">
            {figures.map((figure, idx) => (
              <div key={idx} className="border rounded-md overflow-hidden">
                <img 
                  src={figure}
                  alt={`Visualization ${idx + 1} for Ship ${ship.ship_id + 1}`}
                  className="w-full h-auto"
                />
              </div>
            ))}
            
            {figures.length === 0 && (
              <p className="text-sm text-gray-500 italic">No visualizations available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 