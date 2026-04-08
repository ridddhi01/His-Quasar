"""
Flask API for Predictive Analytics ML Service
Provides endpoints for OPD, bed occupancy, and lab workload predictions
"""

import os
import sys
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.utils import setup_logging, success_response, error_response
from config import Config
from opd_predictor import get_opd_predictor
from bed_predictor import get_bed_predictor
from lab_predictor import get_lab_predictor

# Initialize Flask app
app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/ml/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Setup logging
logger = setup_logging('predictive_analytics_api')

# Initialize components (lazy loading)
_components_initialized = False


def init_components():
    """Initialize all components lazily"""
    global _components_initialized
    if not _components_initialized:
        try:
            get_opd_predictor()
            get_bed_predictor()
            get_lab_predictor()
            _components_initialized = True
            logger.info("All predictive analytics components initialized")
        except Exception as e:
            logger.error(f"Error initializing components: {e}")


# ============================================================
# Health Check Endpoint
# ============================================================

@app.route('/ml/predict/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    GET /ml/predict/health
    """
    try:
        # Check database connection
        db_status = "unknown"
        try:
            from shared.db_connector import get_db
            db = get_db()
            db.client.admin.command('ping')
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        
        # Check model statuses
        init_components()
        
        opd = get_opd_predictor()
        bed = get_bed_predictor()
        lab = get_lab_predictor()
        
        return jsonify(success_response({
            'service': 'predictive-analytics',
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'components': {
                'database': db_status,
                'opd_model': 'trained' if opd.model.is_trained else 'not_trained',
                'bed_model': 'trained' if bed.model.is_trained else 'not_trained',
                'lab_model': 'trained' if lab.model.is_trained else 'not_trained'
            },
            'config': {
                'port': Config.FLASK_PORT
            }
        }, message='Service is healthy'))
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify(error_response(str(e), 'HEALTH_CHECK_FAILED')), 500


# ============================================================
# OPD Prediction Endpoints
# ============================================================

@app.route('/ml/predict/opd', methods=['POST'])
def predict_opd():
    """
    Predict OPD rush hours
    POST /ml/predict/opd
    
    Request body:
    {
        "hours": 24  // Number of hours to predict (default: 24)
    }
    """
    try:
        init_components()
        
        data = request.get_json() or {}
        hours = data.get('hours', 24)
        
        predictor = get_opd_predictor()
        
        if not predictor.model.is_trained:
            # Try to train first
            train_result = predictor.train()
            if not train_result.get('success') and not predictor.model.is_trained:
                return jsonify(error_response(
                    'Model not trained. Please train first.',
                    'MODEL_NOT_TRAINED'
                )), 400
        
        result = predictor.predict(hours=hours)
        
        if result.get('success'):
            return jsonify(success_response(result))
        else:
            return jsonify(error_response(result.get('error', 'Prediction failed'))), 500
        
    except Exception as e:
        logger.error(f"OPD prediction error: {e}")
        return jsonify(error_response(str(e))), 500


@app.route('/ml/predict/opd/rush-hours', methods=['GET'])
def get_opd_rush_hours():
    """
    Get OPD rush hour summary by day
    GET /ml/predict/opd/rush-hours
    """
    try:
        init_components()
        
        predictor = get_opd_predictor()
        result = predictor.get_rush_hour_summary()
        
        if 'error' in result:
            return jsonify(error_response(result['error'])), 500
        
        return jsonify(success_response(result))
        
    except Exception as e:
        logger.error(f"Rush hours error: {e}")
        return jsonify(error_response(str(e))), 500


# ============================================================
# Bed Occupancy Prediction Endpoints
# ============================================================

@app.route('/ml/predict/beds', methods=['POST'])
def predict_beds():
    """
    Predict bed occupancy
    POST /ml/predict/beds
    
    Request body:
    {
        "days": 7  // Number of days to predict (default: 7)
    }
    """
    try:
        init_components()
        
        data = request.get_json() or {}
        days = data.get('days', 7)
        
        predictor = get_bed_predictor()
        
        if not predictor.model.is_trained:
            train_result = predictor.train()
            if not train_result.get('success') and not predictor.model.is_trained:
                return jsonify(error_response(
                    'Model not trained. Please train first.',
                    'MODEL_NOT_TRAINED'
                )), 400
        
        result = predictor.predict(days=days)
        
        if result.get('success'):
            return jsonify(success_response(result))
        else:
            return jsonify(error_response(result.get('error', 'Prediction failed'))), 500
        
    except Exception as e:
        logger.error(f"Bed prediction error: {e}")
        return jsonify(error_response(str(e))), 500


@app.route('/ml/predict/beds/status', methods=['GET'])
def get_bed_status():
    """
    Get current bed occupancy status
    GET /ml/predict/beds/status
    """
    try:
        init_components()
        
        predictor = get_bed_predictor()
        result = predictor.get_current_status()
        
        if 'error' in result:
            return jsonify(error_response(result['error'])), 500
        
        return jsonify(success_response(result))
        
    except Exception as e:
        logger.error(f"Bed status error: {e}")
        return jsonify(error_response(str(e))), 500


# ============================================================
# Lab Workload Prediction Endpoints
# ============================================================

@app.route('/ml/predict/lab', methods=['POST'])
def predict_lab():
    """
    Predict lab workload
    POST /ml/predict/lab
    
    Request body:
    {
        "hours": 24  // Number of hours to predict (default: 24)
    }
    """
    try:
        init_components()
        
        data = request.get_json() or {}
        hours = data.get('hours', 24)
        
        predictor = get_lab_predictor()
        
        if not predictor.model.is_trained:
            train_result = predictor.train()
            if not train_result.get('success') and not predictor.model.is_trained:
                return jsonify(error_response(
                    'Model not trained. Please train first.',
                    'MODEL_NOT_TRAINED'
                )), 400
        
        result = predictor.predict(hours=hours)
        
        if result.get('success'):
            return jsonify(success_response(result))
        else:
            return jsonify(error_response(result.get('error', 'Prediction failed'))), 500
        
    except Exception as e:
        logger.error(f"Lab prediction error: {e}")
        return jsonify(error_response(str(e))), 500


@app.route('/ml/predict/lab/breakdown', methods=['GET'])
def get_lab_breakdown():
    """
    Get lab workload breakdown by test type
    GET /ml/predict/lab/breakdown?days=7
    """
    try:
        init_components()
        
        days = int(request.args.get('days', 7))
        
        predictor = get_lab_predictor()
        result = predictor.get_workload_by_test_type(days=days)
        
        if 'error' in result:
            return jsonify(error_response(result['error'])), 500
        
        return jsonify(success_response(result))
        
    except Exception as e:
        logger.error(f"Lab breakdown error: {e}")
        return jsonify(error_response(str(e))), 500


# ============================================================
# Training Endpoints
# ============================================================

@app.route('/ml/predict/train', methods=['POST'])
def train_models():
    """
    Train all prediction models
    POST /ml/predict/train
    
    Request body:
    {
        "models": ["opd", "bed", "lab"],  // Models to train (default: all)
        "force": false                      // Force retrain
    }
    """
    try:
        init_components()
        
        data = request.get_json() or {}
        models = data.get('models', ['opd', 'bed', 'lab'])
        force = data.get('force', False)
        
        results = {}
        
        if 'opd' in models:
            logger.info("Training OPD model...")
            predictor = get_opd_predictor()
            results['opd'] = predictor.train(force=force)
        
        if 'bed' in models:
            logger.info("Training Bed model...")
            predictor = get_bed_predictor()
            results['bed'] = predictor.train(force=force)
        
        if 'lab' in models:
            logger.info("Training Lab model...")
            predictor = get_lab_predictor()
            results['lab'] = predictor.train(force=force)
        
        # Check if all succeeded
        all_success = all(r.get('success', False) for r in results.values())
        
        return jsonify(success_response({
            'all_success': all_success,
            'results': results
        }, message='Training complete'))
        
    except Exception as e:
        logger.error(f"Training error: {e}")
        return jsonify(error_response(str(e), 'TRAINING_FAILED')), 500


@app.route('/ml/predict/train/status', methods=['GET'])
def get_training_status():
    """
    Get training status for all models
    GET /ml/predict/train/status
    """
    try:
        init_components()
        
        opd = get_opd_predictor()
        bed = get_bed_predictor()
        lab = get_lab_predictor()
        
        return jsonify(success_response({
            'opd': opd.get_model_info(),
            'bed': bed.get_model_info(),
            'lab': lab.get_model_info()
        }))
        
    except Exception as e:
        logger.error(f"Status error: {e}")
        return jsonify(error_response(str(e))), 500


# ============================================================
# Combined Predictions Endpoint
# ============================================================

@app.route('/ml/predictions', methods=['GET'])
def get_all_predictions():
    """
    Get predictions from all models
    GET /ml/predictions
    """
    try:
        init_components()
        
        results = {}
        
        # OPD
        opd = get_opd_predictor()
        if opd.model.is_trained:
            results['opd'] = opd.predict(hours=24)
        else:
            results['opd'] = {'error': 'Model not trained'}
        
        # Bed
        bed = get_bed_predictor()
        if bed.model.is_trained:
            results['bed'] = bed.predict(days=7)
        else:
            results['bed'] = {'error': 'Model not trained'}
        
        # Lab
        lab = get_lab_predictor()
        if lab.model.is_trained:
            results['lab'] = lab.predict(hours=24)
        else:
            results['lab'] = {'error': 'Model not trained'}
        
        return jsonify(success_response(results))
        
    except Exception as e:
        logger.error(f"Predictions error: {e}")
        return jsonify(error_response(str(e))), 500


# ============================================================
# Error Handlers
# ============================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify(error_response('Endpoint not found', 'NOT_FOUND')), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify(error_response('Internal server error', 'INTERNAL_ERROR')), 500


@app.errorhandler(Exception)
def handle_exception(error):
    """Handle uncaught exceptions"""
    logger.error(f"Unhandled exception: {error}")
    return jsonify(error_response(str(error), 'UNHANDLED_ERROR')), 500


# ============================================================
# Main Entry Point
# ============================================================

if __name__ == '__main__':
    logger.info(f"Starting Predictive Analytics Service on port {Config.FLASK_PORT}")
    
    # Initialize components on startup
    try:
        init_components()
    except Exception as e:
        logger.warning(f"Component initialization failed (will retry on first request): {e}")
    
    # Run Flask app
    app.run(
        host=Config.FLASK_HOST,
        port=Config.FLASK_PORT,
        debug=Config.FLASK_DEBUG
    )
