'use client';

import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsViewer } from './components/ResultsViewer';
import { SampleData } from './components/SampleData';
import { ApiResponse } from './types';

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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process the image');
      }
      
      if (data.success && data.sessionId) {
        // Fetch the results and visualizations
        const resultsResponse = await fetch(`/api/results/${data.sessionId}`);
        const resultsData = await resultsResponse.json();
        
        if (!resultsResponse.ok) {
          throw new Error(resultsData.error || 'Failed to retrieve results');
        }
        
        setResults(resultsData);
      } else {
        setResults(data);
      }
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
    setDownloadProgress(`Downloading ${sample.name}...`);
    
    try {
      // Step 1: Download the sample file
      const downloadResponse = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: sample.url }),
      });
      
      const downloadData = await downloadResponse.json();
      
      if (!downloadResponse.ok) {
        throw new Error(downloadData.error || 'Failed to download sample data');
      }
      
      setDownloadProgress(`Processing ${sample.name}...`);
      
      // Step 2: Process the downloaded file
      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filePath: downloadData.filePath,
          sessionId: downloadData.sessionId,
          filename: downloadData.filename 
        }),
      });
      
      const processData = await processResponse.json();
      
      if (!processResponse.ok) {
        throw new Error(processData.error || 'Failed to process the sample data');
      }
      
      if (processData.success && processData.sessionId) {
        // Step 3: Fetch the results and visualizations
        const resultsResponse = await fetch(`/api/results/${processData.sessionId}`);
        const resultsData = await resultsResponse.json();
        
        if (!resultsResponse.ok) {
          throw new Error(resultsData.error || 'Failed to retrieve results');
        }
        
        setResults(resultsData);
      } else {
        setResults(processData);
      }
    } catch (err) {
      console.error('Error processing sample data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResults(null);
    } finally {
      setIsUploading(false);
      setDownloadProgress(null);
    }
  };

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
                  <p className="text-sm text-blue-700">{downloadProgress}</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-4 bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </section>
          
          {results && (
            <section className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
              <ResultsViewer data={results} />
            </section>
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
