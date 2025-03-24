#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ship Micro-Motion Estimation from SAR Images
Based on: "Micro-Motion Estimation of Maritime Targets Using Pixel Tracking in Cosmo-Skymed 
           Synthetic Aperture Radar Data—An Operative Assessment"
           https://www.mdpi.com/2072-4292/11/14/1637
"""

import os
import sys
import json
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal, fft
from scipy.ndimage import gaussian_filter
import cv2
import rasterio
import h5py
from skimage import feature, transform, filters, exposure
import io
import base64
import warnings

warnings.filterwarnings('ignore')

class MicroMotionEstimator:
    """
    Class to implement the ship micro-motion estimation algorithm from SAR images.
    Based on the paper: "Micro-Motion Estimation of Maritime Targets Using Pixel Tracking"
    """
    
    def __init__(self, config=None):
        """Initialize the micro-motion estimator with optional configuration."""
        self.config = config or {}
        # Default parameters as described in the paper
        self.params = {
            'gaussian_sigma': 2.0,
            'window_size': 64,
            'overlap_ratio': 0.5,
            'fft_size': 1024,
            'peak_threshold': 0.7
        }
        self.params.update(self.config.get('params', {}))
    
    def read_cphd_data(self, file_path):
        """
        Read CPHD format data.
        
        Args:
            file_path: Path to the CPHD file
            
        Returns:
            Dictionary containing the complex data and metadata
        """
        try:
            if file_path.lower().endswith('.h5') or file_path.lower().endswith('.hdf5'):
                # For H5/HDF5 files
                with h5py.File(file_path, 'r') as f:
                    # Example structure - adjust based on actual file format
                    data = {
                        'metadata': dict(f.attrs),
                        'complex_data': np.array(f['Data/Signal']),
                    }
                    if 'Antenna' in f:
                        data['antenna'] = np.array(f['Antenna'])
                    return data
            else:
                # For GeoTIFF or other image formats
                with rasterio.open(file_path) as src:
                    data = {
                        'metadata': src.meta,
                        'complex_data': src.read(1),  # Read first band
                        'transform': src.transform,
                        'crs': src.crs
                    }
                    return data
        except Exception as e:
            print(f"Error reading data file: {e}")
            return None

    def split_doppler_subapertures(self, complex_data, num_subapertures=2):
        """
        Split the SAR complex data into Doppler sub-apertures.
        As described in the paper section 2.1, this simulates ATI by
        splitting the Doppler spectrum.
        
        Args:
            complex_data: Complex SAR image data
            num_subapertures: Number of sub-apertures to create
            
        Returns:
            List of sub-aperture images
        """
        # Apply FFT along azimuth (columns) direction
        fft_data = fft.fft(complex_data, axis=1)
        
        # Determine sub-aperture boundaries
        n_cols = fft_data.shape[1]
        subaperture_width = n_cols // num_subapertures
        
        # Create sub-apertures
        subapertures = []
        for i in range(num_subapertures):
            # Create mask for this sub-aperture
            mask = np.zeros_like(fft_data, dtype=np.bool_)
            start_col = i * subaperture_width
            end_col = (i + 1) * subaperture_width
            mask[:, start_col:end_col] = True
            
            # Extract and inverse FFT for this sub-aperture
            subap_fft = fft_data.copy()
            subap_fft[~mask] = 0
            subap_image = fft.ifft(subap_fft, axis=1)
            subapertures.append(subap_image)
        
        return subapertures

    def coregister_subapertures(self, reference, target, window_size=64, step_size=32):
        """
        Perform sub-pixel coregistration between two sub-apertures.
        This implements the offset tracking described in the paper section 2.2.
        
        Args:
            reference: Reference sub-aperture image
            target: Target sub-aperture image to register with reference
            window_size: Size of correlation windows
            step_size: Step size between adjacent windows
            
        Returns:
            Tuple of (range_offsets, azimuth_offsets) arrays
        """
        # Ensure images are of the same size
        if reference.shape != target.shape:
            raise ValueError("Reference and target images must have the same dimensions")
        
        # Get image dimensions
        rows, cols = reference.shape
        
        # Calculate the number of windows in each dimension
        n_windows_y = (rows - window_size) // step_size + 1
        n_windows_x = (cols - window_size) // step_size + 1
        
        # Initialize offset arrays
        range_offsets = np.zeros((n_windows_y, n_windows_x))
        azimuth_offsets = np.zeros((n_windows_y, n_windows_x))
        
        # Iterate through windows
        for y in range(n_windows_y):
            for x in range(n_windows_x):
                # Extract windows
                y_start = y * step_size
                x_start = x * step_size
                ref_window = reference[y_start:y_start+window_size, x_start:x_start+window_size]
                tgt_window = target[y_start:y_start+window_size, x_start:x_start+window_size]
                
                # Compute cross-correlation
                correlation = signal.correlate2d(
                    np.abs(ref_window), 
                    np.abs(tgt_window), 
                    mode='same', 
                    boundary='symm'
                )
                
                # Find the peak of the correlation
                peak_idx = np.unravel_index(np.argmax(correlation), correlation.shape)
                
                # Calculate sub-pixel offsets using center of mass near the peak
                window_center = window_size // 2
                range_offset = peak_idx[0] - window_center
                azimuth_offset = peak_idx[1] - window_center
                
                # Store offsets
                range_offsets[y, x] = range_offset
                azimuth_offsets[y, x] = azimuth_offset
        
        return range_offsets, azimuth_offsets

    def estimate_motion_field(self, reference_image, target_image):
        """
        Estimate the motion field between two images using the sub-pixel offset tracking.
        
        Args:
            reference_image: Reference image
            target_image: Target image
            
        Returns:
            Dictionary containing displacement fields and estimated motion parameters
        """
        # Calculate magnitude images
        ref_mag = np.abs(reference_image)
        tgt_mag = np.abs(target_image)
        
        # Apply Gaussian smoothing to reduce noise
        ref_smoothed = gaussian_filter(ref_mag, sigma=self.params['gaussian_sigma'])
        tgt_smoothed = gaussian_filter(tgt_mag, sigma=self.params['gaussian_sigma'])
        
        # Compute offsets using coregistration
        range_offsets, azimuth_offsets = self.coregister_subapertures(
            ref_smoothed, 
            tgt_smoothed,
            window_size=self.params['window_size'],
            step_size=int(self.params['window_size'] * (1 - self.params['overlap_ratio']))
        )
        
        # Create displacement field
        displacement_field = {
            'range_offsets': range_offsets,
            'azimuth_offsets': azimuth_offsets,
            'magnitude': np.sqrt(range_offsets**2 + azimuth_offsets**2),
            'direction': np.arctan2(range_offsets, azimuth_offsets)
        }
        
        return displacement_field

    def extract_ship_regions(self, image, threshold=0.8):
        """
        Extract regions of interest (ROIs) containing ships from the SAR image.
        
        Args:
            image: SAR image magnitude
            threshold: Threshold for ship detection
            
        Returns:
            List of tuples (y_start, y_end, x_start, x_end) for each detected ship
        """
        # Normalize the image
        img_norm = image / np.max(image)
        
        # Apply threshold to detect bright targets (ships)
        binary = img_norm > threshold
        
        # Apply morphological operations to clean up the binary image
        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary.astype(np.uint8), cv2.MORPH_OPEN, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        # Find connected components (ships)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary)
        
        # Extract bounding boxes for ships (skip the first component which is background)
        ship_regions = []
        for i in range(1, num_labels):
            # Skip small components (noise)
            if stats[i, cv2.CC_STAT_AREA] < 100:
                continue
                
            # Get bounding box
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            
            # Add padding around the ship
            padding = 10
            y_start = max(0, y - padding)
            y_end = min(image.shape[0], y + h + padding)
            x_start = max(0, x - padding)
            x_end = min(image.shape[1], x + w + padding)
            
            ship_regions.append((y_start, y_end, x_start, x_end))
        
        return ship_regions

    def analyze_frequency_modes(self, displacement_field, sampling_freq=1.0):
        """
        Analyze the frequency modes in the displacement field to estimate micro-motion.
        This implements the frequency analysis described in the paper section 2.3.
        
        Args:
            displacement_field: Displacement field from estimate_motion_field
            sampling_freq: Sampling frequency in Hz
            
        Returns:
            Dictionary containing frequency analysis results
        """
        # Extract the magnitude of displacement
        magnitude = displacement_field['magnitude']
        
        # Apply 2D FFT to the magnitude field
        fft_result = fft.fft2(magnitude)
        fft_shifted = fft.fftshift(fft_result)
        
        # Compute the magnitude spectrum
        magnitude_spectrum = np.abs(fft_shifted)
        
        # Identify dominant frequencies
        # Find peaks in the frequency domain
        peaks = feature.peak_local_max(
            magnitude_spectrum, 
            threshold_rel=self.params['peak_threshold'], 
            min_distance=5
        )
        
        # Calculate actual frequencies
        ny, nx = magnitude.shape
        freq_y = fft.fftshift(fft.fftfreq(ny, d=1/sampling_freq))
        freq_x = fft.fftshift(fft.fftfreq(nx, d=1/sampling_freq))
        
        # Extract frequency values for each peak
        dominant_frequencies = []
        for peak in peaks:
            freq = (freq_y[peak[0]], freq_x[peak[1]])
            amplitude = magnitude_spectrum[peak[0], peak[1]]
            dominant_frequencies.append({
                'frequency': freq,
                'amplitude': float(amplitude),
                'peak_location': peak.tolist()
            })
        
        # Sort by amplitude in descending order
        dominant_frequencies.sort(key=lambda x: x['amplitude'], reverse=True)
        
        # Return the analysis results
        results = {
            'magnitude_spectrum': magnitude_spectrum,
            'dominant_frequencies': dominant_frequencies,
            'frequency_y': freq_y,
            'frequency_x': freq_x
        }
        
        return results

    def process_image(self, file_path):
        """
        Process a SAR image file to estimate ship micro-motion.
        
        Args:
            file_path: Path to the SAR image file
            
        Returns:
            Dictionary containing the processing results
        """
        # Read the data
        data = self.read_cphd_data(file_path)
        if data is None:
            return {'error': 'Failed to read input file'}
        
        # Get the complex data
        complex_data = data['complex_data']
        
        # Split into Doppler sub-apertures
        subapertures = self.split_doppler_subapertures(complex_data)
        
        # Use the first two sub-apertures
        reference = subapertures[0]
        target = subapertures[1]
        
        # Extract ship regions from the reference image
        ship_regions = self.extract_ship_regions(np.abs(reference))
        
        # Process each ship region
        ship_results = []
        for i, region in enumerate(ship_regions):
            y_start, y_end, x_start, x_end = region
            
            # Extract the region from both sub-apertures
            ref_region = reference[y_start:y_end, x_start:x_end]
            tgt_region = target[y_start:y_end, x_start:x_end]
            
            # Estimate the motion field for this ship
            displacement_field = self.estimate_motion_field(ref_region, tgt_region)
            
            # Analyze frequency modes
            frequency_analysis = self.analyze_frequency_modes(displacement_field)
            
            # Prepare the result for this ship
            ship_result = {
                'ship_id': i,
                'region': [y_start, y_end, x_start, x_end],
                'displacement_field': {
                    'range_offsets': displacement_field['range_offsets'].tolist(),
                    'azimuth_offsets': displacement_field['azimuth_offsets'].tolist(),
                    'magnitude': displacement_field['magnitude'].tolist()
                },
                'dominant_frequencies': frequency_analysis['dominant_frequencies'][:5]  # Top 5 frequencies
            }
            
            # Ensure each dominant frequency has the expected format for the frontend
            for freq in ship_result['dominant_frequencies']:
                # Ensure frequency is a tuple/list of exactly 2 numbers
                if not isinstance(freq['frequency'], (list, tuple)) or len(freq['frequency']) != 2:
                    freq['frequency'] = [float(freq['frequency'][0]), float(freq['frequency'][1])]
                
                # Ensure peak_location is a tuple/list of exactly 2 numbers
                if not isinstance(freq['peak_location'], (list, tuple)) or len(freq['peak_location']) != 2:
                    freq['peak_location'] = [float(freq['peak_location'][0]), float(freq['peak_location'][1])]
                
                # Ensure amplitude is a float
                freq['amplitude'] = float(freq['amplitude'])
            
            ship_results.append(ship_result)
        
        # Return the results
        results = {
            'metadata': {
                'file_path': file_path,
                'image_shape': complex_data.shape,
                'num_ships_detected': len(ship_regions)
            },
            'ships': ship_results
        }
        
        return results

    def save_results(self, results, output_file):
        """
        Save the processing results to a JSON file.
        
        Args:
            results: Processing results dictionary
            output_file: Path to the output file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving results: {e}")
            return False

    def visualize_results(self, results, output_dir):
        """
        Visualize the processing results and save figures.
        
        Args:
            results: Processing results dictionary
            output_dir: Directory to save the output figures
            
        Returns:
            Dictionary containing figure paths and base64 encoded images for frontend use
        """
        os.makedirs(output_dir, exist_ok=True)
        figure_paths = []
        figure_data = {}
        
        # Process each ship
        for ship in results['ships']:
            ship_id = ship['ship_id']
            
            # 1. Plot displacement field
            fig, ax = plt.subplots(figsize=(10, 8))
            displacement = np.array(ship['displacement_field']['magnitude'])
            im = ax.imshow(displacement, cmap='jet')
            plt.colorbar(im, ax=ax, label='Displacement Magnitude')
            ax.set_title(f'Ship {ship_id} - Displacement Field')
            
            # Save figure to disk
            fig_path = os.path.join(output_dir, f'ship_{ship_id}_displacement.png')
            plt.savefig(fig_path)
            
            # Also encode as base64 for frontend
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            img_str = base64.b64encode(buf.read()).decode('utf-8')
            figure_data[f'ship_{ship_id}_displacement'] = f'data:image/png;base64,{img_str}'
            
            plt.close(fig)
            figure_paths.append(fig_path)
            
            # 2. Plot dominant frequencies
            if ship['dominant_frequencies']:
                fig, ax = plt.subplots(figsize=(10, 6))
                freqs = [f['frequency'][0]**2 + f['frequency'][1]**2 for f in ship['dominant_frequencies']]
                amps = [f['amplitude'] for f in ship['dominant_frequencies']]
                
                ax.bar(range(len(freqs)), amps)
                ax.set_xlabel('Frequency Mode')
                ax.set_ylabel('Amplitude')
                ax.set_title(f'Ship {ship_id} - Dominant Frequency Modes')
                
                # Save figure to disk
                fig_path = os.path.join(output_dir, f'ship_{ship_id}_frequencies.png')
                plt.savefig(fig_path)
                
                # Also encode as base64 for frontend
                buf = io.BytesIO()
                plt.savefig(buf, format='png')
                buf.seek(0)
                img_str = base64.b64encode(buf.read()).decode('utf-8')
                figure_data[f'ship_{ship_id}_frequencies'] = f'data:image/png;base64,{img_str}'
                
                plt.close(fig)
                figure_paths.append(fig_path)
        
        # Return both file paths and base64 data for frontend use
        return {
            'paths': figure_paths,
            'base64_images': figure_data
        }


def main():
    """Main function to run the estimation from command line."""
    if len(sys.argv) < 2:
        print("Usage: python micro_motion_estimator.py <input_file> [output_file]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'ship_micro_motion_results.json'
    
    estimator = MicroMotionEstimator()
    results = estimator.process_image(input_file)
    
    if 'error' in results:
        print(f"Error: {results['error']}")
        sys.exit(1)
    
    # Generate visualizations
    output_dir = os.path.splitext(output_file)[0] + '_figures'
    figure_data = estimator.visualize_results(results, output_dir)
    print(f"Generated {len(figure_data['paths'])} visualization figures in {output_dir}")
    
    # Add visualization data to the results for frontend use
    results['visualizations'] = figure_data['base64_images']
    
    # Save the complete results
    estimator.save_results(results, output_file)
    print(f"Results saved to {output_file}")


if __name__ == "__main__":
    main() 