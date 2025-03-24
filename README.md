# Ship Micro-Motion Estimation from SAR Images

This web application implements the algorithm described in the paper ["Micro-Motion Estimation of Maritime Targets Using Pixel Tracking in Cosmo-Skymed Synthetic Aperture Radar Data—An Operative Assessment"](https://www.mdpi.com/2072-4292/11/14/1637) published in MDPI Remote Sensing.

The application allows users to upload SAR images (especially CPHD data) and processes them to estimate the micro-motion of ships captured in the images. The algorithm works by splitting a single SAR image into temporal sub-apertures and using sub-pixel tracking to estimate the micro-motion of ships.

## Features

- Upload and process SAR images (TIFF, HDF5, CPHD formats supported)
- Automated ship detection in SAR imagery
- Analysis of micro-motion parameters for each detected ship
- Visualization of displacement fields and frequency modes
- Responsive web interface with real-time feedback

## Prerequisites

- Node.js 18.x or later
- Python 3.7 or later
- Package managers: npm (for Node.js) and pip (for Python)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ship-micro-motion.git
cd ship-micro-motion
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Set up Python environment

**For Windows:**

```bash
.\setup_python_env.bat
```

**For macOS/Linux:**

```bash
chmod +x setup_python_env.sh
./setup_python_env.sh
```

This will create a Python virtual environment and install the required packages listed in `python/requirements.txt`.

## Running the Application

1. Activate the Python virtual environment (if not already activated):

   **For Windows:**
   ```bash
   .\python_env\Scripts\activate
   ```

   **For macOS/Linux:**
   ```bash
   source python_env/bin/activate
   ```

2. Start the Next.js development server:

   ```bash
   npm run dev
   ```

3. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Upload a SAR image file (TIFF, HDF5, CPHD formats) using the upload area
2. Wait for the processing to complete (this may take a few minutes for large files)
3. View the results, including:
   - Number of ships detected
   - Micro-motion analysis for each ship
   - Displacement field visualizations
   - Frequency mode diagrams

## Deployment on Vercel

This application is configured for easy deployment on Vercel:

1. Fork or clone this repository to your GitHub account
2. Connect your GitHub repository to Vercel
3. Configure the build settings (the default settings should work)
4. Deploy!

Note: For the Python processing to work in production, you'll need to set up environment variables in Vercel for the Python path and any other required system configurations.

## Algorithm Overview

The algorithm follows these key steps:

1. **Loading and Pre-processing**: Load the SAR image data and prepare it for processing
2. **Doppler Sub-aperture Creation**: Split the SAR image into multiple Doppler sub-apertures
3. **Ship Detection**: Identify regions containing ships in the image
4. **Sub-pixel Co-registration**: Perform precise pixel tracking between sub-apertures
5. **Motion Field Estimation**: Calculate displacement fields for each detected ship
6. **Frequency Mode Analysis**: Analyze the vibrational modes of each ship
7. **Visualization**: Generate visualizations of the results

## Data Sources

To test this application, you can obtain SAR CPHD data from:
- [Umbra Open Data Catalog](http://umbra-open-data-catalog.s3-website.us-west-2.amazonaws.com/?prefix=sar-data/tasks/ship_detection_testdata/0c4a34d4-671d-412f-a8c5-fcb7543fd220/2023-08-31-01-09-38_UMBRA-04/)

## References

- Biondi, F.; Addabbo, P.; Orlando, D.; Clemente, C. Micro-Motion Estimation of Maritime Targets Using Pixel Tracking in Cosmo-Skymed Synthetic Aperture Radar Data—An Operative Assessment. Remote Sens. 2019, 11, 1637.
- [Paper Link](https://www.mdpi.com/2072-4292/11/14/1637)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- The algorithm is based on research by Filippo Biondi, Pia Addabbo, Danilo Orlando, and Carmine Clemente
- Next.js framework for the web application
- TensorFlow.js for client-side processing capabilities
- Various Python libraries including NumPy, SciPy, Matplotlib, and OpenCV
#   s y n m a x - b p e r k i n s  
 