from fastapi import FastAPI

# Predictive Analytics
from predictive_analytics.bed_predictor import BedPredictor
from predictive_analytics.lab_predictor import LabPredictor
from predictive_analytics.opd_predictor import OPDPredictor

# Revenue Leakage
from revenue_leakage.anomaly_detector import AnomalyDetector
from revenue_leakage.alert_generator import AlertGenerator

app = FastAPI()

# Initialize models once
bed_model = BedPredictor()
lab_model = LabPredictor()
opd_model = OPDPredictor()

anomaly_model = AnomalyDetector()
alert_model = AlertGenerator()

@app.get("/")
def home():
    return {"message": "ML Service Running 🚀"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# ------------------ PREDICTIONS ------------------

@app.post("/predict/bed")
def predict_bed(data: dict):
    return {"result": bed_model.predict(data)}

@app.post("/predict/lab")
def predict_lab(data: dict):
    return {"result": lab_model.predict(data)}

@app.post("/predict/opd")
def predict_opd(data: dict):
    return {"result": opd_model.predict(data)}

# ------------------ REVENUE ------------------

@app.post("/detect/anomaly")
def detect_anomaly(data: dict):
    return {"result": anomaly_model.detect(data)}

@app.post("/generate/alert")
def generate_alert(data: dict):
    return {"result": alert_model.generate(data)}