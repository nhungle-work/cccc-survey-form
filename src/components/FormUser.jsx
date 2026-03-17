import React, { useState, useEffect } from 'react';
import { getFormConfig, getRemoteConfig } from '../utils/config';
import { Send, CheckCircle, HelpCircle, Mail, CloudSync } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import localLogo from '../assets/cccc-logo.png';

const FormUser = () => {
    const [config, setConfig] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [formData, setFormData] = useState({});
    const [otherText, setOtherText] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const loadConfig = async () => {
            // 1. Load local version first
            const currentConfig = getFormConfig();
            setConfig(currentConfig);
            if (currentConfig.header?.title) document.title = currentConfig.header.title;
            if (currentConfig.design) applyDesign(currentConfig.design);

            // 2. Fetch remote version
            // Use the hardcoded webhookUrl from currentConfig (which we just updated)
            const webhookUrl = currentConfig.settings?.webhookUrl;
            if (webhookUrl) {
                try {
                    setIsSyncing(true);
                    const remoteConfig = await getRemoteConfig(webhookUrl);
                    if (remoteConfig && remoteConfig.questions) {
                        setConfig(remoteConfig);
                        if (remoteConfig.header?.title) document.title = remoteConfig.header.title;
                        if (remoteConfig.design) applyDesign(remoteConfig.design);
                    }
                } catch (error) {
                    console.error("Sync error:", error);
                } finally {
                    setIsSyncing(false);
                }
            }
        };

        const applyDesign = (d) => {
            document.documentElement.style.setProperty('--primary', d.primaryColor);
            document.documentElement.style.setProperty('--primary-2', d.primaryColor2 || d.primaryColor);
            document.documentElement.style.setProperty('--secondary', d.secondaryColor);
            document.documentElement.style.setProperty('--secondary-2', d.secondaryColor2 || d.secondaryColor);
            document.documentElement.style.setProperty('--accent', d.accentColor || '#f59e0b');
            document.documentElement.style.setProperty('--accent-2', d.accentColor2 || d.accentColor || '#fbbf24');
            document.documentElement.style.setProperty('--surface', d.surfaceColor || '#f8fbff');
            document.documentElement.style.setProperty('--surface-2', d.surfaceColor2 || d.surfaceColor || '#ffffff');
        };

        loadConfig();
    }, []);

    if (!config) return <div className="min-h-screen flex items-center justify-center bg-[#f3f6fc]">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full"
        />
    </div>;

    const handleInputChange = (e, qId, type) => {
        const { value, checked } = e.target;

        if (errors[qId]) {
            setErrors(prev => ({ ...prev, [qId]: null }));
        }

        if (type === 'checkbox') {
            const currentVals = formData[qId] || [];
            if (checked) {
                setFormData({ ...formData, [qId]: [...currentVals, value] });
            } else {
                setFormData({ ...formData, [qId]: currentVals.filter(v => v !== value) });
            }
        } else {
            setFormData({ ...formData, [qId]: value });
        }
    };

    const handleOtherTextChange = (e, qId) => {
        setOtherText({ ...otherText, [qId]: e.target.value });
        if (errors[qId]) {
            setErrors(prev => ({ ...prev, [qId]: null }));
        }
    };

    const validateForm = () => {
        let newErrors = {};
        let isValid = true;

        config.questions.forEach(q => {
            if (q.required) {
                const val = formData[q.id];

                if (q.type === 'email') {
                    if (!val || !val.includes('@')) {
                        newErrors[q.id] = "Vui lòng nhập email hợp lệ.";
                        isValid = false;
                    }
                }
                else if (q.type.includes('checkbox')) {
                    if (!val || val.length === 0) {
                        newErrors[q.id] = "Vui lòng chọn ít nhất một lựa chọn.";
                        isValid = false;
                    }
                }
                else {
                    if (!val || val.trim() === '') {
                        newErrors[q.id] = "Câu hỏi này là bắt buộc.";
                        isValid = false;
                    }
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            const firstErrorId = Object.keys(errors)[0];
            const element = document.getElementById(firstErrorId);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setIsSubmitting(true);

        const payload = {
            timestamp: new Date().toISOString(),
        };

        config.questions.forEach(q => {
            let answer = formData[q.id];
            // Strip markdown, newlines and extra spaces from title for clean Google Sheet header
            const cleanTitle = q.title
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Remove [Link](url)
                .replace(/\n/g, ' ')
                .trim();

            if (q.type === 'radio_with_link') {
                if (answer === 'other') {
                    payload[cleanTitle] = otherText[q.id] || "";
                } else {
                    const option = q.options?.find(o => o.value === answer);
                    payload[cleanTitle] = option ? (option.label || answer) : (answer || "");
                }
            } else if (q.type.includes('other')) {
                if (q.type.includes('checkbox')) {
                    const ansArray = [...(answer || [])];
                    if (ansArray.includes('Other') && otherText[q.id]) {
                        const index = ansArray.indexOf('Other');
                        ansArray[index] = `Khác: ${otherText[q.id]}`;
                    }
                    payload[cleanTitle] = ansArray.join('; ');
                } else if (q.type.includes('radio')) {
                    if (answer === 'Other' && otherText[q.id]) {
                        payload[cleanTitle] = `Khác: ${otherText[q.id]}`;
                    } else {
                        payload[cleanTitle] = answer || "";
                    }
                }
            } else {
                payload[cleanTitle] = Array.isArray(answer) ? answer.join('; ') : (answer || "");
            }
        });

        try {
            console.log("--- BẮT ĐẦU GỬI FORM (v4) ---");
            console.log("Webhook URL:", config.settings?.webhookUrl);
            console.log("Dữ liệu gửi đi:", payload);

            if (config.settings?.webhookUrl) {
                // SỬ DỤNG FORM-ENCODED ĐỂ TỐI ƯU CORS
                const formDataBody = new URLSearchParams();
                formDataBody.append("payload", JSON.stringify(payload));

                await fetch(config.settings.webhookUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formDataBody.toString()
                });
                console.log("GỬI THÀNH CÔNG (v4). Hãy kiểm tra Google Sheets ngay.");
            } else {
                console.log("Mock Submit Data (Không có Webhook):", payload);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            setIsSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error("LỖI KHI GỬI:", error);
            alert("Đã xảy ra lỗi khi gửi. Hãy kiểm tra kết nối mạng và xem console log (F12).");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen p-4 flex items-center justify-center flex-col bg-[#f0f9ff]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-xl w-full glass-panel p-10 text-center shadow-2xl"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
                    >
                        <CheckCircle size={80} className="mx-auto mb-6 text-success" />
                    </motion.div>
                    <h2 className="text-3xl font-bold mb-4 text-gradient">Cảm ơn Anh/Chị!</h2>
                    <p className="text-light text-xl leading-relaxed">
                        Thông tin của Anh/Chị đã được ghi nhận. CCCC sẽ sớm cập nhật các chương trình tiếp theo tới Anh/Chị qua email.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary mx-auto mt-12"
                        onClick={() => {
                            setIsSubmitted(false);
                            setFormData({});
                            setOtherText({});
                        }}
                    >
                        Gửi thêm câu trả lời
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative pb-20 font-montserrat">
            {/* Syncing Indicator (Floating Badge) */}
            <AnimatePresence>
                {isSyncing && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 10, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
                    >
                        <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-blue-100 flex items-center gap-3">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                className="text-[var(--primary)]"
                            >
                                <CloudSync size={20} />
                            </motion.div>
                            <span className="text-sm font-black text-gray-800 uppercase tracking-widest">Đang cập nhật câu hỏi...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dynamic Mesh Background */}
            <div className="brand-bg"></div>

            {/* Header Banner */}
            {config.header.backgroundImage && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-80 md:h-[450px] bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${config.header.backgroundImage})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-black/30"></div>
                </motion.div>
            )}

            <div className={`max-w-3xl mx-auto px-4 relative z-10 ${config.header.backgroundImage ? '-mt-24 md:-mt-48' : 'pt-6 md:pt-12'}`}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:gap-8">

                    {/* Header Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel p-6 md:p-12 border-t-[8px] md:border-t-[10px] border-t-[var(--primary)] shadow-2xl"
                    >
                        <AnimatePresence>
                            {config.design.logoUrl && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', width: '100%' }}
                                >
                                    <img
                                        src={config.design.logoUrl || localLogo}
                                        alt="Logo"
                                        style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'contain' }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <h1 className="text-2xl md:text-4xl font-black mb-4 md:mb-6 text-gray-800 leading-tight">
                            {config.header.title}
                        </h1>
                        <div className="text-gray-600 text-base md:text-lg leading-relaxed mt-4 md:mt-5">
                            {config.header.description?.split(/\\n|\n/).map((item, key) => {
                                // Nếu là dòng trống (user cố tình enter 2 lần để cách dòng), giữ chiều cao để tạo blank line
                                if (item.trim() === '') return <div key={key} className="h-4"></div>;
                                return (
                                    <p key={key} className="mb-2" dangerouslySetInnerHTML={{
                                        __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                                    }}>
                                    </p>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Questions List */}
                    <AnimatePresence>
                        {config.questions.map((q, index) => {
                            const isError = !!errors[q.id];

                            return (
                                <motion.div
                                    key={q.id}
                                    id={q.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`glass-panel p-6 md:p-10 transition-all duration-300 ${isError ? 'ring-2 ring-[var(--error)] bg-red-50/10' : 'hover:shadow-xl'}`}
                                >
                                    <h3 className="text-lg md:text-xl font-bold mb-6 md:mb-10 pb-2 text-gray-800 flex flex-wrap gap-2">
                                        <span className="text-[var(--primary)] opacity-50">{index + 1}.</span>
                                        <span dangerouslySetInnerHTML={{
                                            __html: q.title.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>')
                                        }} /> {q.required && <span className="text-error font-black">*</span>}
                                    </h3>

                                    {q.description && q.id !== 'q6' && (
                                        <p className="text-base text-light mb-8 -mt-4 bg-gray-50 p-3 rounded-lg border-l-4 border-gray-200">{q.description}</p>
                                    )}

                                    {/* Question Rendering */}
                                    <div className="space-y-3">
                                        {/* 1. Checkbox */}
                                        {(q.type === 'checkbox' || q.type === 'checkbox_with_other') && (
                                            <div className="flex flex-col">
                                                {q.options.map(opt => (
                                                    <label key={opt} className="custom-control group">
                                                        <input
                                                            type="checkbox"
                                                            checked={(formData[q.id] || []).includes(opt)}
                                                            onChange={(e) => handleInputChange(e, q.id, 'checkbox')}
                                                            value={opt}
                                                        />
                                                        <span className="group-hover:translate-x-1 transition-transform">{opt}</span>
                                                    </label>
                                                ))}
                                                {q.type.includes('other') && (
                                                    <div className="flex flex-col mt-2">
                                                        <label className="custom-control group">
                                                            <input
                                                                type="checkbox"
                                                                checked={(formData[q.id] || []).includes("Other")}
                                                                onChange={(e) => handleInputChange(e, q.id, 'checkbox')}
                                                                value="Other"
                                                            />
                                                            <span>{q.otherLabel || "Lựa chọn khác:"}</span>
                                                        </label>
                                                        <AnimatePresence>
                                                            {(formData[q.id] || []).includes("Other") && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="ml-10 overflow-hidden"
                                                                >
                                                                    <input
                                                                        type="text"
                                                                        className="glass-input mt-2"
                                                                        placeholder="Nhập ý kiến của bạn..."
                                                                        value={otherText[q.id] || ''}
                                                                        onChange={(e) => handleOtherTextChange(e, q.id)}
                                                                        required
                                                                    />
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 2. Radio */}
                                        {(q.type === 'radio' || q.type === 'radio_with_other') && (
                                            <div className="flex flex-col">
                                                {q.options.map(opt => (
                                                    <label key={opt} className="custom-control group">
                                                        <input
                                                            type="radio"
                                                            name={q.id}
                                                            checked={formData[q.id] === opt}
                                                            onChange={(e) => handleInputChange(e, q.id, 'radio')}
                                                            value={opt}
                                                        />
                                                        <span className="group-hover:translate-x-1 transition-transform">{opt}</span>
                                                    </label>
                                                ))}
                                                {q.type.includes('other') && (
                                                    <div className="flex flex-col mt-2">
                                                        <label className="custom-control group">
                                                            <input
                                                                type="radio"
                                                                name={q.id}
                                                                checked={formData[q.id] === "Other"}
                                                                onChange={(e) => handleInputChange(e, q.id, 'radio')}
                                                                value="Other"
                                                            />
                                                            <span>{q.otherLabel || "Khác:"}</span>
                                                        </label>
                                                        <AnimatePresence>
                                                            {formData[q.id] === "Other" && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="ml-10 overflow-hidden"
                                                                >
                                                                    <input
                                                                        type="text"
                                                                        className="glass-input mt-2"
                                                                        placeholder="Vui lòng ghi rõ..."
                                                                        value={otherText[q.id] || ''}
                                                                        onChange={(e) => handleOtherTextChange(e, q.id)}
                                                                        required
                                                                    />
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 3. Textarea */}
                                        {q.type === 'textarea' && (
                                            <textarea
                                                className="glass-input h-40 resize-y"
                                                placeholder={q.placeholder || "Câu trả lời của bạn..."}
                                                value={formData[q.id] || ''}
                                                onChange={(e) => handleInputChange(e, q.id, 'text')}
                                            ></textarea>
                                        )}

                                        {/* 4. Email */}
                                        {q.type === 'email' && (
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="email"
                                                    className="glass-input !pl-12"
                                                    placeholder={q.placeholder || "Email của bạn (vd: abc@gmail.com)"}
                                                    value={formData[q.id] || ''}
                                                    onChange={(e) => handleInputChange(e, q.id, 'email')}
                                                />
                                            </div>
                                        )}

                                        {/* 5. Radio with Link */}
                                        {q.type === 'radio_with_link' && (
                                            <div className="flex flex-col">
                                                {q.options.map(opt => (
                                                    <label key={opt} className="custom-control group">
                                                        <input
                                                            type="radio"
                                                            name={q.id}
                                                            checked={formData[q.id] === opt}
                                                            onChange={(e) => handleInputChange(e, q.id, 'radio')}
                                                            value={opt}
                                                        />
                                                        <span>{opt}</span>
                                                    </label>
                                                ))}
                                                <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex flex-col md:flex-row gap-6 items-center">
                                                    <div className="flex-1 text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
                                                        <HelpCircle size={18} /> Theo dõi CCCC tại:
                                                    </div>
                                                    <div className="flex gap-4">
                                                        {q.links?.map(link => (
                                                            <motion.a
                                                                key={link.label}
                                                                href={link.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                whileHover={{ scale: 1.1 }}
                                                                className="px-4 py-2 bg-white rounded-lg shadow-sm text-[var(--primary)] font-bold text-sm hover:shadow-md transition-all"
                                                            >
                                                                {link.label}
                                                            </motion.a>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Error Message */}
                                    <AnimatePresence>
                                        {isError && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="text-error text-sm mt-5 font-bold flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100"
                                            >
                                                <span>⚠️</span> {errors[q.id]}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    <div className="flex flex-col items-center gap-6 mt-10 pb-10">
                        <motion.button
                            type="submit"
                            disabled={isSubmitting}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn-primary min-w-[220px] shadow-2xl h-14 text-lg"
                        >
                            {isSubmitting ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                />
                            ) : (
                                <>Gửi Khảo Sát <Send size={20} /></>
                            )}
                        </motion.button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-xs text-light font-medium uppercase tracking-widest">Bảo mật & Quyền riêng tư</p>
                            <p className="text-xs text-light">Mọi thông tin bạn cung cấp đều được CCCC bảo mật tuyệt đối.</p>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default FormUser;
