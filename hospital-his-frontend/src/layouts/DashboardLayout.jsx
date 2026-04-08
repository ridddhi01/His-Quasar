import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

const DashboardLayout = () => {
    const { user } = useSelector((state) => state.auth);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-secondary">
            {/* Sidebar (Fixed width on desktop, overlay on mobile) */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300">

                {/* Sticky Header */}
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

                {/* Page Content Scrollable */}
                <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                    <Outlet />
                </main>

            </div>
        </div>
    );
};

export default DashboardLayout;
