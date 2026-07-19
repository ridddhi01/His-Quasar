"""
Image Masker Module
===================
Uses Tesseract OCR to locate Aadhaar number regions and masks them using Pillow.
Ensures raw Aadhaar numbers are never stored or transmitted.
No OpenCV dependency — uses only Pillow for all image operations.
"""

import pytesseract
from PIL import Image, ImageFilter, ImageDraw
import re
import os
from typing import Tuple, List, Optional
import logging
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Tesseract configuration for digit detection
TESSERACT_CONFIG = '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789'


def find_aadhaar_regions(pil_image: Image.Image) -> List[Tuple[int, int, int, int]]:
    """
    Find regions in the image containing Aadhaar number digits.
    Uses Tesseract OCR bounding box data to locate 4-digit groups.

    Args:
        pil_image: PIL Image object (RGB)

    Returns:
        List of bounding boxes (x, y, w, h) for Aadhaar digit regions
    """
    regions = []

    # Convert to grayscale for better OCR accuracy
    gray = pil_image.convert('L')

    try:
        data = pytesseract.image_to_data(
            gray,
            output_type=pytesseract.Output.DICT,
            config=TESSERACT_CONFIG
        )
    except Exception as e:
        logger.warning(f"Tesseract OCR failed: {str(e)}")
        return regions

    n_boxes = len(data['text'])
    digit_groups = []

    for i in range(n_boxes):
        text = data['text'][i].strip()
        if len(text) >= 4 and text.isdigit():
            digit_groups.append({
                'text': text,
                'x': data['left'][i],
                'y': data['top'][i],
                'w': data['width'][i],
                'h': data['height'][i],
            })

    # Sort by row then column
    digit_groups.sort(key=lambda d: (d['y'] // 20, d['x']))

    for group in digit_groups:
        text = group['text']
        if len(text) == 4 or len(text) == 12:
            regions.append((group['x'], group['y'], group['w'], group['h']))

    # Log whether Aadhaar pattern was found in full text
    try:
        full_text = pytesseract.image_to_string(gray)
        if re.search(r'\d{4}\s*\d{4}\s*\d{4}', full_text) or re.search(r'\d{12}', full_text):
            logger.info("Aadhaar pattern detected in full text")
    except Exception:
        pass

    logger.info(f"Found {len(regions)} potential Aadhaar digit regions")
    return regions


def mask_regions(
    pil_image: Image.Image,
    regions: List[Tuple[int, int, int, int]],
    method: str = 'blur'
) -> Image.Image:
    """
    Apply masking to specified regions using Pillow.

    Args:
        pil_image: PIL Image (RGB)
        regions: List of (x, y, w, h) bounding boxes to mask
        method: 'blur' for Gaussian blur, 'black' for solid black rectangle

    Returns:
        PIL Image with regions masked
    """
    masked = pil_image.copy()
    width, height = masked.size

    for (x, y, w, h) in regions:
        padding = 5
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(width, x + w + padding)
        y2 = min(height, y + h + padding)

        if x2 <= x1 or y2 <= y1:
            continue

        if method == 'blur':
            # Crop the region, apply strong blur, paste back
            roi = masked.crop((x1, y1, x2, y2))
            blurred = roi.filter(ImageFilter.GaussianBlur(radius=15))
            masked.paste(blurred, (x1, y1))
        else:
            # Draw a solid black rectangle over the region
            draw = ImageDraw.Draw(masked)
            draw.rectangle([x1, y1, x2, y2], fill=(0, 0, 0))

    return masked


def process_pil_image(
    pil_image: Image.Image,
    output_dir: str,
    filename: str,
    method: str = 'blur'
) -> Optional[str]:
    """
    Process a PIL Image directly — find Aadhaar regions, mask them, save result.

    Args:
        pil_image: PIL Image object
        output_dir: Directory to save the masked image
        filename: Base filename for the output
        method: Masking method ('blur' or 'black')

    Returns:
        Path to the masked image, or None if processing failed
    """
    logger.info("Processing PIL image for Aadhaar masking (Pillow-only)")

    try:
        # Ensure RGB
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')

        # Find and mask regions
        regions = find_aadhaar_regions(pil_image)
        masked_image = mask_regions(pil_image, regions, method)

        # Create output path
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        name, ext = os.path.splitext(filename)
        if not ext:
            ext = '.jpg'
        masked_filename = f"{name}_masked{ext}"
        output_path = os.path.join(output_dir, masked_filename)

        # Save using Pillow
        masked_image.save(output_path)
        logger.info(f"Masked image saved to: {output_path}")

        return output_path

    except Exception as e:
        logger.error(f"Error processing PIL image: {str(e)}")
        return None
