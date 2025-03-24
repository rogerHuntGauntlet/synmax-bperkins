'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line, Scatter } from 'react-chartjs-2';
import { ShipResult } from '../types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

interface MotionVisualizationProps {
  shipData?: ShipResult;
  showMockData?: boolean;
}

export const MotionVisualization = ({ shipData, showMockData = false }: MotionVisualizationProps) => {
  const [activeTab, setActiveTab] = useState<'displacement' | 'frequency'>('displacement');
  
  // Use the provided ship data or generate mock data if requested
  const data = shipData || (showMockData ? generateMockShipData() : null);
  
  if (!data && !showMockData) {
    return (
      <div className="p-4 bg-gray-50 rounded-md text-center">
        <p className="text-gray-500">No ship data available for visualization</p>
      </div>
    );
  }

  // Ensure data is never null when passed to visualization components
  const shipDataForViz: ShipResult = data || generateMockShipData();

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="flex border-b">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'displacement' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('displacement')}
        >
          Displacement Field
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'frequency' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('frequency')}
        >
          Frequency Analysis
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'displacement' ? (
          <DisplacementVisualization data={shipDataForViz} />
        ) : (
          <FrequencyVisualization data={shipDataForViz} />
        )}
      </div>
    </div>
  );
};

interface VisualizationProps {
  data: ShipResult;
}

const DisplacementVisualization = ({ data }: VisualizationProps) => {
  // Generate time points (synthetic - would be based on actual time in real data)
  const timePoints = Array.from({ length: 20 }, (_, i) => i);
  
  // Use displacement field data or generate synthetic data points
  const displacementField = data.displacement_field;
  
  // Extract representative values from the displacement field
  // In a real implementation, you would use the actual displacement field data
  const rangeValues = displacementField.range_offsets 
    ? extractRepresentativeValues(displacementField.range_offsets, 20)
    : generateSyntheticData(20, 0.5);
    
  const azimuthValues = displacementField.azimuth_offsets 
    ? extractRepresentativeValues(displacementField.azimuth_offsets, 20)
    : generateSyntheticData(20, 0.8);
  
  const chartData: ChartData<'line'> = {
    labels: timePoints.map(t => t.toString()),
    datasets: [
      {
        label: 'Range Displacement',
        data: rangeValues,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Azimuth Displacement',
        data: azimuthValues,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Ship Displacement Over Time',
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Displacement (pixels)',
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time Point',
        }
      }
    }
  };

  return (
    <div className="h-[400px]">
      <Line data={chartData} options={options} />
    </div>
  );
};

const FrequencyVisualization = ({ data }: VisualizationProps) => {
  // Use dominant frequencies from the data or generate mock data
  const frequencies = data.dominant_frequencies.length > 0 
    ? data.dominant_frequencies 
    : generateMockFrequencies();
  
  // Create scatter data for frequency modes
  const scatterData: ChartData<'scatter'> = {
    datasets: frequencies.map((freq, index) => ({
      label: `Mode ${index + 1}`,
      data: [
        {
          x: freq.frequency[0],
          y: freq.frequency[1],
          r: freq.amplitude * 10, // Scale the point size based on amplitude
        },
      ],
      backgroundColor: getColorForIndex(index),
    })),
  };

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Dominant Frequency Modes',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const index = context.datasetIndex;
            const freq = frequencies[index];
            return [
              `Mode ${index + 1}`,
              `Frequency: [${freq.frequency[0].toFixed(4)}, ${freq.frequency[1].toFixed(4)}]`,
              `Amplitude: ${freq.amplitude.toFixed(2)}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Frequency Y',
        }
      },
      x: {
        title: {
          display: true,
          text: 'Frequency X',
        }
      }
    }
  };

  return (
    <div>
      <div className="h-[400px]">
        <Scatter data={scatterData} options={options} />
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {frequencies.map((freq, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded border">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getColorForIndex(index) }}
              ></div>
              <span className="font-medium">Mode {index + 1}</span>
            </div>
            <div className="mt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amplitude:</span>
                <span className="font-medium">{freq.amplitude.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frequency:</span>
                <span className="font-medium">
                  [{freq.frequency[0].toFixed(4)}, {freq.frequency[1].toFixed(4)}]
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Peak Location:</span>
                <span className="font-medium">
                  [{freq.peak_location[0].toFixed(1)}, {freq.peak_location[1].toFixed(1)}]
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper functions
function extractRepresentativeValues(array: number[][], count: number): number[] {
  // This is a simplified version - in a real app, you'd want to actually use
  // the 2D displacement array data more intelligently
  
  // Get the center row of the 2D array
  const centerRow = Math.floor(array.length / 2);
  const row = array[centerRow] || [];
  
  // If the row is longer than the requested count, sample it
  if (row.length > count) {
    const step = Math.floor(row.length / count);
    return Array.from({ length: count }, (_, i) => row[i * step] || 0);
  }
  
  // If the row is shorter, pad with zeroes
  if (row.length < count) {
    return [...row, ...Array(count - row.length).fill(0)];
  }
  
  return row;
}

function generateSyntheticData(count: number, scale: number): number[] {
  // Create a sine wave with some noise
  return Array.from({ length: count }, (_, i) => {
    return Math.sin(i * 0.5) * scale + (Math.random() - 0.5) * scale * 0.3;
  });
}

function getColorForIndex(index: number): string {
  const colors = [
    'rgba(75, 192, 192, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
  ];
  return colors[index % colors.length];
}

// Mock data generation for when no real data is available
function generateMockShipData(): ShipResult {
  return {
    ship_id: 0,
    region: [100, 180, 200, 300],
    displacement_field: {
      range_offsets: Array.from({ length: 10 }, () => 
        Array.from({ length: 10 }, () => (Math.random() - 0.5) * 2)
      ),
      azimuth_offsets: Array.from({ length: 10 }, () => 
        Array.from({ length: 10 }, () => (Math.random() - 0.5) * 2)
      ),
      magnitude: Array.from({ length: 10 }, () => 
        Array.from({ length: 10 }, () => Math.random() * 3)
      ),
    },
    dominant_frequencies: generateMockFrequencies(),
  };
}

function generateMockFrequencies(): {
  frequency: [number, number];
  amplitude: number;
  peak_location: [number, number];
}[] {
  return [
    {
      frequency: [0.1253, 0.2145],
      amplitude: 1.8,
      peak_location: [120, 240],
    },
    {
      frequency: [0.0532, 0.1643],
      amplitude: 1.2,
      peak_location: [135, 255],
    },
    {
      frequency: [0.1863, 0.0897],
      amplitude: 0.75,
      peak_location: [150, 220],
    },
  ];
} 