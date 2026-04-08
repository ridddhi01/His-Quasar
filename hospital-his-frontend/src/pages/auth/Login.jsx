import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { login, reset } from '../../features/auth/authSlice';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const { email, password } = formData;

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { user, isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.auth
    );

    // Error handling effect
    useEffect(() => {
        if (isError) {
            // toast.error(message);
            dispatch(reset());
        }
    }, [isError, message, dispatch]);

    // Success/Navigation effect
    useEffect(() => {
        if (isSuccess || user) {
            if (user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }
    }, [user, isSuccess, navigate]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (isSuccess) dispatch(reset());
        };
    }, [dispatch, isSuccess]);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        const userData = {
            email,
            password,
        };
        dispatch(login(userData));
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-4xl w-full grid md:grid-cols-2"
            >
                {/* Left Side - Form */}
                <div className="p-12 flex flex-col justify-center">
                    <div className="mb-8">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mb-4">
                            <Activity size={24} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800">Welcome Back</h1>
                        <p className="text-slate-500 mt-2">Please sign in to access your dashboard.</p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={onChange}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="doctor@hospital.com"
                                />
                                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    name="password"
                                    value={password}
                                    onChange={onChange}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            </div>
                        </div>

                        {isError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {message || "Login failed"}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded text-primary focus:ring-primary" />
                                <span className="text-sm text-slate-600">Remember me</span>
                            </label>
                            <a href="#" className="text-sm text-primary font-medium hover:underline">Forgot password?</a>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Right Side - Image/Info */}
                <div className="bg-primary/5 p-12 hidden md:flex flex-col justify-center items-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="mb-8 relative z-10"
                    >
                        <div className="w-64 h-64 bg-white rounded-full shadow-2xl flex items-center justify-center">
                            <img src="https://img.freepik.com/free-vector/doctors-concept-illustration_114360-1515.jpg?w=740&t=st=1709491633~exp=1709492233~hmac=6b93a89e4a8c99f9e5a5a1f5a5a1f5a5a1f5a5a1f5" alt="Login" className="w-48 opacity-80" />
                        </div>
                    </motion.div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure & Compliant</h2>
                        <p className="text-slate-500 max-w-xs mx-auto">Access patient records, manage appointments, and track vitals with bank-grade security.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
