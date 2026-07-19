"""
Text Extractor Module
=====================
Extracts patient information from ID card images using Tesseract OCR.
Parses name, DOB, gender, and Aadhaar number from extracted text.
Lightweight replacement for Donut model — runs within 512MB RAM.
"""

import re
import pytesseract
from PIL import Image
from typing import Dict, Optional, Any
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)


def extract_text_from_image(image: Image.Image) -> str:
    """
    Use Tesseract OCR to extract text from an ID card image.

    Args:
        image: PIL Image object of the ID card

    Returns:
        Extracted text content from the image
    """
    # Tesseract config: treat as a single uniform block of text
    # PSM 6 = assume a single uniform block of text
    # OEM 3 = use both legacy + LSTM
    custom_config = r'--oem 3 --psm 6'

    try:
        text = pytesseract.image_to_string(image, config=custom_config, lang='eng')
        logger.info(f"Tesseract extracted text: {text[:200]}...")
        return text.strip()
    except Exception as e:
        logger.error(f"Tesseract extraction failed: {str(e)}")
        return ""


def parse_aadhaar_number(text: str) -> Optional[str]:
    """
    Extract Aadhaar number from text.
    Aadhaar is a 12-digit number, often formatted as XXXX XXXX XXXX.

    Args:
        text: Text content to search for Aadhaar

    Returns:
        Aadhaar number if found, None otherwise
    """
    # Remove extra spaces and normalize
    normalized = re.sub(r'\s+', ' ', text)

    # Pattern 1: Aadhaar with spaces (XXXX XXXX XXXX)
    pattern_spaced = r'\b(\d{4}\s+\d{4}\s+\d{4})\b'
    match = re.search(pattern_spaced, normalized)
    if match:
        return re.sub(r'\s+', '', match.group(1))  # Return without spaces

    # Pattern 2: Continuous 12 digits
    pattern_continuous = r'\b(\d{12})\b'
    match = re.search(pattern_continuous, normalized)
    if match:
        return match.group(1)

    return None


def mask_aadhaar_number(aadhaar: str) -> str:
    """
    Mask Aadhaar number for privacy.
    Format: XXXX XXXX 1234 (last 4 digits visible)

    Args:
        aadhaar: 12-digit Aadhaar number (no spaces)

    Returns:
        Masked Aadhaar in format XXXX XXXX 1234
    """
    if not aadhaar or len(aadhaar) != 12:
        return "XXXX XXXX XXXX"

    return f"XXXX XXXX {aadhaar[-4:]}"


def parse_name(text: str) -> Dict[str, str]:
    """
    Extract name from ID card text.
    Looks for patterns like "Name:", "नाम:", etc.

    Args:
        text: Extracted text content

    Returns:
        Dictionary with firstName and lastName
    """
    result = {"firstName": "", "lastName": ""}

    # Common patterns for name on Indian ID cards
    patterns = [
        r'(?:Name|नाम)\s*[:\-]?\s*([A-Za-z\s]+)',
        r'(?:To|Son of|S/O|D/O|W/O)\s*[:\-]?\s*([A-Za-z\s]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name_parts = match.group(1).strip().split()
            if len(name_parts) >= 2:
                result["firstName"] = name_parts[0]
                result["lastName"] = " ".join(name_parts[1:])
            elif len(name_parts) == 1:
                result["firstName"] = name_parts[0]
            break

    return result


def parse_date_of_birth(text: str) -> Optional[str]:
    """
    Extract date of birth from ID card text.

    Args:
        text: Extracted text content

    Returns:
        DOB in YYYY-MM-DD format if found
    """
    dob_patterns = [
        r'(?:DOB|Date of Birth|जन्म तिथि|Year of Birth|YOB)\s*[:\-]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
        r'(?:DOB|Date of Birth|जन्म तिथि)\s*[:\-]?\s*(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})',
        r'\b(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})\b',  # DD/MM/YYYY pattern
    ]

    for pattern in dob_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            try:
                for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y/%m/%d', '%Y-%m-%d']:
                    try:
                        parsed = datetime.strptime(date_str, fmt)
                        return parsed.strftime('%Y-%m-%d')
                    except ValueError:
                        continue
            except Exception:
                pass

    return None


def parse_gender(text: str) -> Optional[str]:
    """
    Extract gender from ID card text.

    Args:
        text: Extracted text content

    Returns:
        Gender as 'Male', 'Female', or 'Other'
    """
    text_lower = text.lower()

    if any(indicator in text_lower for indicator in ['male', 'पुरुष', ' m ', '/m', 'gender: m']):
        if 'female' not in text_lower and 'महिला' not in text_lower:
            return 'Male'

    if any(indicator in text_lower for indicator in ['female', 'महिला', ' f ', '/f', 'gender: f']):
        return 'Female'

    if re.search(r'\bmale\b', text_lower):
        return 'Male'

    return None


def extract_patient_details(image: Image.Image) -> Dict[str, Any]:
    """
    Main function to extract all patient details from ID card.

    Args:
        image: PIL Image of the ID card

    Returns:
        Dictionary containing extracted patient information
    """
    logger.info("Starting patient details extraction using Tesseract OCR...")

    # Extract raw text from image
    extracted_text = extract_text_from_image(image)

    # Parse individual fields
    aadhaar_raw = parse_aadhaar_number(extracted_text)
    name_parts = parse_name(extracted_text)
    dob = parse_date_of_birth(extracted_text)
    gender = parse_gender(extracted_text)

    result = {
        "firstName": name_parts.get("firstName", ""),
        "lastName": name_parts.get("lastName", ""),
        "dateOfBirth": dob,
        "gender": gender,
        "maskedAadhaar": mask_aadhaar_number(aadhaar_raw) if aadhaar_raw else None,
        "rawAadhaar": aadhaar_raw,  # Internal use only, stripped before response
        "extractedText": extracted_text,  # For debugging
        "confidence": "high" if (name_parts.get("firstName") and aadhaar_raw) else "low"
    }

    logger.info(f"Extraction complete. Confidence: {result['confidence']}")
    return result
