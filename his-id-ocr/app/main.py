"""
AI ID OCR Microservice - Main Entry Point
==========================================
FastAPI application for extracting patient details from Government ID cards.
Handles image upload, AI extraction, Aadhaar masking, and returns safe JSON.

Endpoint: POST /extract-id
- Receives: Image file (multipart/form-data)
- Returns: JSON with masked patient details and masked image path
"""

import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image
import logging

# Local imports
from .donut_loader import get_donut_loader
from .extractor import extract_patient_details
from .image_masker import process_pil_image

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="HIS ID OCR Service",
    description="AI-powered Government ID scanning and Aadhaar masking service",
    version="1.0.0"
)

# CORS configuration - allow requests from HIS frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",")] if os.getenv("CORS_ORIGINS") else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory configuration
BASE_DIR = Path(__file__).parent
UPLOAD_DIR_RAW = BASE_DIR / "uploads" / "raw"
UPLOAD_DIR_MASKED = BASE_DIR / "uploads" / "masked"

# Ensure directories exist
UPLOAD_DIR_RAW.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR_MASKED.mkdir(parents=True, exist_ok=True)

# Mount static files for serving masked images
app.mount("/masked-images", StaticFiles(directory=str(UPLOAD_DIR_MASKED)), name="masked-images")


# Response model
class ExtractionResponse(BaseModel):
    """Response schema for ID extraction"""
    success: bool
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    maskedAadhaar: Optional[str] = None
    maskedImagePath: Optional[str] = None
    maskedImageUrl: Optional[str] = None
    confidence: str = "low"
    message: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    """
    Initialize the Donut model on startup.
    This ensures model is ready when first request arrives.
    """
    logger.info("=" * 60)
    logger.info("     HIS ID OCR SERVICE - Starting Up")
    logger.info("=" * 60)
    
    try:
        # Pre-load the model (optional - can also lazy load on first request)
        # Comment this out if you prefer lazy loading
        logger.info("Pre-loading Donut model...")
        loader = get_donut_loader()
        loader.initialize()
        logger.info("Donut model loaded successfully!")
    except Exception as e:
        logger.warning(f"Model pre-loading skipped: {str(e)}")
        logger.info("Model will load on first request")
    
    logger.info("=" * 60)
    logger.info(f"  Raw uploads:    {UPLOAD_DIR_RAW}")
    logger.info(f"  Masked uploads: {UPLOAD_DIR_MASKED}")
    logger.info("=" * 60)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "HIS ID OCR Service",
        "status": "running",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": get_donut_loader()._initialized,
        "raw_upload_dir": str(UPLOAD_DIR_RAW),
        "masked_upload_dir": str(UPLOAD_DIR_MASKED)
    }


@app.post("/extract-id", response_model=ExtractionResponse)
async def extract_id(file: UploadFile = File(...)):
    """
    Extract patient details from a Government ID card image.
    
    This endpoint:
    1. Receives an image file
    2. Saves raw image temporarily
    3. Runs AI extraction (Donut model)
    4. Masks Aadhaar number in the image
    5. Returns extracted data with masked Aadhaar
    
    **Privacy Note**: Raw Aadhaar number is NEVER returned or stored.
    Only masked format (XXXX XXXX 1234) is returned.
    """
    logger.info(f"Received file: {file.filename}, Content-Type: {file.content_type}")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {allowed_types}"
        )
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix or '.jpg'
    unique_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    safe_filename = f"id_{timestamp}_{unique_id}{file_ext}"
    
    raw_path = UPLOAD_DIR_RAW / safe_filename
    
    try:
        # Save uploaded file to raw directory
        logger.info(f"Saving raw image to: {raw_path}")
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Open image with PIL
        pil_image = Image.open(raw_path)
        
        # Convert to RGB if necessary (for models expecting RGB)
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Extract patient details using Donut model
        logger.info("Extracting patient details with AI...")
        extraction_result = extract_patient_details(pil_image)
        
        # Mask Aadhaar in the image
        logger.info("Masking Aadhaar in image...")
        masked_path = process_pil_image(
            pil_image,
            str(UPLOAD_DIR_MASKED),
            safe_filename,
            method='blur'
        )
        
        # Build response (exclude raw Aadhaar!)
        masked_image_url = None
        if masked_path:
            masked_filename = os.path.basename(masked_path)
            masked_image_url = f"/masked-images/{masked_filename}"
        
        response = ExtractionResponse(
            success=True,
            firstName=extraction_result.get("firstName"),
            lastName=extraction_result.get("lastName"),
            dateOfBirth=extraction_result.get("dateOfBirth"),
            gender=extraction_result.get("gender"),
            maskedAadhaar=extraction_result.get("maskedAadhaar"),
            maskedImagePath=masked_path,
            maskedImageUrl=masked_image_url,
            confidence=extraction_result.get("confidence", "low"),
            message="Extraction successful"
        )
        
        logger.info(f"Extraction complete. Confidence: {response.confidence}")
        
        # Optionally delete raw image after processing for extra privacy
        # Uncomment the following lines in production:
        # if raw_path.exists():
        #     raw_path.unlink()
        #     logger.info("Raw image deleted for privacy")
        
        return response
        
    except Exception as e:
        logger.error(f"Extraction failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(e)}"
        )


@app.delete("/cleanup")
async def cleanup_uploads():
    """
    Cleanup raw uploads directory.
    Call this periodically or after processing batch.
    """
    try:
        count = 0
        for file in UPLOAD_DIR_RAW.iterdir():
            if file.is_file():
                file.unlink()
                count += 1
        
        return {"message": f"Cleaned up {count} raw files"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Entry point for running with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
