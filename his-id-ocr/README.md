# HIS ID OCR Service

AI-powered Government ID scanning microservice for Hospital Information System.

## Features

- Extract patient details from Aadhaar/Government ID cards
- Mask Aadhaar numbers in text (XXXX XXXX 1234)
- Mask Aadhaar regions in stored images (blur/black)
- Privacy-first design - raw Aadhaar never stored or returned

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker

```bash
# Build image
docker build -t his-id-ocr .

# Run container
docker run -p 8000:8000 his-id-ocr
```

## API Endpoints

### POST /extract-id
Upload an ID card image for extraction.

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "success": true,
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "gender": "Male",
  "maskedAadhaar": "XXXX XXXX 1234",
  "maskedImageUrl": "/masked-images/id_xxx_masked.jpg",
  "confidence": "high"
}
```

### GET /health
Health check endpoint.

## Requirements

- Python 3.10+
- Tesseract OCR (for image masking)
- ~4GB disk space for Donut model
- GPU recommended but not required
