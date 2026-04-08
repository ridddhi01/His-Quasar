
import React, { useState } from 'react';
import emergencyOrderSetService from '../../services/emergency.orderSet.service';
import './NurseTriagePanel.css';

/**
 * Nurse Triage Panel
 * Specialized interface for nurses to manage triage, vitals, and nursing notes
 */
const NurseTriagePanel = ({ emergencyCase, onUpdate }) => {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!note.trim()) return;

        setLoading(true);
        try {
            await emergencyOrderSetService.addNursingNote(emergencyCase._id, note);
            setNote('');
            if (onUpdate) onUpdate(); // Trigger refresh
        } catch (error) {
            console.error("Failed to add note:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkReady = async () => {
        if (!window.confirm("Mark patient as ready for doctor assessment?")) return;

        setLoading(true);
        try {
            await emergencyOrderSetService.markReadyForDoctor(emergencyCase._id);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to mark ready:", error);
        } finally {
            setLoading(false);
        }
    };

    const isReady = emergencyCase.readyForDoctor;

    return (
        <div className="nurse-triage-panel">
            <div className="panel-header">
                <h3><i className="fas fa-user-nurse"></i> Nursing Station</h3>
                {isReady ? (
                    <span className="badge badge-success">Ready for Doctor</span>
                ) : (
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={handleMarkReady}
                        disabled={loading}
                    >
                        Mark Ready for Doctor
                    </button>
                )}
            </div>

            <div className="panel-content">
                <div className="nursing-notes-section">
                    <h4>Nursing Notes</h4>
                    <div className="notes-list">
                        {emergencyCase.nursingNotes && emergencyCase.nursingNotes.length > 0 ? (
                            emergencyCase.nursingNotes.map((noteItem, index) => (
                                <div key={index} className="note-card">
                                    <p className="note-text">{noteItem.note}</p>
                                    <div className="note-meta">
                                        <span>{noteItem.recordedBy?.firstName || 'Nurse'}</span>
                                        <span>{new Date(noteItem.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted text-center py-2">No notes recorded yet</p>
                        )}
                    </div>

                    <form onSubmit={handleAddNote} className="add-note-form">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Add nursing observation..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={loading}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" disabled={!note.trim() || loading}>
                            Add
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default NurseTriagePanel;
