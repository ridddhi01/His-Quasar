import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    LayoutDashboard, Users, Calendar, Stethoscope,
    FlaskConical, Pill, FileText, Settings,
    Menu, X, Activity, ShieldCheck, Database,
    Banknote, ScanLine, Siren, Scissors, ClipboardList, BedDouble, Ambulance,
    FileCode, CheckSquare, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { user } = useSelector((state) => state.auth);
    const role = user?.role || 'guest';

    // Navigation Config based on Roles
    // Navigation Config based on Roles
    const allNavItems = [
        // -------------------------------------------------------------------------
        // CLINICAL MODULES (Non-Admin)
        // -------------------------------------------------------------------------
        {
            title: 'Dashboard',
            path: '/dashboard',
            icon: <LayoutDashboard size={20} />,
            roles: ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech', 'billing', 'head_nurse'] // REMOVED 'admin'
        },
        {
            title: 'Patients',
            path: '/dashboard/patients',
            icon: <Users size={20} />,
            roles: ['doctor', 'nurse', 'receptionist', 'head_nurse']
        },
        {
            title: 'Appointments',
            path: '/dashboard/appointments',
            icon: <Calendar size={20} />,
            roles: ['doctor', 'nurse', 'receptionist']
        },
        {
            title: 'OPD Queue',
            path: '/dashboard/opd-queue',
            icon: <Stethoscope size={20} />,
            roles: ['doctor', 'nurse', 'receptionist']
        },
        {
            title: 'IPD / Wards',
            path: '/dashboard/ipd',
            icon: <Activity size={20} />,
            roles: ['doctor', 'nurse', 'receptionist', 'head_nurse']
        },
        {
            title: 'Bed Management',
            path: '/dashboard/bed-management',
            icon: <BedDouble size={20} />,
            roles: ['doctor', 'nurse', 'receptionist', 'head_nurse', 'admin']
        },
        {
            title: 'Emergency',
            path: '/dashboard/emergency',
            icon: <Ambulance size={20} />,
            roles: ['doctor', 'nurse', 'receptionist', 'head_nurse', 'admin']
        },
        {
            title: 'Laboratory',
            path: '/dashboard/lab',
            icon: <FlaskConical size={20} />,
            roles: ['doctor', 'lab_tech']
        },
        {
            title: 'Radiology',
            path: '/dashboard/radiology',
            icon: <ScanLine size={20} />,
            roles: ['doctor', 'radiologist']
        },
        {
            title: 'Pharmacy',
            path: '/dashboard/pharmacy',
            icon: <Pill size={20} />,
            roles: ['pharmacist']
        },
        {
            title: 'Operation Theatre',
            path: '/dashboard/ot',
            icon: <Scissors size={20} />,
            roles: ['doctor', 'nurse']
        },
        {
            title: 'Nursing',
            path: '/dashboard/nursing',
            icon: <Activity size={20} />,
            roles: ['nurse', 'head_nurse']
        },
        {
            title: 'Doctor Rounds',
            path: '/dashboard/doctor-rounds',
            icon: <ClipboardList size={20} />,
            roles: ['doctor']
        },
        {
            title: 'Duty Roster',
            path: '/dashboard/duty-roster',
            icon: <Calendar size={20} />,
            roles: ['head_nurse']
        },

        {
            title: 'Billing',
            path: '/dashboard/billing',
            icon: <Banknote size={20} />,
            roles: ['billing', 'receptionist']
        },
        {
            title: 'Insurance',
            path: '/dashboard/insurance',
            icon: <ShieldCheck size={20} />,
            roles: ['insurance', 'billing']
        },
        {
            title: 'Report Incident',
            path: '/dashboard/report-incident',
            icon: <AlertCircle size={20} />,
            roles: ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech', 'radiologist', 'billing', 'head_nurse', 'insurance', 'coder', 'senior_coder', 'compliance']
        },
        {
            title: 'My Reports',
            path: '/dashboard/my-incidents',
            icon: <FileText size={20} />,
            roles: ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech', 'radiologist', 'billing', 'head_nurse', 'insurance', 'coder', 'senior_coder', 'compliance']
        },
        {
            title: 'Incident Review Queue',
            path: '/dashboard/department-incidents',
            icon: <Database size={20} />,
            roles: ['head_nurse', 'compliance', 'admin']
        },

        // -------------------------------------------------------------------------
        // CLINICAL CODING (Coder Roles)
        // -------------------------------------------------------------------------
        {
            title: 'Coding Dashboard',
            path: '/dashboard/coding',
            icon: <LayoutDashboard size={20} />,
            roles: ['coder', 'senior_coder']
        },
        {
            title: 'Coding Queue',
            path: '/dashboard/coding/queue',
            icon: <FileCode size={20} />,
            roles: ['coder', 'senior_coder']
        },
        {
            title: 'Pending Review',
            path: '/dashboard/coding/review',
            icon: <CheckSquare size={20} />,
            roles: ['senior_coder']
        },
        {
            title: 'Procedure Codes',
            path: '/dashboard/coding/procedure-codes',
            icon: <Database size={20} />,
            roles: ['coder', 'senior_coder', 'admin']
        },

        // -------------------------------------------------------------------------
        // ADMIN MODULES (Admin Only)
        // -------------------------------------------------------------------------
        {
            title: 'Governance Dashboard',
            path: '/admin',
            icon: <LayoutDashboard size={20} />,
            roles: ['admin']
        },
        {
            title: 'User Management',
            path: '/admin/users',
            icon: <Users size={20} />,
            roles: ['admin']
        },
        {
            title: 'Break-Glass',
            path: '/admin/break-glass',
            icon: <Siren size={20} />,
            roles: ['admin']
        },
        {
            title: 'Audit Logs',
            path: '/admin/audit-logs',
            icon: <FileText size={20} />,
            roles: ['admin']
        },
        {
            title: 'Revenue Anomalies',
            path: '/admin/revenue-anomalies',
            icon: <Banknote size={20} />,
            roles: ['admin']
        },
        {
            title: 'Incidents',
            path: '/admin/incidents',
            icon: <ShieldCheck size={20} />,
            roles: ['admin']
        },
        {
            title: 'Compliance',
            path: '/admin/compliance',
            icon: <ClipboardList size={20} />,
            roles: ['admin']
        },
        {
            title: 'Master Data',
            path: '/admin/master-data',
            icon: <Database size={20} />,
            roles: ['admin']
        },
        {
            title: 'Departments',
            path: '/admin/departments',
            icon: <Menu size={20} />,
            roles: ['admin']
        },
        {
            title: 'System Health',
            path: '/admin/system',
            icon: <Activity size={20} />,
            roles: ['admin']
        },
    ];

    // Filter links
    const filteredNav = allNavItems.filter(item => item.roles.includes(role));

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={toggleSidebar}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                className={`fixed left-0 top-0 bottom-0 z-50 bg-white border-r border-gray-200 w-64 shadow-xl md:shadow-none md:translate-x-0 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 border-b border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white mr-3">
                            <Activity size={18} />
                        </div>
                        <span className="font-bold text-lg text-secondary-dark tracking-tight">HIS Quasar</span>
                        <button onClick={toggleSidebar} className="ml-auto md:hidden text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    {/* User Role Badge */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-gray-100">
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Signed in as</p>
                        <p className="font-semibold text-secondary-dark capitalize">{role.replace('_', ' ')}</p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                        {filteredNav.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/dashboard'} // Only exact match for root dashboard
                                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                                        ? 'bg-primary/10 text-primary shadow-sm'
                                        : 'text-secondary hover:bg-slate-50 hover:text-secondary-dark'
                                    }
                `}
                            >
                                {item.icon}
                                <span>{item.title}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer Info */}
                    <div className="p-4 border-t border-gray-100 text-xs text-center text-gray-400">
                        v1.0.0 • HIS Quasar
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;
