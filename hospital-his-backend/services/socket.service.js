const { Server } = require('socket.io');

/**
 * Socket Service
 * Handles real-time updates via WebSocket
 */

class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map();
    }

    /**
     * Initialize Socket.IO server
     */
    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });

        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            // Handle user authentication
            socket.on('authenticate', (userId) => {
                this.connectedUsers.set(userId, socket.id);
                socket.userId = userId;
                socket.join(`user:${userId}`);
                console.log(`User ${userId} authenticated`);
            });

            // Join department room
            socket.on('joinDepartment', (departmentId) => {
                socket.join(`department:${departmentId}`);
            });

            // Join role room
            socket.on('joinRole', (role) => {
                socket.join(`role:${role}`);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                if (socket.userId) {
                    this.connectedUsers.delete(socket.userId);
                }
                console.log('Client disconnected:', socket.id);
            });
        });

        return this.io;
    }

    /**
     * Emit to specific user
     */
    emitToUser(userId, event, data) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }

    /**
     * Emit to department
     */
    emitToDepartment(departmentId, event, data) {
        if (this.io) {
            this.io.to(`department:${departmentId}`).emit(event, data);
        }
    }

    /**
     * Emit to role
     */
    emitToRole(role, event, data) {
        if (this.io) {
            this.io.to(`role:${role}`).emit(event, data);
        }
    }

    /**
     * Broadcast to all connected clients
     */
    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    // === Event Emitters ===

    /**
     * Notify new appointment
     */
    notifyNewAppointment(appointment) {
        this.emitToUser(appointment.doctor.toString(), 'newAppointment', appointment);
        this.emitToRole('receptionist', 'newAppointment', appointment);
    }

    /**
     * Notify queue update
     */
    notifyQueueUpdate(departmentId, queueData) {
        this.emitToDepartment(departmentId, 'queueUpdate', queueData);
    }

    /**
     * Notify lab result ready
     */
    notifyLabResultReady(labTest) {
        this.emitToUser(labTest.orderedBy.toString(), 'labResultReady', {
            testNumber: labTest.testNumber,
            patientName: `${labTest.patient?.firstName} ${labTest.patient?.lastName}`,
        });
    }

    /**
     * Notify emergency arrival
     */
    notifyEmergencyArrival(emergencyCase) {
        this.emitToRole('doctor', 'emergencyArrival', emergencyCase);
        this.emitToRole('nurse', 'emergencyArrival', emergencyCase);
        this.emitToDepartment('emergency', 'emergencyArrival', emergencyCase);
    }

    /**
     * Notify bed status change
     */
    notifyBedStatusChange(bed) {
        this.emitToRole('nurse', 'bedStatusChange', bed);
        this.emitToRole('receptionist', 'bedStatusChange', bed);
    }

    /**
     * Notify payment received
     */
    notifyPaymentReceived(payment) {
        this.emitToRole('billing', 'paymentReceived', payment);
    }

    /**
     * Notify anomaly detected (AI)
     */
    notifyAnomalyDetected(anomaly) {
        this.emitToRole('admin', 'anomalyDetected', anomaly);
        this.emitToRole('compliance', 'anomalyDetected', anomaly);
    }

    /**
     * Notify prescription ready for dispensing
     */
    notifyPrescriptionReady(prescription) {
        this.emitToRole('pharmacist', 'prescriptionReady', prescription);
    }

    /**
     * Notify discharge
     */
    notifyDischarge(admission) {
        this.emitToRole('billing', 'patientDischarge', admission);
        this.emitToRole('nurse', 'patientDischarge', admission);
    }
}

module.exports = new SocketService();
