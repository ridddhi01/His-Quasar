import React, { useState, useEffect } from 'react';
import {
    Shield,
    CheckCircle2,
    Circle,
    Clock,
    User,
    AlertTriangle,
    Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import surgeryService from '../../services/surgery.service';

const WHOChecklist = ({ surgeryId, surgery, onUpdate, readOnly = false }) => {
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activePhase, setActivePhase] = useState('signIn');

    // Sign-In form
    const [signInForm, setSignInForm] = useState({
        patientIdentityConfirmed: false,
        siteMarked: false,
        anesthesiaSafetyCheckComplete: false,
        pulseOximeterFunctioning: false,
        knownAllergyReviewed: false,
        difficultAirwayRisk: false,
        aspirationRisk: false,
        bloodLossRiskAssessed: false,
    });

    // Time-Out form
    const [timeOutForm, setTimeOutForm] = useState({
        teamIntroductionDone: false,
        patientNameConfirmed: false,
        procedureConfirmed: false,
        siteConfirmed: false,
        antibioticProphylaxisGiven: false,
        criticalStepsReviewed: false,
        anticipatedBloodLossDiscussed: false,
        imagingDisplayed: false,
    });

    // Sign-Out form
    const [signOutForm, setSignOutForm] = useState({
        procedureRecorded: false,
        instrumentCountCorrect: false,
        specimenLabelled: false,
        equipmentIssuesDocumented: false,
        recoveryPlanCommunicated: false,
    });

    useEffect(() => {
        fetchChecklist();
    }, [surgeryId]);

    const fetchChecklist = async () => {
        try {
            const res = await surgeryService.getWHOChecklist(surgeryId);
            if (res.data) {
                setChecklist(res.data);
                if (res.data.signIn) {
                    setSignInForm(prev => ({ ...prev, ...res.data.signIn }));
                }
                if (res.data.timeOut) {
                    setTimeOutForm(prev => ({ ...prev, ...res.data.timeOut }));
                }
                if (res.data.signOut) {
                    setSignOutForm(prev => ({ ...prev, ...res.data.signOut }));
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSignIn = async () => {
        try {
            await surgeryService.updateWHOSignIn(surgeryId, signInForm);
            toast.success('Sign-In Checklist Saved');
            fetchChecklist();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to save Sign-In');
        }
    };

    const handleSaveTimeOut = async () => {
        try {
            await surgeryService.updateWHOTimeOut(surgeryId, timeOutForm);
            toast.success('Time-Out Checklist Saved');
            fetchChecklist();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to save Time-Out');
        }
    };

    const handleSaveSignOut = async () => {
        try {
            await surgeryService.updateWHOSignOut(surgeryId, signOutForm);
            toast.success('Sign-Out Checklist Saved');
            fetchChecklist();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to save Sign-Out');
        }
    };

    const getPhaseStatus = (phase) => {
        if (!checklist?.[phase]?.completedAt) return 'pending';
        return 'completed';
    };

    const CheckItem = ({ label, checked, onChange, disabled }) => (
        <label className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className={`text-sm ${checked ? 'text-green-800 font-medium' : 'text-slate-700'}`}>{label}</span>
            {checked && <CheckCircle2 size={16} className="ml-auto text-green-600" />}
        </label>
    );

    if (loading) {
        return <div className="text-center py-10 text-gray-400">Loading WHO Checklist...</div>;
    }

    const phases = [
        { id: 'signIn', label: 'Sign-In', subtitle: 'Before Induction of Anesthesia' },
        { id: 'timeOut', label: 'Time-Out', subtitle: 'Before Skin Incision' },
        { id: 'signOut', label: 'Sign-Out', subtitle: 'Before Patient Leaves OT' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <Shield className="text-primary" size={24} />
                <h3 className="font-bold text-lg text-slate-800">WHO Surgical Safety Checklist</h3>
            </div>

            {/* Phase Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {phases.map(phase => {
                    const status = getPhaseStatus(phase.id);
                    return (
                        <button
                            key={phase.id}
                            onClick={() => setActivePhase(phase.id)}
                            className={`flex-1 min-w-[150px] p-4 rounded-xl border-2 transition-all ${activePhase === phase.id
                                ? 'border-primary bg-primary/5'
                                : status === 'completed'
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold ${activePhase === phase.id ? 'text-primary' : 'text-slate-800'}`}>
                                    {phase.label}
                                </span>
                                {status === 'completed' ? (
                                    <CheckCircle2 size={18} className="text-green-600" />
                                ) : (
                                    <Circle size={18} className="text-gray-300" />
                                )}
                            </div>
                            <p className="text-xs text-gray-500">{phase.subtitle}</p>
                            {status === 'completed' && checklist?.[phase.id]?.completedAt && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(checklist[phase.id].completedAt).toLocaleTimeString()}
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Sign-In Phase */}
            {activePhase === 'signIn' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={18} className="text-yellow-600" />
                        <h4 className="font-semibold text-slate-800">Sign-In: Before Induction of Anesthesia</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <CheckItem
                            label="Patient identity confirmed (wristband, verbal)"
                            checked={signInForm.patientIdentityConfirmed}
                            onChange={(e) => setSignInForm({ ...signInForm, patientIdentityConfirmed: e.target.checked })}
                        />
                        <CheckItem
                            label="Surgery site marked"
                            checked={signInForm.siteMarked}
                            onChange={(e) => setSignInForm({ ...signInForm, siteMarked: e.target.checked })}
                        />
                        <CheckItem
                            label="Anesthesia safety check complete"
                            checked={signInForm.anesthesiaSafetyCheckComplete}
                            onChange={(e) => setSignInForm({ ...signInForm, anesthesiaSafetyCheckComplete: e.target.checked })}
                        />
                        <CheckItem
                            label="Pulse oximeter functioning"
                            checked={signInForm.pulseOximeterFunctioning}
                            onChange={(e) => setSignInForm({ ...signInForm, pulseOximeterFunctioning: e.target.checked })}
                        />
                        <CheckItem
                            label="Known allergies reviewed"
                            checked={signInForm.knownAllergyReviewed}
                            onChange={(e) => setSignInForm({ ...signInForm, knownAllergyReviewed: e.target.checked })}
                        />
                        <CheckItem
                            label="Difficult airway risk assessed"
                            checked={signInForm.difficultAirwayRisk}
                            onChange={(e) => setSignInForm({ ...signInForm, difficultAirwayRisk: e.target.checked })}
                        />
                        <CheckItem
                            label="Aspiration risk assessed"
                            checked={signInForm.aspirationRisk}
                            onChange={(e) => setSignInForm({ ...signInForm, aspirationRisk: e.target.checked })}
                        />
                        <CheckItem
                            label="Blood loss risk assessed"
                            checked={signInForm.bloodLossRiskAssessed}
                            onChange={(e) => setSignInForm({ ...signInForm, bloodLossRiskAssessed: e.target.checked })}
                        />
                    </div>
                    <button
                        onClick={handleSaveSignIn}
                        className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
                    >
                        Complete Sign-In
                    </button>
                    {checklist?.signIn?.completedAt && (
                        <p className="mt-4 text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            Completed at {new Date(checklist.signIn.completedAt).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {/* Time-Out Phase */}
            {activePhase === 'timeOut' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={18} className="text-blue-600" />
                        <h4 className="font-semibold text-slate-800">Time-Out: Before Skin Incision</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <CheckItem
                            label="Team introduction done"
                            checked={timeOutForm.teamIntroductionDone}
                            onChange={(e) => setTimeOutForm({ ...timeOutForm, teamIntroductionDone: e.target.checked })}
                        />
                        <CheckItem
                            label="Patient name confirmed"
                            checked={timeOutForm.patientNameConfirmed}
                            onChange={(e) => setTimeOutForm({ ...timeOutForm, patientNameConfirmed: e.target.checked })}
                        />
                        <CheckItem
                            label="Procedure confirmed"
                            checked={timeOutForm.procedureConfirmed}
                            onChange={(e) => setTimeOutForm({ ...timeOutForm, procedureConfirmed: e.target.checked })}
                        />
                        <CheckItem
                            label="Site confirmed"
                            checked={timeOutForm.siteConfirmed}
                            onChange={(e) => setTimeOutForm({ ...timeOutForm, siteConfirmed: e.target.checked })}
                        />
                        <CheckItem
                            label="Antibiotic prophylaxis given"
                            checked={timeOutForm.antibioticProphylaxisGiven}
                            onChange={(e) => setTimeOutForm({ ...timeOutForm, antibioticProphylaxisGiven: e.target.checked })}
                        />
                        <CheckItem
                            label="Critical steps reviewed"
                            checked={timeOutForm.criticalStepsReviewed}
                            onChange={(e) => setTimeOutForm({ ...timeOutForm, criticalStepsReviewed: e.target.checked })}
                        />
                        <CheckItem
                            label="Anticipated blood loss discussed"
                            checked={timeOutForm.anticipatedBloodLossDiscussed}
                            onChange={(e) => setTimeOutForm({ ...timeOutForm, anticipatedBloodLossDiscussed: e.target.checked })}
                        />
                        <CheckItem
                            label="Imaging displayed"
                            checked={timeOutForm.imagingDisplayed}
                            onChange={(e) => setTimeOutForm({ ...timeOutForm, imagingDisplayed: e.target.checked })}
                        />
                    </div>
                    <button
                        onClick={handleSaveTimeOut}
                        className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
                    >
                        Complete Time-Out
                    </button>
                    {checklist?.timeOut?.completedAt && (
                        <p className="mt-4 text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            Completed at {new Date(checklist.timeOut.completedAt).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {/* Sign-Out Phase */}
            {activePhase === 'signOut' && (
                <div className="bg-white border border-gray-100 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 size={18} className="text-green-600" />
                        <h4 className="font-semibold text-slate-800">Sign-Out: Before Patient Leaves OT</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <CheckItem
                            label="Procedure name recorded correctly"
                            checked={signOutForm.procedureRecorded}
                            onChange={(e) => setSignOutForm({ ...signOutForm, procedureRecorded: e.target.checked })}
                        />
                        <CheckItem
                            label="Instrument & sponge count correct"
                            checked={signOutForm.instrumentCountCorrect}
                            onChange={(e) => setSignOutForm({ ...signOutForm, instrumentCountCorrect: e.target.checked })}
                        />
                        <CheckItem
                            label="Specimen labelled"
                            checked={signOutForm.specimenLabelled}
                            onChange={(e) => setSignOutForm({ ...signOutForm, specimenLabelled: e.target.checked })}
                        />
                        <CheckItem
                            label="Equipment issues documented"
                            checked={signOutForm.equipmentIssuesDocumented}
                            onChange={(e) => setSignOutForm({ ...signOutForm, equipmentIssuesDocumented: e.target.checked })}
                        />
                        <CheckItem
                            label="Recovery plan communicated"
                            checked={signOutForm.recoveryPlanCommunicated}
                            onChange={(e) => setSignOutForm({ ...signOutForm, recoveryPlanCommunicated: e.target.checked })}
                        />
                    </div>
                    <button
                        onClick={handleSaveSignOut}
                        className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
                    >
                        Complete Sign-Out
                    </button>
                    {checklist?.signOut?.completedAt && (
                        <p className="mt-4 text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            Completed at {new Date(checklist.signOut.completedAt).toLocaleString()}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default WHOChecklist;
