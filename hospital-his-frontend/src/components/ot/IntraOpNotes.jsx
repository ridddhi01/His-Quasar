import React, { useState, useEffect } from 'react';
import { FileText, Plus, Clock, User, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

const IntraOpNotes = ({ surgeryId, surgery, onUpdate, readOnly = false }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        fetchNotes();
    }, [surgeryId]);

    const fetchNotes = async () => {
        try {
            const res = await surgeryService.getIntraOpNotes(surgeryId);
            setNotes(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) {
            toast.error('Enter a note');
            return;
        }
        try {
            await surgeryService.addIntraOpNote(surgeryId, { note: newNote });
            toast.success('Note Added');
            setNewNote('');
            fetchNotes();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to add note');
        }
    };

    if (loading) {
        return <div className="text-center py-10 text-gray-400">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <FileText className="text-primary" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Intra-Operative Notes</h3>
            </div>

            {/* Add Note */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <textarea
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg"
                    rows="3"
                    placeholder="Add intra-operative note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                />
                <button
                    onClick={handleAddNote}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium"
                >
                    <Plus size={16} /> Add Note
                </button>
            </div>

            {/* Notes Timeline */}
            <div className="space-y-4">
                {notes.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No notes recorded</div>
                ) : (
                    notes.map((note, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2 text-sm text-gray-500">
                                <Clock size={14} />
                                <span>{new Date(note.time).toLocaleString()}</span>
                                {note.recordedBy && (
                                    <>
                                        <User size={14} className="ml-3" />
                                        <span>{note.recordedBy?.profile?.firstName} {note.recordedBy?.profile?.lastName}</span>
                                    </>
                                )}
                            </div>
                            <p className="text-slate-700">{note.note}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default IntraOpNotes;
