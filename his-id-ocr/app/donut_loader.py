"""
Donut Model Loader
==================
Singleton pattern to load the Donut model once at startup.
Uses Hugging Face's naver-clova-ix/donut-base-finetuned-docvqa model.
"""

import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
from functools import lru_cache
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Model identifier from Hugging Face
MODEL_NAME = "naver-clova-ix/donut-base-finetuned-docvqa"


class DonutModelLoader:
    """
    Singleton class to manage Donut model loading.
    Ensures model is loaded only once and reused across requests.
    """
    
    _instance = None
    _processor = None
    _model = None
    _device = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DonutModelLoader, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def initialize(self):
        """
        Initialize the model and processor.
        Called once at application startup.
        """
        if self._initialized:
            logger.info("Model already initialized, skipping...")
            return
        
        logger.info(f"Loading Donut model: {MODEL_NAME}")
        logger.info("This may take a few minutes on first run as the model downloads...")
        
        try:
            # Determine device (GPU if available, else CPU)
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {self._device}")
            
            # Load processor (handles image preprocessing and tokenization)
            self._processor = DonutProcessor.from_pretrained(MODEL_NAME)
            logger.info("Processor loaded successfully")
            
            # Load model
            self._model = VisionEncoderDecoderModel.from_pretrained(MODEL_NAME)
            self._model.to(self._device)
            self._model.eval()  # Set to evaluation mode
            logger.info("Model loaded successfully")
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"Failed to load Donut model: {str(e)}")
            raise RuntimeError(f"Model initialization failed: {str(e)}")
    
    @property
    def processor(self):
        """Get the Donut processor"""
        if not self._initialized:
            self.initialize()
        return self._processor
    
    @property
    def model(self):
        """Get the Donut model"""
        if not self._initialized:
            self.initialize()
        return self._model
    
    @property
    def device(self):
        """Get the compute device"""
        if not self._initialized:
            self.initialize()
        return self._device


# Global instance for easy access
donut_loader = DonutModelLoader()


def get_donut_loader() -> DonutModelLoader:
    """
    Get the global Donut model loader instance.
    Use this function for dependency injection in FastAPI.
    """
    return donut_loader
