"""
Shared Utilities for Hospital HIS ML Services
Contains helper functions for date/time, JSON serialization, logging, etc.
"""

import json
import logging
from datetime import datetime, date
from bson import ObjectId
from typing import Any, Dict, List, Optional, Union
from functools import wraps
import time


# Configure logging
def setup_logging(service_name: str, log_level: str = "INFO") -> logging.Logger:
    """
    Setup logging configuration for a service
    
    Args:
        service_name: Name of the service for log identification
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(service_name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    
    # Add handler if not already added
    if not logger.handlers:
        logger.addHandler(console_handler)
    
    return logger


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles MongoDB ObjectId and datetime"""
    
    def default(self, obj: Any) -> Any:
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)


def serialize_document(doc: Dict) -> Dict:
    """
    Serialize a MongoDB document for JSON response
    Converts ObjectId and datetime to strings
    
    Args:
        doc: MongoDB document
    
    Returns:
        Serialized document
    """
    if doc is None:
        return None
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, date):
            serialized[key] = value.isoformat()
        elif isinstance(value, dict):
            serialized[key] = serialize_document(value)
        elif isinstance(value, list):
            serialized[key] = [
                serialize_document(item) if isinstance(item, dict) else 
                str(item) if isinstance(item, ObjectId) else
                item.isoformat() if isinstance(item, (datetime, date)) else
                item
                for item in value
            ]
        else:
            serialized[key] = value
    
    return serialized


def serialize_documents(docs: List[Dict]) -> List[Dict]:
    """
    Serialize a list of MongoDB documents
    
    Args:
        docs: List of MongoDB documents
    
    Returns:
        List of serialized documents
    """
    return [serialize_document(doc) for doc in docs]


# Date utilities
def parse_date(date_str: str) -> Optional[datetime]:
    """
    Parse date string to datetime object
    Supports multiple formats
    
    Args:
        date_str: Date string
    
    Returns:
        Datetime object or None if parsing fails
    """
    formats = [
        '%Y-%m-%d',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%dT%H:%M:%SZ',
        '%d/%m/%Y',
        '%d-%m-%Y',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    return None


def get_date_range(days: int = 30) -> tuple:
    """
    Get date range from today
    
    Args:
        days: Number of days to look back
    
    Returns:
        Tuple of (start_date, end_date)
    """
    end_date = datetime.now()
    start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = start_date.replace(day=start_date.day - days) if start_date.day > days else \
                 start_date.replace(month=start_date.month - 1, day=30)
    
    from datetime import timedelta
    start_date = datetime.now() - timedelta(days=days)
    
    return start_date, end_date


def days_between(date1: datetime, date2: datetime) -> int:
    """Calculate days between two dates"""
    return abs((date2 - date1).days)


# Response formatters
def success_response(data: Any = None, message: str = "Success") -> Dict:
    """
    Create standardized success response
    
    Args:
        data: Response data
        message: Success message
    
    Returns:
        Formatted response dictionary
    """
    response = {
        "success": True,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    if data is not None:
        response["data"] = data
    return response


def error_response(message: str, error_code: str = "ERROR", details: Any = None) -> Dict:
    """
    Create standardized error response
    
    Args:
        message: Error message
        error_code: Error code identifier
        details: Additional error details
    
    Returns:
        Formatted error response dictionary
    """
    response = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message
        },
        "timestamp": datetime.now().isoformat()
    }
    if details is not None:
        response["error"]["details"] = details
    return response


# Decorators
def timing_decorator(func):
    """Decorator to measure function execution time"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        execution_time = end_time - start_time
        logging.info(f"{func.__name__} executed in {execution_time:.2f} seconds")
        return result
    return wrapper


def safe_execute(default_value: Any = None):
    """
    Decorator for safe execution with error handling
    
    Args:
        default_value: Value to return on error
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logging.error(f"Error in {func.__name__}: {e}")
                return default_value
        return wrapper
    return decorator


# Validation helpers
def validate_object_id(id_str: str) -> bool:
    """
    Validate if string is a valid MongoDB ObjectId
    
    Args:
        id_str: String to validate
    
    Returns:
        True if valid ObjectId, False otherwise
    """
    try:
        ObjectId(id_str)
        return True
    except Exception:
        return False


def to_object_id(id_str: str) -> Optional[ObjectId]:
    """
    Convert string to ObjectId safely
    
    Args:
        id_str: String to convert
    
    Returns:
        ObjectId or None if invalid
    """
    try:
        return ObjectId(id_str)
    except Exception:
        return None


# Numerical utilities
def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert value to float"""
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    """Safely convert value to int"""
    try:
        return int(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def calculate_percentage(part: float, total: float) -> float:
    """Calculate percentage safely"""
    if total == 0:
        return 0.0
    return round((part / total) * 100, 2)
