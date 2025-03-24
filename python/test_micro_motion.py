#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test script for micro_motion_estimator.py
"""

import os
import sys
import json
import numpy as np
import tempfile
from micro_motion_estimator import MicroMotionEstimator

def test_micro_motion():
    """Test the MicroMotionEstimator class"""
    
    # Initialize the estimator
    estimator = MicroMotionEstimator()
    
    # Check what methods are available
    print("Available methods:")
    methods = [method for method in dir(estimator) if not method.startswith('__')]
    for method in methods:
        print(f"- {method}")
    
    # Check parameter values
    print("\nParameters:")
    for param, value in estimator.params.items():
        print(f"- {param}: {value}")
    
    # Create a mock data file for testing
    print("\nCreating mock data for testing...")
    
    # Create a temporary file with mock SAR data
    with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as temp:
        temp_filename = temp.name
        print(f"Created temporary file: {temp_filename}")
        
        # Create mock complex data (2D array of complex numbers)
        rows, cols = 512, 512
        # Create background with low amplitude noise
        background = np.random.normal(0, 0.05, (rows, cols)) + 1j * np.random.normal(0, 0.05, (rows, cols))
        
        # Create ship target with high amplitude
        # Ship size and position
        ship_center_x, ship_center_y = cols // 3, rows // 3
        ship_length, ship_width = 50, 20
        
        # Create ship shape
        ship = np.zeros((rows, cols), dtype=np.complex128)
        for i in range(rows):
            for j in range(cols):
                # Create elliptical ship shape
                if ((i - ship_center_y) / ship_length) ** 2 + ((j - ship_center_x) / ship_width) ** 2 <= 0.25:
                    # High amplitude for ship pixels
                    ship[i, j] = 10 + 10j
        
        # Add second ship
        ship2_center_x, ship2_center_y = 2 * cols // 3, 2 * rows // 3
        for i in range(rows):
            for j in range(cols):
                # Create another ship shape
                if ((i - ship2_center_y) / ship_width) ** 2 + ((j - ship2_center_x) / ship_length) ** 2 <= 0.25:
                    # High amplitude for ship pixels
                    ship[i, j] = 15 + 15j
        
        # Combine background and ships
        mock_data = background + ship
        
        # Save the mock data to the temporary file (just a placeholder)
        np.save(temp_filename, mock_data)
    
    # Override the extract_ship_regions method to use a lower threshold
    original_extract_ship_regions = estimator.extract_ship_regions
    estimator.extract_ship_regions = lambda image, threshold=0.5: original_extract_ship_regions(image, threshold)
    
    # Monkey patch the read_cphd_data method to use our test data
    def mock_read_cphd_data(self, file_path):
        print(f"Mock reading data from: {file_path}")
        return {
            'metadata': {'mock': True},
            'complex_data': mock_data  # Use our mock data
        }
    
    # Apply monkey patch
    original_read_cphd_data = estimator.read_cphd_data
    estimator.read_cphd_data = lambda file_path: mock_read_cphd_data(estimator, file_path)
    
    try:
        print("\nTrying to process with mock data:")
        results = estimator.process_image(temp_filename)
        print(f"Return value type: {type(results)}")
        print(f"Return value keys: {list(results.keys())}")
        print("\nMetadata:")
        for key, value in results.get('metadata', {}).items():
            print(f"- {key}: {value}")
        
        print(f"\nNumber of ships detected: {len(results.get('ships', []))}")
        
        for i, ship in enumerate(results.get('ships', [])):
            print(f"\nShip {i}:")
            print(f"- Region: {ship.get('region')}")
            print(f"- Number of dominant frequencies: {len(ship.get('dominant_frequencies', []))}")
            
            if ship.get('dominant_frequencies'):
                print("\nTop frequency modes:")
                for j, freq in enumerate(ship.get('dominant_frequencies')[:3]):
                    print(f"  Mode {j}: Frequency {freq.get('frequency')}, Amplitude: {freq.get('amplitude'):.2f}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        print(traceback.format_exc())
    finally:
        # Restore original methods
        estimator.read_cphd_data = original_read_cphd_data
        estimator.extract_ship_regions = original_extract_ship_regions
        # Clean up temp file
        try:
            os.unlink(temp_filename)
            print(f"\nRemoved temporary file: {temp_filename}")
        except Exception as e:
            print(f"Error removing temporary file: {e}")

if __name__ == "__main__":
    test_micro_motion() 