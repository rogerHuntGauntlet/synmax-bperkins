'use client';

import { useState } from 'react';

interface SampleData {
  name: string;
  description: string;
  url: string;
  size: string;
  format: string;
}

const SAMPLE_DATA: SampleData[] = [
  {
    name: "Ship Detection Sample 1",
    description: "UMBRA-04 SAR data with ships in harbor",
    url: "http://umbra-open-data-catalog.s3.amazonaws.com/sar-data/tasks/ship_detection_testdata/0c4a34d4-671d-412f-a8c5-fcb7543fd220/2023-08-31-01-09-38_UMBRA-04/2023-08-31-01-09-38_UMBRA-04_GEC.tif",
    size: "248.8 MB",
    format: "GEC TIFF"
  },
  {
    name: "Ship Detection SICD Sample",
    description: "UMBRA-04 SAR data in SICD format",
    url: "http://umbra-open-data-catalog.s3.amazonaws.com/sar-data/tasks/ship_detection_testdata/0c4a34d4-671d-412f-a8c5-fcb7543fd220/2023-08-31-01-09-38_UMBRA-04/2023-08-31-01-09-38_UMBRA-04_SICD.nitf",
    size: "872.1 MB",
    format: "SICD NITF"
  },
  {
    name: "Ship Detection CPHD Sample",
    description: "UMBRA-04 SAR data in CPHD format (raw phase history)",
    url: "http://umbra-open-data-catalog.s3.amazonaws.com/sar-data/tasks/ship_detection_testdata/0c4a34d4-671d-412f-a8c5-fcb7543fd220/2023-08-31-01-09-38_UMBRA-04/2023-08-31-01-09-38_UMBRA-04_CPHD.cphd",
    size: "2.7 GB",
    format: "CPHD"
  }
];

interface SampleDataProps {
  onSelect: (sample: SampleData) => void;
}

export const SampleData = ({ onSelect }: SampleDataProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-6">
      <button
        className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        Try with sample data
      </button>
      
      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 gap-3">
          {SAMPLE_DATA.map((sample, index) => (
            <div 
              key={index}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelect(sample)}
            >
              <div className="flex justify-between">
                <h3 className="font-medium text-gray-900">{sample.name}</h3>
                <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{sample.size}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{sample.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {sample.format}
                </span>
                <span className="text-xs text-gray-500 italic">
                  {sample.size.includes('GB') ? 'Large file - may take several minutes' : ''}
                </span>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-1">
            Data Source: <a href="https://umbra.space/open-data/" target="_blank" rel="noopener noreferrer" className="underline">Umbra Open Data Catalog</a>
          </p>
        </div>
      )}
    </div>
  );
}; 