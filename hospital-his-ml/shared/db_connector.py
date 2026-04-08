"""
MongoDB Database Connector for Hospital HIS ML Services
Provides connection pooling and methods for accessing collections
"""

import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseConnector:
    """MongoDB connection manager with connection pooling"""
    
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        """Singleton pattern to ensure single connection pool"""
        if cls._instance is None:
            cls._instance = super(DatabaseConnector, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize database connection"""
        if self._initialized:
            return
            
        self.mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/hospital_his')
        self.db_name = os.getenv('DB_NAME', 'hospital_his')
        self._connect()
        self._initialized = True
    
    def _connect(self):
        """Establish MongoDB connection with pooling"""
        try:
            self._client = MongoClient(
                self.mongodb_uri,
                maxPoolSize=50,
                minPoolSize=10,
                maxIdleTimeMS=30000,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                retryWrites=True
            )
            # Test connection
            self._client.admin.command('ping')
            self._db = self._client[self.db_name]
            logger.info(f"Successfully connected to MongoDB: {self.db_name}")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    def reconnect(self):
        """Reconnect to database"""
        if self._client:
            self._client.close()
        self._connect()
    
    @property
    def db(self):
        """Get database instance"""
        return self._db
    
    @property
    def client(self):
        """Get MongoDB client"""
        return self._client
    
    # Collection accessors
    @property
    def patients(self):
        """Access patients collection"""
        return self._db['patients']
    
    @property
    def appointments(self):
        """Access appointments collection"""
        return self._db['appointments']
    
    @property
    def admissions(self):
        """Access admissions collection"""
        return self._db['admissions']
    
    @property
    def emr(self):
        """Access EMR collection"""
        return self._db['emr']
    
    @property
    def prescriptions(self):
        """Access prescriptions collection"""
        return self._db['prescriptions']
    
    @property
    def pharmacy_dispense(self):
        """Access pharmacy dispensing records"""
        return self._db['pharmacy_dispense']
    
    @property
    def lab_tests(self):
        """Access lab tests collection"""
        return self._db['lab_tests']
    
    @property
    def radiology_tests(self):
        """Access radiology tests collection"""
        return self._db['radiology_tests']
    
    @property
    def surgeries(self):
        """Access surgeries collection"""
        return self._db['surgeries']
    
    @property
    def billings(self):
        """Access billings collection"""
        return self._db['billings']
    
    @property
    def billing_items(self):
        """Access billing items collection"""
        return self._db['billing_items']
    
    @property
    def payments(self):
        """Access payments collection"""
        return self._db['payments']
    
    @property
    def tariffs(self):
        """Access tariffs collection"""
        return self._db['tariffs']
    
    @property
    def ai_anomalies(self):
        """Access AI anomalies collection (for storing detected anomalies)"""
        return self._db['ai_anomalies']
    
    @property
    def ai_predictions(self):
        """Access AI predictions collection"""
        return self._db['ai_predictions']
    
    def close(self):
        """Close database connection"""
        if self._client:
            self._client.close()
            logger.info("MongoDB connection closed")


# Convenience function to get database instance
def get_db():
    """Get database connector instance"""
    return DatabaseConnector()


def get_collection(collection_name: str):
    """Get a specific collection by name"""
    db = get_db()
    return db.db[collection_name]
