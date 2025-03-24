#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Simplified script to test ship detection from SAR images
"""

import os
import sys
import json
import numpy as np
import tempfile
import rasterio
from micro_motion_estimator import MicroMotionEstimator

def test_ship_detection():
    """Test just the ship detection part of the MicroMotionEstimator"""
    
    try:
        # Check if we have local test data
        test_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_data")
        test_file = None
        
        if os.path.exists(test_dir):
            # Look for .tif files
            tif_files = [f for f in os.listdir(test_dir) if f.endswith(".tif")]
            if tif_files:
                test_file = os.path.join(test_dir, tif_files[0])
                print(f"Using local test file: {test_file}")
        
        if not test_file:
            # If no local test file, use a mock one
            with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as temp:
                temp_filename = temp.name
                print(f"Created temporary file: {temp_filename}")
                
                # Create mock data
                rows, cols = 512, 512
                mock_data = np.random.rand(rows, cols) * 0.1  # Background noise
                
                # Add a few bright spots (ships)
                for i in range(3):
                    x = np.random.randint(50, cols-50)
                    y = np.random.randint(50, rows-50)
                    size = np.random.randint(10, 30)
                    brightness = np.random.uniform(0.7, 1.0)
                    
                    # Create a ship-like shape
                    for dy in range(-size//2, size//2):
                        for dx in range(-size//2, size//2):
                            if (dx**2 + dy**2) < (size/2)**2:
                                # Bright spot with some internal texture
                                if 0 <= y+dy < rows and 0 <= x+dx < cols:
                                    mock_data[y+dy, x+dx] = brightness * (1 - 0.3*np.random.rand())
                
                # Save as a GeoTIFF using rasterio
                try:
                    # Create a GeoTIFF with rasterio
                    with rasterio.open(
                        temp_filename,
                        'w',
                        driver='GTiff',
                        height=rows,
                        width=cols,
                        count=1,
                        dtype=mock_data.dtype,
                        crs='+proj=latlong',
                        transform=rasterio.transform.from_bounds(0, 0, 1, 1, cols, rows)
                    ) as dst:
                        dst.write(mock_data, 1)
                except Exception as e:
                    print(f"Error creating GeoTIFF: {e}")
                    # Fallback to numpy save
                    np.save(temp_filename, mock_data)
                
                test_file = temp_filename
        
        # Initialize estimator
        estimator = MicroMotionEstimator()
        
        # Override the extract_ship_regions method to use a lower threshold
        # and print detailed debug info
        original_extract_ship_regions = estimator.extract_ship_regions
        
        def debug_extract_ship_regions(image, threshold=0.5):
            print(f"\nShip detection debug info:")
            print(f"- Image shape: {image.shape}")
            print(f"- Image min/max values: {np.min(image):.6f} / {np.max(image):.6f}")
            print(f"- Detection threshold: {threshold} (of max value: {np.max(image)*threshold:.6f})")
            
            # Apply threshold
            img_norm = image / np.max(image)
            binary = img_norm > threshold
            
            # Count bright pixels
            bright_pixels = np.sum(binary)
            print(f"- Number of pixels above threshold: {bright_pixels} ({bright_pixels/(image.size)*100:.2f}%)")
            
            # Run original method
            ship_regions = original_extract_ship_regions(image, threshold)
            print(f"- Number of ship regions detected: {len(ship_regions)}")
            
            # Print regions
            for i, region in enumerate(ship_regions):
                y_start, y_end, x_start, x_end = region
                height = y_end - y_start
                width = x_end - x_start
                region_size = height * width
                region_max = np.max(image[y_start:y_end, x_start:x_end])
                print(f"  Ship {i}: Position: ({x_start},{y_start}) to ({x_end},{y_end}), Size: {width}x{height}, Max value: {region_max:.6f}")
            
            return ship_regions
        
        # Apply the patched method
        estimator.extract_ship_regions = debug_extract_ship_regions
        
        # Test read_cphd_data
        print(f"\nTesting read_cphd_data with file: {test_file}")
        data = estimator.read_cphd_data(test_file)
        
        if data is None:
            print("Failed to read data file")
            return
        
        print(f"Data read successfully:")
        print(f"- Data keys: {list(data.keys())}")
        print(f"- Complex data shape: {data['complex_data'].shape}")
        if 'metadata' in data:
            print(f"- Metadata: {data['metadata']}")
        
        # Execute just the split_doppler_subapertures method
        print("\nTesting split_doppler_subapertures...")
        complex_data = data['complex_data']
        subapertures = estimator.split_doppler_subapertures(complex_data)
        print(f"- Number of subapertures: {len(subapertures)}")
        for i, subap in enumerate(subapertures):
            print(f"  Subaperture {i} shape: {subap.shape}")
        
        # Extract ship regions from the first subaperture
        print("\nTesting extract_ship_regions...")
        reference = subapertures[0]
        ship_regions = estimator.extract_ship_regions(np.abs(reference), threshold=0.3)
        
        # For each ship region, test co-registration
        for i, region in enumerate(ship_regions):
            print(f"\nTesting co-registration for ship {i}...")
            y_start, y_end, x_start, x_end = region
            
            # Skip if region is too small
            if y_end - y_start < 10 or x_end - x_start < 10:
                print(f"  Region too small, skipping")
                continue
            
            # Extract the region from both sub-apertures
            ref_region = reference[y_start:y_end, x_start:x_end]
            if len(subapertures) > 1:
                target = subapertures[1]
                tgt_region = target[y_start:y_end, x_start:x_end]
                
                # Test co-registration
                try:
                    print(f"  Computing displacement field...")
                    displacement_field = estimator.estimate_motion_field(ref_region, tgt_region)
                    print(f"  Displacement field computed successfully")
                    print(f"  - Range offsets shape: {displacement_field['range_offsets'].shape}")
                    print(f"  - Azimuth offsets shape: {displacement_field['azimuth_offsets'].shape}")
                    print(f"  - Range offsets min/max: {np.min(displacement_field['range_offsets']):.2f} / {np.max(displacement_field['range_offsets']):.2f}")
                    print(f"  - Azimuth offsets min/max: {np.min(displacement_field['azimuth_offsets']):.2f} / {np.max(displacement_field['azimuth_offsets']):.2f}")
                except Exception as e:
                    print(f"  Error in co-registration: {e}")
                    import traceback
                    print(traceback.format_exc())
    
    except Exception as e:
        print(f"Error in test: {e}")
        import traceback
        print(traceback.format_exc())
    
    finally:
        # Restore original method
        if 'original_extract_ship_regions' in locals() and 'estimator' in locals():
            estimator.extract_ship_regions = original_extract_ship_regions

if __name__ == "__main__":
    test_ship_detection() 