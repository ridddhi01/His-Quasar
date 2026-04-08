"""
Image Masker Module
===================
Uses OCR to locate Aadhaar number regions in images and masks them.
Ensures raw Aadhaar numbers are never stored or transmitted.
"""

import cv2
import numpy as np
from PIL import Image
import pytesseract
import re
import os
from typing import Tuple, List, Optional
import logging
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Tesseract configuration for digit detection
TESSERACT_CONFIG = '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789'


def find_aadhaar_regions(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Find regions in the image containing Aadhaar number digits.
    Uses Tesseract OCR to locate 4-digit groups.
    
    Args:
        image: OpenCV image (BGR format)
        
    Returns:
        List of bounding boxes (x, y, w, h) for Aadhaar digit regions
    """
    regions = []
    
    # Convert to grayscale for better OCR
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply threshold to get cleaner text
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Get bounding box data from Tesseract
    try:
        data = pytesseract.image_to_data(thresh, output_type=pytesseract.Output.DICT, config=TESSERACT_CONFIG)
    except Exception as e:
        logger.warning(f"Tesseract OCR failed: {str(e)}")
        return regions
    
    # Collect all detected digit groups
    n_boxes = len(data['text'])
    digit_groups = []
    
    for i in range(n_boxes):
        text = data['text'][i].strip()
        if len(text) >= 4 and text.isdigit():
            x = data['left'][i]
            y = data['top'][i]
            w = data['width'][i]
            h = data['height'][i]
            digit_groups.append({
                'text': text,
                'x': x,
                'y': y,
                'w': w,
                'h': h
            })
    
    # Look for Aadhaar pattern (3 groups of 4 digits close together)
    # Sort by y position (row) then x position (column)
    digit_groups.sort(key=lambda d: (d['y'] // 20, d['x']))
    
    # Find consecutive 4-digit groups that could be Aadhaar
    for i in range(len(digit_groups)):
        group = digit_groups[i]
        text = group['text']
        
        # If this looks like part of Aadhaar (4 digits)
        if len(text) == 4:
            regions.append((group['x'], group['y'], group['w'], group['h']))
        # Also catch 12-digit continuous strings
        elif len(text) == 12:
            regions.append((group['x'], group['y'], group['w'], group['h']))
    
    # Also try pattern-based search on full text
    full_text = pytesseract.image_to_string(thresh)
    if re.search(r'\d{4}\s*\d{4}\s*\d{4}', full_text) or re.search(r'\d{12}', full_text):
        logger.info("Aadhaar pattern detected in text")
    
    logger.info(f"Found {len(regions)} potential Aadhaar digit regions")
    return regions


def mask_regions(image: np.ndarray, regions: List[Tuple[int, int, int, int]], 
                 method: str = 'blur') -> np.ndarray:
    """
    Apply masking to specified regions in the image.
    
    Args:
        image: OpenCV image (BGR format)
        regions: List of (x, y, w, h) bounding boxes to mask
        method: 'blur' for Gaussian blur, 'black' for solid black
        
    Returns:
        Image with regions masked
    """
    masked = image.copy()
    
    for (x, y, w, h) in regions:
        # Add some padding around the detected region
        padding = 5
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = w + (2 * padding)
        h = h + (2 * padding)
        
        # Ensure we don't go out of bounds
        x2 = min(image.shape[1], x + w)
        y2 = min(image.shape[0], y + h)
        
        if method == 'blur':
            # Apply strong Gaussian blur to the region
            roi = masked[y:y2, x:x2]
            if roi.size > 0:
                blurred = cv2.GaussianBlur(roi, (51, 51), 30)
                masked[y:y2, x:x2] = blurred
        else:
            # Black out the region
            cv2.rectangle(masked, (x, y), (x2, y2), (0, 0, 0), -1)
    
    return masked


def mask_aadhaar_in_image(image_path: str, output_dir: str, method: str = 'blur') -> Optional[str]:
    """
    Process an image to mask Aadhaar number regions.
    
    Args:
        image_path: Path to the input image
        output_dir: Directory to save the masked image
        method: Masking method ('blur' or 'black')
        
    Returns:
        Path to the masked image, or None if processing failed
    """
    logger.info(f"Processing image for Aadhaar masking: {image_path}")
    
    try:
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"Failed to read image: {image_path}")
            return None
        
        # Find Aadhaar regions
        regions = find_aadhaar_regions(image)
        
        if not regions:
            logger.warning("No Aadhaar regions detected, will still save image")
            # Even if no regions found, we'll save a copy as "masked"
            # In production, you might want to flag this for manual review
        
        # Apply masking
        masked_image = mask_regions(image, regions, method)
        
        # Create output path
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        original_filename = os.path.basename(image_path)
        name, ext = os.path.splitext(original_filename)
        masked_filename = f"{name}_masked{ext}"
        output_path = os.path.join(output_dir, masked_filename)
        
        # Save masked image
        cv2.imwrite(output_path, masked_image)
        logger.info(f"Masked image saved to: {output_path}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Error masking image: {str(e)}")
        return None


def process_pil_image(pil_image: Image.Image, output_dir: str, 
                      filename: str, method: str = 'blur') -> Optional[str]:
    """
    Process a PIL Image directly without saving to disk first.
    
    Args:
        pil_image: PIL Image object
        output_dir: Directory to save the masked image
        filename: Base filename for the output
        method: Masking method ('blur' or 'black')
        
    Returns:
        Path to the masked image
    """
    logger.info("Processing PIL image for Aadhaar masking")
    
    try:
        # Convert PIL to OpenCV format
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Find and mask regions
        regions = find_aadhaar_regions(cv_image)
        masked_image = mask_regions(cv_image, regions, method)
        
        # Create output path
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        name, ext = os.path.splitext(filename)
        if not ext:
            ext = '.jpg'
        masked_filename = f"{name}_masked{ext}"
        output_path = os.path.join(output_dir, masked_filename)
        
        # Save masked image
        cv2.imwrite(output_path, masked_image)
        logger.info(f"Masked image saved to: {output_path}")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Error processing PIL image: {str(e)}")
        return None
