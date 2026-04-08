import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, ArrowRight, ShieldCheck, Clock,
    Users, Database, FileText, Lock, ChevronRight, CheckCircle, ChevronLeft
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigate } from 'react-router-dom';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function Landing() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [animationStage, setAnimationStage] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        // Animation Sequence
        const timer1 = setTimeout(() => setAnimationStage(1), 500);
        const timer2 = setTimeout(() => setAnimationStage(2), 2500);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary-light selection:text-primary-dark overflow-x-hidden relative">

            {/* Scroll Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-blue-500 z-[60]"
                style={{ scaleX: 0, transformOrigin: "0%" }} // Will be controlled by scroll (simplified here for brevity, usually needs useScroll)
                animate={{ scaleX: isScrolled ? 1 : 0 }}
                transition={{ duration: 0.5 }}
            />

            {/* 1. Navbar (Glassmorphism + Sticky) */}
            <nav
                className={cn(
                    "fixed top-0 w-full z-50 transition-all duration-500 ease-in-out border-b border-transparent",
                    isScrolled
                        ? "bg-white/80 backdrop-blur-xl border-primary/10 shadow-sm py-4"
                        : "bg-transparent py-6"
                )}
            >
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg group-hover:shadow-glow transition-all duration-500">
                            <Activity size={24} className="group-hover:animate-heartbeat" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-secondary-dark group-hover:text-primary transition-colors">
                            HIS Quasar
                        </span>
                    </div>

                    {/* Links */}
                    <div className="hidden md:flex gap-8 text-sm font-medium text-secondary hover:text-secondary-dark">
                        {['About', 'Services', 'Departments', 'Contact'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="relative hover:text-primary transition-colors group">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                            </a>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/login')}
                        className="px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2"
                    >
                        Login Portal
                        <ArrowRight size={16} />
                    </motion.button>
                </div>
            </nav>

            {/* 2. Hero Section (Gradient + Lifeline) */}
            <section className="min-h-screen pt-32 pb-20 w-full flex flex-col justify-center items-center relative overflow-hidden bg-gradient-hero">

                {/* Floating Icons Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <FloatingIcon icon={<Activity size={48} />} delay={0} x="10%" y="20%" />
                    <FloatingIcon icon={<ShieldCheck size={48} />} delay={2} x="85%" y="15%" />
                    <FloatingIcon icon={<Database size={48} />} delay={4} x="75%" y="75%" />
                    <FloatingIcon icon={<Clock size={48} />} delay={1} x="15%" y="80%" />
                </div>

                {/* The Heartbeat Animation - Restored & Enhanced */}
                <div className="w-full max-w-5xl h-64 md:h-80 flex items-center justify-center relative z-10">
                    <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                        <path
                            d="M0,100 L400,100 L415,50 L430,150 L445,100 L460,100 L470,80 L480,120 L490,100 L500,100 L1000,100"
                            fill="none"
                            stroke="#0D9488"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-all duration-[2500ms] ease-out ${animationStage >= 1 ? 'stroke-dash-animate' : 'opacity-0'}`}
                            style={{ strokeDasharray: 1200, strokeDashoffset: animationStage >= 1 ? 0 : 1200, filter: 'drop-shadow(0 0 8px rgba(13, 148, 136, 0.3))' }}
                        />
                    </svg>

                    {/* Revealed Title */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <h1 className={`text-6xl md:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-text opacity-0 transition-all duration-1000 transform ${animationStage >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
                            }`}>
                            HIS Quasar
                        </h1>
                    </div>
                </div>

                {/* Subtitle & CTA (Fade in after title) */}
                <motion.div
                    className={`text-center space-y-8 transition-all duration-1000 delay-500 relative z-10 ${animationStage >= 2 ? 'opacity-100' : 'opacity-0'}`}
                >
                    <p className="text-xl md:text-2xl text-secondary mt-2 max-w-2xl mx-auto font-light leading-relaxed">
                        The reliable backbone of modern healthcare.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="group relative px-8 py-4 bg-gradient-to-r from-primary to-primary-dark rounded-full text-white font-semibold shadow-xl hover:shadow-2xl transition-all hover:translate-y-[-2px]"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Enter System
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </motion.div>

                {/* Wave SVG Bottom */}
                <div className="absolute bottom-0 left-0 w-full leading-none text-white z-20">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full text-white fill-current">
                        <path d="M0 48L48 53.3C96 58.7 192 69.3 288 64C384 58.7 480 37.3 576 32C672 26.7 768 37.3 864 48C960 58.7 1056 69.3 1152 64C1248 58.7 1344 37.3 1392 26.7L1440 16V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V48Z" />
                    </svg>
                </div>
            </section>

            {/* 3. Trust Strip (Infinite Scroll) */}
            <motion.section
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="py-10 bg-[#F1F5F9] border-y border-gray-200 overflow-hidden"
            >
                <div className="flex w-[200%] animate-marquee">
                    {/* Duplicated list for seamless loop */}
                    {[1, 2].map((i) => (
                        <div key={i} className="flex justify-around w-1/2 min-w-[50%] px-10 gap-12 text-slate-600 font-bold text-sm md:text-base tracking-widest uppercase">
                            <span className="flex items-center gap-3"><ShieldCheck size={22} className="text-secondary-dark" /> ISO 27001 Certified</span>
                            <span className="flex items-center gap-3"><Clock size={22} className="text-secondary-dark" /> 99.9% Uptime</span>
                            <span className="flex items-center gap-3"><Lock size={22} className="text-secondary-dark" /> HIPAA Compliant</span>
                            <span className="flex items-center gap-3"><Database size={22} className="text-secondary-dark" /> Secure Records</span>
                            <span className="flex items-center gap-3"><Users size={22} className="text-secondary-dark" /> Multi-Role Access</span>
                        </div>
                    ))}
                </div>
            </motion.section>

            {/* 4. 3D Carousel Departments */}
            <section id="departments" className="py-24 bg-gray-50 overflow-hidden relative">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16 px-6"
                >
                    <h2 className="text-4xl font-bold text-secondary-dark mb-4">Specialized Modules</h2>
                    <p className="text-secondary max-w-xl mx-auto">Tailored interfaces for every department in your hospital.</p>
                </motion.div>

                {/* Carousel Component */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <Carousel3D />
                </motion.div>
            </section>

            {/* 5. Stats Section */}
            <section className="py-20 bg-secondary-dark text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10"
                >
                    <StatItem number="10k+" label="Patients Served" />
                    <StatItem number="500+" label="Doctors" />
                    <StatItem number="99.9%" label="Uptime" />
                    <StatItem number="24/7" label="Support" />
                </motion.div>
            </section>

            {/* 6. Footer */}
            <footer className="bg-white pt-20 pb-10 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-16">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                                <Activity size={18} />
                            </div>
                            <span className="font-bold text-lg text-secondary-dark">HIS Quasar</span>
                        </div>
                        <p className="text-secondary text-sm leading-relaxed">
                            Empowering healthcare institutions with next-generation digital infrastructure.
                        </p>
                    </div>
                    <FooterColumn title="Product" links={['Features', 'Integrations', 'Pricing', 'Changelog']} />
                    <FooterColumn title="Company" links={['About', 'Careers', 'Legal', 'Privacy']} />
                    <FooterColumn title="Connect" links={['Twitter', 'LinkedIn', 'Github', 'Contact']} />
                </div>
                <div className="text-center text-secondary-muted text-xs border-t border-gray-100 pt-8">
                    &copy; 2026 HIS Quasar Inc. All rights reserved.
                </div>
            </footer>

            {/* Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-glow flex items-center justify-center z-50 hover:bg-primary-dark transition-colors"
            >
                <Activity size={24} />
            </motion.button>

        </div>
    );
}

// --- Subcomponents ---

function FloatingIcon({ icon, delay, x, y }) {
    return (
        <motion.div
            className="absolute text-primary/10"
            animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0]
            }}
            transition={{
                duration: 6,
                repeat: Infinity,
                delay: delay,
                ease: "easeInOut"
            }}
            style={{ left: x, top: y }}
        >
            {icon}
        </motion.div>
    );
}

function GlassCard({ title, desc, icon, color, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            whileHover={{ y: -8 }}
            className="bg-white/70 backdrop-blur-lg border border-primary/10 rounded-2xl p-8 shadow-glass hover:shadow-soft-xl transition-all duration-300 group"
        >
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${color} flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-secondary-dark mb-3">{title}</h3>
            <p className="text-secondary text-sm leading-relaxed">{desc}</p>
        </motion.div>
    );
}

function StatItem({ number, label }) {
    return (
        <div className="space-y-2">
            <div className="text-4xl md:text-5xl font-bold text-primary-light">{number}</div>
            <div className="text-white/60 text-sm font-medium uppercase tracking-wider">{label}</div>
        </div>
    );
}

function FooterColumn({ title, links }) {
    return (
        <div>
            <h4 className="font-bold text-secondary-dark mb-4">{title}</h4>
            <ul className="space-y-2">
                {links.map(link => (
                    <li key={link}>
                        <a href="#" className="text-secondary hover:text-primary transition-colors text-sm">{link}</a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Carousel3D() {
    const cards = [
        { title: "OPD", desc: "Out-Patient Department", color: "from-blue-400 to-blue-600" },
        { title: "IPD", desc: "In-Patient Care", color: "from-teal-400 to-teal-600" },
        { title: "Pharmacy", desc: "Inventory & Medicine", color: "from-emerald-400 to-emerald-600" },
        { title: "Billing", desc: "Invoices & Insurance", color: "from-orange-400 to-orange-600" },
        { title: "Pathology", desc: "Lab & Diagnostics", color: "from-purple-400 to-purple-600" },
        { title: "Radiology", desc: "Imaging & Reports", color: "from-indigo-400 to-indigo-600" },
        { title: "Admin", desc: "HR & Analytics", color: "from-rose-400 to-rose-600" },
    ];

    const [active, setActive] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActive(prev => (prev + 1) % cards.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [cards.length]);

    return (
        <div className="relative h-[400px] w-full max-w-6xl mx-auto flex items-center justify-center perspective-[1200px] overflow-visible">
            <AnimatePresence mode="popLayout">
                {cards.map((card, index) => {
                    // Calculate position relative to active
                    const offset = (index - active + cards.length) % cards.length;
                    // We want to show 5 cards: center (0), left (-1, -2), right (1, 2)
                    // Normalize loop indices to range centered around 0: e.g. -2, -1, 0, 1, 2
                    let normOffset = offset;
                    if (offset > cards.length / 2) normOffset -= cards.length;

                    // Only render visible range (-2 to 2)
                    if (Math.abs(normOffset) > 2) return null;

                    const isActive = normOffset === 0;

                    return (
                        <motion.div
                            key={card.title}
                            layout
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{
                                scale: isActive ? 1.1 : 1 - (Math.abs(normOffset) * 0.15),
                                opacity: isActive ? 1 : 1 - (Math.abs(normOffset) * 0.3),
                                x: normOffset * 320, // Increased spacing for bigger cards
                                zIndex: 10 - Math.abs(normOffset),
                                rotateY: normOffset * -10
                            }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="absolute w-[350px] md:w-[400px] h-[280px] p-10 rounded-3xl bg-white/90 backdrop-blur-md border border-white/50 shadow-soft-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white transition-colors"
                            onClick={() => setActive(index)}
                        >
                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${card.color} mb-6 flex items-center justify-center text-white text-3xl font-bold shadow-lg transform group-hover:scale-110 transition-transform`}>
                                {card.title.charAt(0)}
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800 mb-3">{card.title}</h3>
                            <p className="text-slate-500 font-medium text-lg">{card.desc}</p>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

export default Landing;
