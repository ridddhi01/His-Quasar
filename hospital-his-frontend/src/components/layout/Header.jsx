import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, reset } from '../../features/auth/authSlice';
import { Menu, Bell, User, LogOut, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        dispatch(reset());
        navigate('/login');
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">

            {/* Left: Mobile Toggle & Breadcrumbs/Title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
                >
                    <Menu size={20} />
                </button>

                {/* Placeholder for Breadcrumbs or Page Title */}
                <h2 className="text-lg font-semibold text-secondary-dark hidden md:block">
                    Overview
                </h2>
            </div>

            {/* Center: Global Search (Optional) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search patients, doctors, or records..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-slate-50 focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm"
                />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 md:gap-4">
                {/* Notifications */}
                <button className="relative p-2 rounded-lg text-gray-500 hover:bg-slate-50 hover:text-primary transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-2 p-1.5 pr-3 rounded-full border border-gray-100 hover:bg-slate-50 transition-all"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                            {user?.profile?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-secondary-dark leading-none">
                                {user?.profile?.firstName || user?.username || 'User'}
                            </p>
                            <p className="text-[10px] text-gray-500 leading-none mt-1 uppercase">
                                {user?.role || 'Staff'}
                            </p>
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    <AnimatePresence>
                        {showProfileMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1 z-50"
                            >
                                <div className="px-4 py-3 border-b border-gray-50 md:hidden">
                                    <p className="font-medium text-secondary-dark">{user?.username}</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>

                                <button className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:bg-slate-50 flex items-center gap-2">
                                    <User size={16} /> Profile
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <LogOut size={16} /> Logout
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default Header;
