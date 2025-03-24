#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test script for the server API which uses micro_motion_estimator.py
"""

import os
import sys
import json
import requests
from io import BytesIO
import numpy as np
import tempfile

def test_server_api():
    """Test the server API endpoints"""
    
    print("Testing the server API...")
    
    # Test the health endpoint
    try:
        print("\nTesting health endpoint:")
        response = requests.get("http://localhost:8000/health")
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error testing health endpoint: {e}")
    
    # Create a simple mock data file for testing the process endpoint
    try:
        print("\nCreating mock data for process endpoint test...")
        
        # Create a temporary file with mock data
        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as temp:
            temp_filename = temp.name
            print(f"Created temporary file: {temp_filename}")
            
            # Create mock data (simple 2D array)
            mock_data = np.random.rand(512, 512)
            
            # Save to the temporary file
            np.save(temp_filename, mock_data)
        
        # Test the process endpoint
        print("\nTesting process endpoint:")
        with open(temp_filename, 'rb') as f:
            files = {'file': (os.path.basename(temp_filename), f, 'application/octet-stream')}
            response = requests.post("http://localhost:8000/process", files=files)
            
            print(f"Status code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Success: {result.get('success')}")
                
                if result.get('success'):
                    # Print the structure of the results
                    results_data = result.get('results', {})
                    print("\nResults structure:")
                    print(f"- Keys: {list(results_data.keys())}")
                    
                    # Print metadata
                    metadata = results_data.get('metadata', {})
                    print("\nMetadata:")
                    for key, value in metadata.items():
                        print(f"- {key}: {value}")
                    
                    # Print ship information
                    ships = results_data.get('ships', [])
                    print(f"\nNumber of ships detected: {len(ships)}")
                    
                    for i, ship in enumerate(ships):
                        print(f"\nShip {i}:")
                        print(f"- Region: {ship.get('region')}")
                        dominant_freqs = ship.get('dominant_frequencies', [])
                        print(f"- Number of dominant frequencies: {len(dominant_freqs)}")
                        
                        if dominant_freqs:
                            print("\nTop frequency modes:")
                            for j, freq in enumerate(dominant_freqs[:3]):
                                print(f"  Mode {j}: Frequency {freq.get('frequency')}, Amplitude: {freq.get('amplitude'):.2f}")
                else:
                    print(f"Error: {result.get('error')}")
                    if 'traceback' in result:
                        print(f"Traceback: {result.get('traceback')}")
    except Exception as e:
        import traceback
        print(f"Error testing process endpoint: {e}")
        print(traceback.format_exc())
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_filename)
            print(f"\nRemoved temporary file: {temp_filename}")
        except Exception as e:
            print(f"Error removing temporary file: {e}")

if __name__ == "__main__":
    test_server_api() 