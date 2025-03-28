# Ship Micro-Motion Analysis System

A system for analyzing synthetic aperture radar (SAR) data to detect micro-motion in ships.

## Architecture

This application uses a Next.js frontend and a Python backend:

1. **Frontend**: Next.js application with React components for file upload and visualization
2. **Backend**: Python FastAPI server for processing SAR data

## Setup Instructions

### 1. Set up Python environment

```bash
# Navigate to the python directory
cd python

# Create and activate virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Run Python server

```bash
# From the python directory
python server.py
```

This will start the Python server on http://localhost:8000.

### 3. Set up ngrok for exposing Python server

1. [Download and install ngrok](https://ngrok.com/download)
2. Sign up for a free ngrok account and get your authtoken
3. Run ngrok to expose your Python server:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
ngrok http 8000
```

Ngrok will generate a public URL (e.g., `https://a1b2c3d4.ngrok.io`) that forwards to your local Python server.

### 4. Update Next.js app configuration

Create or update `.env.local` file in the project root:

```
PYTHON_API_URL=https://your-ngrok-url.ngrok.io
```

Replace `https://your-ngrok-url.ngrok.io` with the URL generated by ngrok.

### 5. Run Next.js app

```bash
# From the project root
npm run dev
```

The application will be available at http://localhost:3000.

## Usage

1. Open the application in your browser
2. Upload a SAR data file or select a sample dataset
3. View the processing results, including:
   - Displacement field visualization
   - Frequency mode analysis
   - Detailed metrics

## Development

### Project Structure

```
ship-micro-motion/
├── app/               # Next.js application code
│   ├── api/           # API routes
│   ├── components/    # React components
│   └── lib/           # Utility functions
├── python/            # Python processing code
│   ├── server.py      # FastAPI server
│   └── micro_motion_estimator.py # Processing algorithm
├── public/            # Static assets
└── docs/              # Documentation
```

### API Endpoints

- `POST /api/process`: Upload and process a SAR data file
- `GET /api/results/:id`: Get processing results for a given ID

## Deployment

For production deployment:

1. Host the Python server on a suitable platform (PythonAnywhere, Heroku, etc.)
2. Update the `PYTHON_API_URL` environment variable to point to your hosted Python server
3. Deploy the Next.js application to Vercel

## License

[MIT License](LICENSE)

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