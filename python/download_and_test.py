#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script to download and test real SAR data
"""

import os
import sys
import json
import requests
import tempfile
from micro_motion_estimator import MicroMotionEstimator

def download_from_s3_or_url():
    """Download a test file from S3 or URL"""
    
    # Try downloading directly from URL first (since S3 might require credentials)
    tif_url = "http://umbra-open-data-catalog.s3.amazonaws.com/sar-data/tasks/ship_detection_testdata/0c4a34d4-671d-412f-a8c5-fcb7543fd220/2023-08-31-01-09-38_UMBRA-04/2023-08-31-01-09-38_UMBRA-04_GEC.tif"
    json_url = "http://umbra-open-data-catalog.s3.amazonaws.com/sar-data/tasks/ship_detection_testdata/0c4a34d4-671d-412f-a8c5-fcb7543fd220/2023-08-31-01-09-38_UMBRA-04/2023-08-31-01-09-38_UMBRA-04_METADATA.json"
    
    # Create a temp directory
    temp_dir = tempfile.mkdtemp()
    tif_path = os.path.join(temp_dir, "test_data.tif")
    json_path = os.path.join(temp_dir, "metadata.json")
    
    try:
        print(f"Downloading TIF file from {tif_url}...")
        # Download the TIF file
        response = requests.get(tif_url, stream=True)
        if response.status_code == 200:
            with open(tif_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"Downloaded TIF file to {tif_path}")
        else:
            print(f"Failed to download TIF file: {response.status_code}")
            return None, None
        
        # Download the metadata JSON
        print(f"Downloading metadata from {json_url}...")
        response = requests.get(json_url)
        if response.status_code == 200:
            with open(json_path, 'wb') as f:
                f.write(response.content)
            print(f"Downloaded metadata to {json_path}")
        else:
            print(f"Failed to download metadata: {response.status_code}")
        
        return tif_path, temp_dir
    
    except Exception as e:
        print(f"Error downloading file: {e}")
        return None, temp_dir

def test_with_real_data():
    """Test the micro_motion_estimator with real data"""
    
    # Download the test file
    test_file, temp_dir = download_from_s3_or_url()
    if not test_file:
        print("Failed to download test file")
        return
    
    try:
        print("\nInitializing MicroMotionEstimator...")
        # Create estimator with custom configuration
        config = {
            'params': {
                'gaussian_sigma': 2.0,
                'window_size': 64,
                'overlap_ratio': 0.5,
                'fft_size': 1024,
                'peak_threshold': 0.7
            }
        }
        estimator = MicroMotionEstimator(config)
        
        # Override the ship detection threshold
        original_extract_ship_regions = estimator.extract_ship_regions
        estimator.extract_ship_regions = lambda image, threshold=0.3: original_extract_ship_regions(image, threshold)
        
        print(f"\nProcessing file: {test_file}")
        results = estimator.process_image(test_file)
        
        # Print results
        print(f"\nResults type: {type(results)}")
        if isinstance(results, dict):
            if 'error' in results:
                print(f"Error: {results['error']}")
            else:
                print(f"Results keys: {list(results.keys())}")
                
                # Print metadata
                metadata = results.get('metadata', {})
                print("\nMetadata:")
                for key, value in metadata.items():
                    print(f"- {key}: {value}")
                
                # Print ship information
                ships = results.get('ships', [])
                print(f"\nNumber of ships detected: {len(ships)}")
                
                for i, ship in enumerate(ships):
                    print(f"\nShip {i}:")
                    print(f"- Region: {ship.get('region')}")
                    dominant_freqs = ship.get('dominant_frequencies', [])
                    print(f"- Number of dominant frequencies: {len(dominant_freqs)}")
                    
                    if dominant_freqs:
                        print("\nTop frequency modes:")
                        for j, freq in enumerate(dominant_freqs[:3]):
                            if j < len(dominant_freqs):
                                print(f"  Mode {j}: Frequency {freq.get('frequency')}, Amplitude: {freq.get('amplitude'):.2f}")
                
                # Create a results directory
                results_dir = os.path.join(temp_dir, "results")
                os.makedirs(results_dir, exist_ok=True)
                
                # Save results to JSON
                results_file = os.path.join(results_dir, "results.json")
                with open(results_file, 'w') as f:
                    json.dump(results, f, indent=2)
                print(f"\nSaved results to {results_file}")
                
                # Generate visualizations
                print("\nGenerating visualizations...")
                vis_dir = os.path.join(results_dir, "visualizations")
                os.makedirs(vis_dir, exist_ok=True)
                
                try:
                    figure_paths = estimator.visualize_results(results, vis_dir)
                    print(f"Generated {len(figure_paths)} visualization files in {vis_dir}")
                except Exception as e:
                    print(f"Error generating visualizations: {e}")
                    import traceback
                    print(traceback.format_exc())
        else:
            print(f"Unexpected result type: {type(results)}")
    
    except Exception as e:
        print(f"Error testing with real data: {e}")
        import traceback
        print(traceback.format_exc())
    
    finally:
        # Restore original method
        if 'original_extract_ship_regions' in locals():
            estimator.extract_ship_regions = original_extract_ship_regions
            
        print(f"\nResults and visualizations can be found in: {temp_dir}")
        print(f"Remember to manually delete this directory when done: {temp_dir}")

if __name__ == "__main__":
    test_with_real_data() 