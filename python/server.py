from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys
import json
from typing import Dict, Any
import tempfile
import base64

# Add the directory containing micro_motion_estimator.py to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from micro_motion_estimator import MicroMotionEstimator

app = FastAPI()

# Allow CORS from any origin during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process")
async def process_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    print(f"Received file: {file.filename}")
    # Create a temporary directory
    temp_dir = tempfile.mkdtemp()
    
    # Save uploaded file to temp file
    temp_path = os.path.join(temp_dir, file.filename)
    with open(temp_path, "wb") as temp:
        content = await file.read()
        temp.write(content)
    
    # Create results directory if it doesn't exist
    results_dir = os.path.join(temp_dir, "results")
    os.makedirs(results_dir, exist_ok=True)
    result_path = os.path.join(results_dir, f"{os.path.basename(temp_path)}_result.json")
    
    print(f"Processing file: {temp_path}")
    print(f"Results will be saved to: {result_path}")
    
    disp_path = None
    freq_path = None
    
    try:
        # Process with your existing code
        estimator = MicroMotionEstimator(config={
            "input_file": temp_path,
            "output_file": result_path
        })
        results = estimator.process_image(temp_path)
        
        # Save results to JSON file for debugging
        with open(result_path, "w") as f:
            json.dump(results, f)
        
        # Generate figures and convert to base64
        figures = {}
        
        # Create visualization directory
        vis_dir = os.path.join(results_dir, "visualizations")
        os.makedirs(vis_dir, exist_ok=True)
        
        # Generate visualizations
        print(f"Generating visualizations in: {vis_dir}")
        estimator.visualize_results(results, vis_dir)
        
        # Convert visualization files to base64
        for img_name in os.listdir(vis_dir):
            if img_name.endswith(".png"):
                img_path = os.path.join(vis_dir, img_name)
                key = os.path.splitext(img_name)[0]
                with open(img_path, "rb") as img:
                    figures[key] = f"data:image/png;base64,{base64.b64encode(img.read()).decode()}"
        
        print("Processing complete, returning results")
        return {
            "success": True,
            "results": results,
            "figures": figures,
            "message": "Processing complete"
        }
    except Exception as e:
        import traceback
        print(f"Error processing file: {e}")
        print(traceback.format_exc())
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
    finally:
        # Clean up temp files
        print("Cleaning up temporary files")
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Error cleaning up: {e}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    print("Starting server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000) 