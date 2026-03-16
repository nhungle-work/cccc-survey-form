import React, { useState, useEffect } from 'react';
import { getFormConfig, saveFormConfig, saveRemoteConfig } from '../utils/config';
import {
    Save, Link as LinkIcon, Settings, Layout, ExternalLink,
    Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Edit3,
    BarChart3, Users, MessageSquare, ArrowUpRight, CheckCircle, Upload
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import localLogo from '../assets/cccc-logo.png';

const AdminPanel = () => {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [saveStatus, setSaveStatus] = useState('');
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [responses, setResponses] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    useEffect(() => {
        try {
            const currentConfig = getFormConfig();
            if (currentConfig) {
                setConfig(currentConfig);
                if (currentConfig.settings?.webhookUrl) {
                    fetchData(currentConfig.settings.webhookUrl);
                }

                // Initial sync of CSS variables
                if (currentConfig.design) {
                    syncDesign(currentConfig.design);
                }
            } else {
                console.warn("No config found in local storage or default.");
                setConfig(null);
            }
        } catch (error) {
            console.error("Error initializing AdminPanel:", error);
            setConfig(null);
        }
    }, []);

    const syncDesign = (design) => {
        document.documentElement.style.setProperty('--primary', design.primaryColor);
        document.documentElement.style.setProperty('--primary-2', design.primaryColor2 || design.primaryColor);
        document.documentElement.style.setProperty('--secondary', design.secondaryColor);
        document.documentElement.style.setProperty('--secondary-2', design.secondaryColor2 || design.secondaryColor);
        document.documentElement.style.setProperty('--accent', design.accentColor || '#f59e0b');
        document.documentElement.style.setProperty('--accent-2', design.accentColor2 || design.accentColor || '#fbbf24');
        document.documentElement.style.setProperty('--surface', design.surfaceColor || '#f8fbff');
        document.documentElement.style.setProperty('--surface-2', design.surfaceColor2 || design.surfaceColor || '#ffffff');
    };

    const fetchData = async (url) => {
        try {
            setIsLoadingData(true);
            const res = await fetch(url);
            const data = await res.json();
            if (Array.isArray(data)) {
                setResponses(data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const downloadExcel = () => {
        if (responses.length === 0) {
            alert("Không có dữ liệu để tải!");
            return;
        }

        // Tạo worksheet từ JSON
        const ws = XLSX.utils.json_to_sheet(responses);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Responses");

        // Xuất file
        XLSX.writeFile(wb, `Khao_sat_CCCC_${new Date().toLocaleDateString()}.xlsx`);
    };

    if (!config) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fbff] flex-col gap-4">
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold font-montserrat tracking-widest uppercase text-xs">Đang tải cấu hình Admin...</p>
        </div>
    );

    const handleChange = (section, field, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleSave = () => {
        saveFormConfig(config);
        syncDesign(config.design); // Sync live
        setSaveStatus('Đã lưu bản nháp!');
        setTimeout(() => setSaveStatus(''), 3000);
    };

    const handlePublish = async () => {
        if (!config.settings?.webhookUrl) {
            alert("Bạn cần dán Link Webhook vào tab 'Tích hợp' trước khi Xuất bản!");
            setActiveTab('integration');
            return;
        }

        try {
            setIsPublishing(true);
            setSaveStatus('Đang xuất bản...');
            const result = await saveRemoteConfig(config);
            if (result.success) {
                setSaveStatus('Đã xuất bản lên Trang chủ! ✨');
                setTimeout(() => setSaveStatus(''), 5000);
            } else {
                alert("Lỗi khi xuất bản: " + result.message);
                setSaveStatus('Lỗi xuất bản');
            }
        } catch (err) {
            alert("Đã xảy ra lỗi hệ thống.");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleUpdateQuestions = (newQuestions) => {
        setConfig(prev => ({
            ...prev,
            questions: newQuestions
        }));
    };

    const addQuestion = () => {
        const newId = `q${Date.now()}`;
        const newQuestion = {
            id: newId,
            type: "radio",
            title: "Câu hỏi mới",
            required: false,
            options: ["Lựa chọn 1", "Lựa chọn 2"]
        };
        const updatedQuestions = [...config.questions, newQuestion];
        handleUpdateQuestions(updatedQuestions);
        setEditingQuestion(newId);
    };

    const deleteQuestion = (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
            handleUpdateQuestions(config.questions.filter(q => q.id !== id));
            if (editingQuestion === id) setEditingQuestion(null);
        }
    };

    const updateQuestionField = (id, field, value) => {
        const updated = config.questions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        );
        handleUpdateQuestions(updated);
    };

    const tabs = [
        { id: 'dashboard', label: 'Tổng quan', icon: <BarChart3 size={18} /> },
        { id: 'general', label: 'Cài đặt Chung', icon: <Settings size={18} /> },
        { id: 'questions', label: 'Câu hỏi', icon: <Layout size={18} /> },
        { id: 'integration', label: 'Tích hợp', icon: <LinkIcon size={18} /> }
    ];

    const questionTypes = [
        { id: 'radio', label: 'Trắc nghiệm (Một lựa chọn)' },
        { id: 'radio_with_other', label: 'Trắc nghiệm (Có Khác)' },
        { id: 'checkbox', label: 'Checklist (Nhiều lựa chọn)' },
        { id: 'checkbox_with_other', label: 'Checklist (Có Khác)' },
        { id: 'textarea', label: 'Đoạn văn' },
        { id: 'email', label: 'Email' },
        { id: 'radio_with_link', label: 'Radio có Link' }
    ];

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('design', 'logoUrl', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const stats = [
        { label: 'Số phản hồi', value: isLoadingData ? '...' : responses.length, icon: <MessageSquare size={20} className="text-blue-500" />, trend: 'Dữ liệu thực tế' },
        { label: 'Trạng thái', value: 'Live', icon: <Users size={20} className="text-purple-500" />, trend: 'Đang nhận phản hồi' },
        { label: 'Câu hỏi kích hoạt', value: config.questions.length, icon: <Layout size={20} className="text-orange-500" />, trend: 'Đang hoạt động' }
    ];

    return (
        <div className="min-h-screen bg-[#f8fbff] flex flex-col md:flex-row font-montserrat">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-white shadow-2xl flex flex-col z-20">
                <div className="p-8 border-b border-gray-100">
                    <h1 className="text-2xl font-black text-gradient italic tracking-tighter">CCCC ADMIN</h1>
                    <a href="/" target="_blank" className="text-xs font-bold text-gray-400 hover:text-[var(--primary)] mt-3 flex items-center gap-2 transition-all uppercase tracking-widest">
                        Xem trang khảo sát <ExternalLink size={12} />
                    </a>
                </div>
                <div className="flex-1 py-8 px-4 flex flex-col gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-6 py-4 flex items-center gap-4 rounded-xl transition-all ${activeTab === tab.id
                                ? 'bg-[var(--primary)] text-white font-bold shadow-lg shadow-blue-200'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 md:p-12 overflow-y-auto">
                <div className="max-w-5xl mx-auto">

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-between items-center mb-12"
                    >
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </h2>
                            <p className="text-gray-500 mt-1 font-medium italic">Quản lý và theo dõi hiệu quả khảo sát</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <AnimatePresence>
                                {saveStatus && (
                                    <motion.span
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="text-success font-bold flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-100"
                                    >
                                        ✨ {saveStatus}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            <button
                                onClick={handleSave}
                                className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                            >
                                <Edit3 size={18} /> Lưu Bản Nháp
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing}
                                className="btn-primary shadow-xl shadow-blue-200 flex items-center gap-2"
                            >
                                {isPublishing ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <ArrowUpRight size={18} />
                                )}
                                {isPublishing ? 'Đang gửi...' : 'Xuất bản Trang chủ'}
                            </button>
                        </div>
                    </motion.div>

                    <div className="animate-fade-in">
                        {activeTab === 'dashboard' && (
                            <div className="flex flex-col gap-10">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {stats.map((s, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="glass-panel p-8 flex flex-col gap-4 hover:scale-[1.02] transition-transform duration-300"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-gray-50 rounded-2xl">{s.icon}</div>
                                                <div className="text-[10px] font-bold text-success uppercase bg-green-50 px-2 py-1 rounded">Mới</div>
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black text-gray-800">{s.value}</h3>
                                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-500 italic">{s.trend}</span>
                                                <ArrowUpRight size={14} className="text-success" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="glass-panel p-10">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                        <div>
                                            <h3 className="text-xl font-bold flex items-center gap-2">
                                                <BarChart3 size={20} className="text-[var(--primary)]" /> Thống kê Phản hồi
                                            </h3>
                                            <p className="text-xs text-gray-400 font-medium italic mt-1">Lấy dữ liệu trực tiếp từ Google Sheets</p>
                                        </div>
                                        <button
                                            onClick={downloadExcel}
                                            disabled={isLoadingData || responses.length === 0}
                                            className="btn-primary !bg-green-600 hover:!bg-green-700 shadow-xl shadow-green-100 flex items-center gap-2"
                                        >
                                            <Save size={18} /> Tải File Excel (.xlsx)
                                        </button>
                                    </div>
                                    <div className="h-64 w-full bg-blue-50/30 rounded-3xl border-2 border-dashed border-blue-100 flex flex-col items-center justify-center p-8 text-center">
                                        {isLoadingData ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
                                            </div>
                                        ) : responses.length > 0 ? (
                                            <>
                                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-4">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <p className="text-gray-800 font-black text-xl mb-1">{responses.length} Phản hồi đã sẵn sàng</p>
                                                <p className="text-gray-400 font-medium text-sm">Bấm nút bên trên để tải toàn bộ danh sách chi tiết</p>
                                            </>
                                        ) : (
                                            <p className="text-gray-400 font-bold italic uppercase tracking-widest">Chưa có dữ liệu phản hồi nào...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="glass-panel p-10 flex flex-col gap-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="flex flex-col gap-6">
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-[2px]">Tiêu đề Form</label>
                                            <input
                                                type="text"
                                                className="glass-input !bg-white"
                                                value={config.header.title || ''}
                                                onChange={(e) => handleChange('header', 'title', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-[2px]">Mô tả Giới thiệu</label>
                                            <textarea
                                                className="glass-input h-64 !bg-white resize-y leading-relaxed"
                                                value={config.header.description || ''}
                                                onChange={(e) => handleChange('header', 'description', e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-[2px]">Hình nền Banner (URL - Option 1)</label>
                                        <input
                                            type="text"
                                            className="glass-input !bg-white"
                                            placeholder="https://images.unsplash.com/..."
                                            value={config.header.backgroundImage || ''}
                                            onChange={(e) => handleChange('header', 'backgroundImage', e.target.value)}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2 italic">Nếu trống, hệ thống sẽ tự động dùng "Brand Mesh Background".</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-3 uppercase tracking-[2px]">Logo Thương Hiệu</label>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex gap-4">
                                                <input
                                                    type="text"
                                                    className="glass-input !bg-white flex-1"
                                                    placeholder="Dán link ảnh tại đây..."
                                                    value={config.design.logoUrl || ''}
                                                    onChange={(e) => handleChange('design', 'logoUrl', e.target.value)}
                                                />
                                                <label className="btn-primary !px-6 cursor-pointer whitespace-nowrap">
                                                    <Upload size={18} /> Tải ảnh lên
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic">Hệ thống hỗ trợ cả Link trực tiếp và tải ảnh từ máy tính.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-10">
                                    <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100/50 flex flex-col gap-8">
                                        {[
                                            { label: 'Màu Chủ đạo', key1: 'primaryColor', key2: 'primaryColor2' },
                                            { label: 'Màu Nhấn', key1: 'secondaryColor', key2: 'secondaryColor2' },
                                            { label: 'Màu Phụ (Accent)', key1: 'accentColor', key2: 'accentColor2' },
                                            { label: 'Màu Nền (Surface)', key1: 'surfaceColor', key2: 'surfaceColor2' }
                                        ].map((item) => (
                                            <div key={item.key1} className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-white rounded-2xl shadow-sm">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-wider">{item.label}</label>
                                                    <div className="flex flex-wrap gap-4">
                                                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 border-none rounded-lg cursor-pointer bg-transparent"
                                                                value={config.design[item.key1] || '#000000'}
                                                                onChange={(e) => handleChange('design', item.key1, e.target.value)}
                                                            />
                                                            <input
                                                                type="text"
                                                                className="w-24 bg-transparent border-none font-mono text-xs font-bold text-gray-600 focus:ring-0"
                                                                value={config.design[item.key1] || '#000000'}
                                                                onChange={(e) => handleChange('design', item.key1, e.target.value)}
                                                                placeholder="#HEX"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 text-gray-300">
                                                            <ArrowUpRight size={14} className="rotate-45" />
                                                        </div>
                                                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                            <input
                                                                type="color"
                                                                className="h-10 w-10 border-none rounded-lg cursor-pointer bg-transparent"
                                                                value={config.design[item.key2] || config.design[item.key1]}
                                                                onChange={(e) => handleChange('design', item.key2, e.target.value)}
                                                            />
                                                            <input
                                                                type="text"
                                                                className="w-24 bg-transparent border-none font-mono text-xs font-bold text-gray-600 focus:ring-0"
                                                                value={config.design[item.key2] || config.design[item.key1]}
                                                                onChange={(e) => handleChange('design', item.key2, e.target.value)}
                                                                placeholder="#HEX"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-full md:w-32 h-16 rounded-xl border-4 border-white shadow-inner flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-tighter"
                                                    style={{ background: `linear-gradient(135deg, ${config.design[item.key1]}, ${config.design[item.key2] || config.design[item.key1]})` }}>
                                                    Preview
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {config.header.backgroundImage && (
                                        <div className="rounded-3xl overflow-hidden shadow-2xl border-8 border-white group relative">
                                            <img
                                                src={config.header.backgroundImage}
                                                alt="Preview"
                                                className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                        </div>
                                    )}
                                        <div className="p-6 bg-white rounded-3xl border border-gray-100 flex items-center justify-center">
                                            <img src={config.design.logoUrl || localLogo} alt="Logo Preview" className="max-h-24 object-contain" />
                                        </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'questions' && (
                            <div className="flex flex-col gap-8">
                                <div className="glass-panel p-6 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[var(--primary)] font-bold">
                                            {config.questions.length}
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 uppercase tracking-widest text-xs">Cấu trúc câu hỏi</p>
                                            <p className="text-xs text-gray-400 italic">Kéo thả để sắp xếp lại thứ tự</p>
                                        </div>
                                    </div>
                                    <button onClick={addQuestion} className="btn-primary shadow-lg !py-3">
                                        <Plus size={18} /> Thêm Câu Hỏi Mới
                                    </button>
                                </div>

                                <Reorder.Group axis="y" values={config.questions} onReorder={handleUpdateQuestions} className="flex flex-col gap-4">
                                    {config.questions.map((q) => (
                                        <Reorder.Item key={q.id} value={q}>
                                            <div className={`glass-panel overflow-hidden transition-all duration-300 ${editingQuestion === q.id ? 'ring-2 ring-[var(--primary)] shadow-2xl -translate-y-1' : 'hover:shadow-lg hover:-translate-y-0.5'}`}>
                                                <div className="p-6 flex items-center justify-between">
                                                    <div className="flex items-center gap-6 flex-1">
                                                        <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                                                            <GripVertical size={24} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-black text-gray-800 text-lg line-clamp-1">{q.title}</p>
                                                            <div className="flex gap-3 mt-2">
                                                                <span className="badge badge-primary !px-3">{q.type}</span>
                                                                {q.required && <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 px-3 py-1 rounded-full">Bắt buộc</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setEditingQuestion(editingQuestion === q.id ? null : q.id)}
                                                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-[var(--primary)] hover:text-white transition-all shadow-sm"
                                                        >
                                                            {editingQuestion === q.id ? <ChevronUp size={20} /> : <Edit3 size={18} />}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                                                            className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {editingQuestion === q.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="px-10 pb-10 border-t border-gray-50 pt-8 flex flex-col gap-8 bg-gray-50/20"
                                                        >
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-[2px]">Nội dung câu hỏi</label>
                                                                <input
                                                                    type="text"
                                                                    className="glass-input !bg-white"
                                                                    value={q.title}
                                                                    onChange={(e) => updateQuestionField(q.id, 'title', e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-8">
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-[2px]">Loại định dạng</label>
                                                                    <select
                                                                        className="glass-input !bg-white"
                                                                        value={q.type}
                                                                        onChange={(e) => updateQuestionField(q.id, 'type', e.target.value)}
                                                                    >
                                                                        {questionTypes.map(t => (
                                                                            <option key={t.id} value={t.id}>{t.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="flex items-end flex-col justify-end">
                                                                    <label className="custom-control !m-0 !p-3 hover:bg-white !rounded-xl bg-white shadow-sm border border-gray-100 flex-row-reverse w-full justify-between">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={q.required}
                                                                            onChange={(e) => updateQuestionField(q.id, 'required', e.target.checked)}
                                                                        />
                                                                        <span className="text-sm font-black text-gray-700 uppercase tracking-widest">Bắt buộc nhập</span>
                                                                    </label>
                                                                </div>
                                                            </div>

                                                            {(q.type.includes('radio') || q.type.includes('checkbox')) && (
                                                                <div className="bg-white/50 p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                                    <label className="block text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">Danh sách lựa chọn</label>
                                                                    <div className="flex flex-col gap-3">
                                                                        {q.options.map((opt, idx) => (
                                                                            <motion.div
                                                                                key={idx}
                                                                                initial={{ opacity: 0, x: -10 }}
                                                                                animate={{ opacity: 1, x: 0 }}
                                                                                className="flex gap-4 items-center"
                                                                            >
                                                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400">{idx + 1}</div>
                                                                                <input
                                                                                    type="text"
                                                                                    className="glass-input !bg-white !py-2 text-sm flex-1 font-medium"
                                                                                    value={opt}
                                                                                    onChange={(e) => {
                                                                                        const newOpts = [...q.options];
                                                                                        newOpts[idx] = e.target.value;
                                                                                        updateQuestionField(q.id, 'options', newOpts);
                                                                                    }}
                                                                                />
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newOpts = q.options.filter((_, i) => i !== idx);
                                                                                        updateQuestionField(q.id, 'options', newOpts);
                                                                                    }}
                                                                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-red-300 hover:bg-red-50 hover:text-red-500 transition-all"
                                                                                >
                                                                                    <Trash2 size={16} />
                                                                                </button>
                                                                            </motion.div>
                                                                        ))}

                                                                        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50 md:flex-row flex-col">
                                                                            <button
                                                                                onClick={() => {
                                                                                    updateQuestionField(q.id, 'options', [...q.options, `Lựa chọn mới ${q.options.length + 1} `]);
                                                                                }}
                                                                                className="flex-1 py-3 px-6 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 font-bold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2"
                                                                            >
                                                                                <Plus size={16} /> Thêm lựa chọn
                                                                            </button>

                                                                            {(q.type.includes('other')) && (
                                                                                <label className="flex-1 flex items-center gap-4 px-6 py-3 rounded-xl bg-blue-50/50 border border-blue-100 cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="w-5 h-5 accent-[var(--primary)]"
                                                                                        checked={q.allowOther}
                                                                                        onChange={(e) => updateQuestionField(q.id, 'allowOther', e.target.checked)}
                                                                                    />
                                                                                    <span className="text-xs font-bold text-blue-800 uppercase italic">Cho phép "Khác"</span>
                                                                                </label>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>
                            </div>
                        )}

                        {activeTab === 'integration' && (
                            <div className="flex flex-col gap-10">
                                <div className="glass-panel p-10 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 bg-[var(--primary)] rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                                            <LinkIcon size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Cấu hình Google Sheets</h3>
                                            <p className="text-sm font-medium text-gray-400 italic">Đồng bộ dữ liệu thời gian thực</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-[var(--primary)] flex items-center justify-center text-xs font-black">1</div>
                                                <p className="text-sm text-gray-600 leading-relaxed font-medium">Tạo <strong>Google Sheets</strong> mới (Dạng Public Link).</p>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-[var(--primary)] flex items-center justify-center text-xs font-black">2</div>
                                                <p className="text-sm text-gray-600 leading-relaxed font-medium">Mở <strong>Extensions</strong> {'->'} <strong>Apps Script</strong>.</p>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-[var(--primary)] flex items-center justify-center text-xs font-black">3</div>
                                                <p className="text-sm text-gray-600 leading-relaxed font-medium">Copy mã script trong project và dán vào Apps Script.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-[var(--primary)] flex items-center justify-center text-xs font-black">4</div>
                                                <p className="text-sm text-gray-600 leading-relaxed font-medium"><strong>Triển khai (Deploy)</strong> {'->'} New deployment chọn Web app.</p>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-[var(--primary)] flex items-center justify-center text-xs font-black">5</div>
                                                <p className="text-sm text-gray-600 leading-relaxed font-medium">Set <strong>Anyone</strong> có quyền truy cập và deploy.</p>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-[var(--primary)] flex items-center justify-center text-xs font-black">6</div>
                                                <p className="text-sm text-gray-600 leading-relaxed font-medium">Sao chép URL Web App và dán vào ô bên dưới.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-panel p-10 flex flex-col gap-6">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-[2px]">Mã Webhook kết nối</label>
                                    <div className="flex gap-4 md:flex-row flex-col">
                                        <input
                                            type="url"
                                            className="glass-input !bg-gray-50 flex-1 font-mono text-sm"
                                            placeholder="https://script.google.com/macros/s/..."
                                            value={config.settings.webhookUrl || ''}
                                            onChange={(e) => handleChange('settings', 'webhookUrl', e.target.value)}
                                        />
                                        <button
                                            className="btn-primary !px-10 shadow-lg"
                                            onClick={async () => {
                                                if (!config.settings.webhookUrl) return alert('Vui lòng nhập URL!');
                                                try {
                                                    setSaveStatus('Đang Test...');
                                                    const res = await fetch(config.settings.webhookUrl);
                                                    const text = await res.text();
                                                    alert('Kết nối thành công! Google phản hồi: ' + text);
                                                } catch (e) {
                                                    alert('Lỗi kết nối! Kiểm tra URL hoặc cài đặt CORS trong Apps Script.');
                                                } finally {
                                                    setSaveStatus('');
                                                }
                                            }}
                                        >
                                            Gửi Test Connection
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">Dữ liệu sẽ được gửi dưới dạng JSON POST payload.</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
