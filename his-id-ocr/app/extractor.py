"""
Text Extractor Module
=====================
Extracts patient information from ID card images using Donut model.
Parses name, DOB, gender, and Aadhaar number from extracted text.
"""

import re
import torch
from PIL import Image
from typing import Dict, Optional, Any
import logging
from datetime import datetime

from .donut_loader import get_donut_loader

# Configure logging
logger = logging.getLogger(__name__)


def extract_text_from_image(image: Image.Image) -> str:
    """
    Use Donut model to extract text from an ID card image.
    
    Args:
        image: PIL Image object of the ID card
        
    Returns:
        Extracted text content from the image
    """
    loader = get_donut_loader()
    
    # Prepare the image for the model
    # For DocVQA model, we ask a question about the document
    task_prompt = "<s_docvqa><s_question>What is all the text in this document?</s_question><s_answer>"
    
    # Process image
    pixel_values = loader.processor(image, return_tensors="pt").pixel_values
    pixel_values = pixel_values.to(loader.device)
    
    # Prepare decoder input
    decoder_input_ids = loader.processor.tokenizer(
        task_prompt, 
        add_special_tokens=False, 
        return_tensors="pt"
    ).input_ids
    decoder_input_ids = decoder_input_ids.to(loader.device)
    
    # Generate output
    with torch.no_grad():
        outputs = loader.model.generate(
            pixel_values,
            decoder_input_ids=decoder_input_ids,
            max_length=loader.model.decoder.config.max_position_embeddings,
            early_stopping=True,
            pad_token_id=loader.processor.tokenizer.pad_token_id,
            eos_token_id=loader.processor.tokenizer.eos_token_id,
            use_cache=True,
            num_beams=1,
            bad_words_ids=[[loader.processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )
    
    # Decode the output
    sequence = loader.processor.batch_decode(outputs.sequences)[0]
    sequence = sequence.replace(loader.processor.tokenizer.eos_token, "")
    sequence = sequence.replace(loader.processor.tokenizer.pad_token, "")
    
    # Extract just the answer part
    sequence = re.sub(r"<.*?>", "", sequence, count=1).strip()
    
    logger.info(f"Extracted text: {sequence[:200]}...")  # Log first 200 chars
    return sequence


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
    # Pattern for DOB label
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
                # Try different date formats
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
    
    # Check for male indicators
    if any(indicator in text_lower for indicator in ['male', 'पुरुष', ' m ', '/m', 'gender: m']):
        # Make sure it's not "female"
        if 'female' not in text_lower and 'महिला' not in text_lower:
            return 'Male'
    
    # Check for female indicators
    if any(indicator in text_lower for indicator in ['female', 'महिला', ' f ', '/f', 'gender: f']):
        return 'Female'
    
    # Explicit male check (after female check to avoid matching 'male' in 'female')
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
    logger.info("Starting patient details extraction...")
    
    # Extract raw text from image
    extracted_text = extract_text_from_image(image)
    
    # Parse individual fields
    aadhaar_raw = parse_aadhaar_number(extracted_text)
    name_parts = parse_name(extracted_text)
    dob = parse_date_of_birth(extracted_text)
    gender = parse_gender(extracted_text)
    
    # Build result with masked Aadhaar
    result = {
        "firstName": name_parts.get("firstName", ""),
        "lastName": name_parts.get("lastName", ""),
        "dateOfBirth": dob,
        "gender": gender,
        "maskedAadhaar": mask_aadhaar_number(aadhaar_raw) if aadhaar_raw else None,
        "rawAadhaar": aadhaar_raw,  # Internal use only, will be stripped before response
        "extractedText": extracted_text,  # For debugging
        "confidence": "high" if (name_parts.get("firstName") and aadhaar_raw) else "low"
    }
    
    logger.info(f"Extraction complete. Confidence: {result['confidence']}")
    return result
