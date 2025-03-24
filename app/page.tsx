'use client';

import { useState, useRef, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsViewer } from './components/ResultsViewer';
import { SampleData } from './components/SampleData';
import { MotionVisualization } from './components/MotionVisualization';
import { ImageVisualization } from './components/ImageVisualization';
import { ApiResponse, ShipResult } from './types';

interface SampleDataItem {
  name: string;
  description: string;
  url: string;
  size: string;
  format: string;
}

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to calculate estimated download time based on file size
  const calculateEstimatedTime = (sizeString: string): string => {
    // Parse size from string like "248.8 MB" or "2.7 GB"
    const sizeMatch = sizeString.match(/(\d+(\.\d+)?)\s*(MB|GB)/);
    if (!sizeMatch) return "Unknown";
    
    const size = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[3];
    
    // Convert to MB for calculation
    const sizeInMB = unit === 'GB' ? size * 1024 : size;
    
    // Assume average download speed (adjust as needed)
    const avgSpeedMbps = 5; // 5 Mbps
    const avgSpeedMBps = avgSpeedMbps / 8; // Convert Mbps to MBps
    
    // Calculate time in seconds
    const estimatedSeconds = sizeInMB / avgSpeedMBps;
    
    if (estimatedSeconds < 60) {
      return `about ${Math.ceil(estimatedSeconds)} seconds`;
    } else if (estimatedSeconds < 3600) {
      return `about ${Math.ceil(estimatedSeconds / 60)} minutes`;
    } else {
      const hours = Math.floor(estimatedSeconds / 3600);
      const minutes = Math.ceil((estimatedSeconds % 3600) / 60);
      return `about ${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
    }
  };

  // Function to start the processing timer
  const startProcessingTimer = () => {
    // Clear any existing timer
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
    }
    
    setProcessingStartTime(Date.now());
    setProcessingTime(0);
    
    processingTimerRef.current = setInterval(() => {
      setProcessingTime(prevTime => prevTime + 1);
    }, 1000);
  };

  // Function to stop the processing timer
  const stopProcessingTimer = () => {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setDownloadProgress(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }
      
      setResults(data);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResults(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSampleSelect = async (sample: SampleDataItem) => {
    setIsUploading(true);
    setError(null);
    setEstimatedTime(calculateEstimatedTime(sample.size));
    setDownloadProgress(`Downloading ${sample.name}...`);
    
    try {
      // Use the updated API that directly processes the sample data
      console.log(`Processing sample data from URL: ${sample.url}`);
      const response = await fetch(`/api/download?url=${encodeURIComponent(sample.url)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch((parseError) => {
          console.error('Error parsing error response:', parseError);
          return { error: `Failed to parse error response: ${response.status} ${response.statusText}` };
        });
        
        console.error('API Error Response:', errorData);
        throw new Error(
          errorData.error || 
          errorData.details || 
          `Server error: ${response.status} ${response.statusText}`
        );
      }
      
      // Download complete, now processing
      setDownloadProgress(`Processing ${sample.name}...`);
      setEstimatedTime(null);
      startProcessingTimer();
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('API Returned Unsuccessful Response:', data);
        throw new Error(data.error || data.details || 'Processing failed');
      }
      
      // If the API returned timing data, use it
      if (data.timing) {
        setProcessingTime(Math.round(data.timing.processingTime));
        console.log(`Actual download time: ${data.timing.downloadTime}s, processing time: ${data.timing.processingTime}s`);
      }
      
      setResults(data);
    } catch (err) {
      console.error('Error processing sample data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResults(null);
    } finally {
      stopProcessingTimer();
      setIsUploading(false);
      setDownloadProgress(null);
      setEstimatedTime(null);
    }
  };

  // Clean up the timer when component unmounts
  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
    };
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Ship Micro-Motion Estimation</h1>
          <p className="text-gray-600">
            Upload a SAR image to analyze micro-motion of ships using pixel tracking technology.
          </p>
        </div>
        
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Upload SAR Image</h2>
            <SampleData onSelect={handleSampleSelect} />
            <FileUpload onUpload={handleUpload} isUploading={isUploading} />
            
            {downloadProgress && (
              <div className="mt-4 bg-blue-50 p-4 rounded-md">
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-blue-700">{downloadProgress}</span>
                    {estimatedTime && (
                      <span className="text-sm text-blue-600">Estimated time: {estimatedTime}</span>
                    )}
                    {processingTime > 0 && (
                      <span className="text-sm text-blue-600">Processing time: {processingTime} seconds</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-4 bg-red-50 p-4 rounded-md text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}
          </section>
          
          {results ? (
            <section className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Results</h2>
              <ResultsViewer data={results} />
            </section>
          ) : (
            <div className="space-y-8">
              <section className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Sample SAR Image Visualization</h2>
                <div className="p-4 bg-gray-50 rounded-md mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    This is a sample SAR image visualization. Upload a real SAR image or select a sample dataset to see actual results.
                  </p>
                </div>
                <ImageVisualization showMockData={true} ships={generateMockShips()} />
              </section>
              
              <section className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Sample Motion Analysis</h2>
                <div className="p-4 bg-gray-50 rounded-md mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    This is a sample motion visualization. Upload a SAR image or select a sample dataset to see actual results.
                  </p>
                </div>
                <MotionVisualization showMockData={true} />
              </section>
            </div>
          )}
          
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">About the Algorithm</h2>
            <div className="prose max-w-none">
              <p>
                This tool implements the algorithm described in the paper &ldquo;Micro-Motion Estimation 
                of Maritime Targets Using Pixel Tracking in Cosmo-Skymed Synthetic Aperture Radar Data—An 
                Operative Assessment&rdquo; published in MDPI Remote Sensing.
              </p>
              <p>
                The algorithm works by splitting a single SAR image into temporal sub-apertures and using 
                sub-pixel tracking to estimate the micro-motion of ships. Key steps include:
              </p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Splitting the Doppler spectrum into sub-apertures</li>
                <li>Performing sub-pixel coregistration between sub-apertures</li>
                <li>Estimating motion fields using offset tracking</li>
                <li>Analyzing frequency modes to identify ship vibrations</li>
              </ol>
              <p className="mt-4">
                <a 
                  href="https://www.mdpi.com/2072-4292/11/14/1637" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Read the original paper →
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

// Helper function to generate mock ships for the visualization example
function generateMockShips(): ShipResult[] {
  return [
    {
      ship_id: 0,
      region: [150, 170, 100, 150] as [number, number, number, number],
      displacement_field: {
        range_offsets: [],
        azimuth_offsets: [],
        magnitude: []
      },
      dominant_frequencies: [
        {
          frequency: [0.1253, 0.2145] as [number, number],
          amplitude: 1.8,
          peak_location: [120, 240] as [number, number]
        }
      ]
    },
    {
      ship_id: 1,
      region: [190, 210, 250, 300] as [number, number, number, number],
      displacement_field: {
        range_offsets: [],
        azimuth_offsets: [],
        magnitude: []
      },
      dominant_frequencies: [
        {
          frequency: [0.0532, 0.1643] as [number, number],
          amplitude: 1.2,
          peak_location: [135, 255] as [number, number]
        }
      ]
    },
    {
      ship_id: 2,
      region: [230, 250, 400, 450] as [number, number, number, number],
      displacement_field: {
        range_offsets: [],
        azimuth_offsets: [],
        magnitude: []
      },
      dominant_frequencies: [
        {
          frequency: [0.1863, 0.0897] as [number, number],
          amplitude: 0.75,
          peak_location: [150, 220] as [number, number]
        }
      ]
    }
  ];
}
