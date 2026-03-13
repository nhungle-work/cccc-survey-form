export const defaultFormConfig = {
  header: {
    title: "Khảo sát nhanh: Chủ đề Hỏi đáp cùng Chuyên gia (CCCC)",
    description: "CLB Giám đốc Pháp chế Doanh nghiệp (CCCC) đang chuẩn bị chuỗi chương trình “Hỏi đáp cùng Chuyên gia” dành cho cộng đồng pháp chế doanh nghiệp và các nhà quản lý.\n\nChương trình được tổ chức online, nơi người tham dự có thể gửi câu hỏi trước để chuyên gia chuẩn bị và trao đổi trực tiếp trong phiên Q&A với chuyên gia - các Luật sư tại các công ty luật hàng đầu tại Việt Nam, Giảng viên tại các cơ sở đào tạo ngành Luật, các chuyên gia có nhiều năm kinh nghiệm tư vấn pháp luật.\n\nTrước khi triển khai, CCCC muốn lắng nghe ý kiến của Anh/Chị về chủ đề được quan tâm nhất, đồng thời thu thập một số câu hỏi thực tế từ doanh nghiệp để buổi trao đổi mang tính ứng dụng cao.\n\nKhảo sát này chỉ mất khoảng 1 phút.\n\nCảm ơn Anh/Chị đã dành thời gian chia sẻ!",
    backgroundImage: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=2000",
  },
  questions: [
    {
      id: "q1",
      type: "checkbox_with_other",
      title: "Anh/Chị quan tâm nhất đến chủ đề nào cho phiên Hỏi đáp cùng chuyên gia?",
      required: true,
      options: [
        "Bảo hiểm xã hội (BHXH) & Thuế liên quan đến người lao động",
        "Bảo vệ dữ liệu cá nhân trong doanh nghiệp",
        "Các loại hợp đồng trong doanh nghiệp (soạn thảo, quản lý rủi ro, tranh chấp)"
      ],
      allowOther: true
    },
    {
      id: "q2",
      type: "textarea",
      title: "Nếu được tham dự chương trình, Anh/Chị muốn gửi câu hỏi nào để chuyên gia trực tiếp tư vấn?",
      placeholder: "Câu hỏi của Anh/Chị...",
      required: true,
    },
    {
      id: "q3",
      type: "radio",
      title: "Vị trí công việc của Anh/Chị",
      required: true,
      options: [
        "Tổng Giám đốc / Chủ doanh nghiệp",
        "Trưởng phòng",
        "Nhân viên cấp cao / Chuyên viên",
        "Thực tập sinh",
        "Người làm tự do"
      ]
    },
    {
      id: "q4",
      type: "radio_with_other",
      title: "Lĩnh vực hoạt động của doanh nghiệp Anh/Chị là gì?",
      required: true,
      options: [
        "Sản xuất",
        "Thương mại / Bán lẻ",
        "Dịch vụ",
        "Công nghệ / IT",
        "Tài chính / Ngân hàng",
        "FMCG",
        "Đồ ăn và thức uống (F&B)"
      ],
      allowOther: true
    },
    {
      id: "q5",
      type: "radio_with_link",
      title: "Anh/Chị cho phép CCCC gửi thông tin chương trình qua bản tin pháp luật chứ? (Theo dõi CCCC tại [Facebook](https://www.facebook.com/profile.php?id=61559581396959) hoặc [LinkedIn](https://www.linkedin.com/company/chief-corporate-counsel-club/))",
      required: true,
      options: [
        "Tôi đồng ý",
        "Tôi sẽ theo dõi thông tin qua Facebook/LinkedIn của CCCC"
      ],
      links: [
        { label: "Facebook", url: "https://www.facebook.com/profile.php?id=61559581396959" },
        { label: "LinkedIn", url: "https://www.linkedin.com/company/chief-corporate-counsel-club/?viewAsMember=true" }
      ]
    },
    {
      id: "q6",
      type: "email",
      title: "Email nhận thông tin chương trình",
      placeholder: "Email: _______",
      required: true
    }
  ],
  design: {
    primaryColor: "#00b0f0",
    primaryColor2: "#00e0ff",
    secondaryColor: "#6756ed",
    secondaryColor2: "#8e7cf0",
    accentColor: "#f59e0b",
    accentColor2: "#fbbf24",
    surfaceColor: "#f8fbff",
    surfaceColor2: "#ffffff",
    logoUrl: ""
  },

  settings: {
    webhookUrl: ""
  }
};

export const getFormConfig = () => {
  const saved = localStorage.getItem('cccc_form_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing saved config", e);
    }
  }
  return defaultFormConfig;
};

// NEW: Save to Google Sheets
export const saveRemoteConfig = async (config) => {
  if (!config.settings?.webhookUrl) return { success: false, message: "No Webhook URL" };

  try {
    const formData = new URLSearchParams();
    formData.append("payload", JSON.stringify({
      type: 'save_config',
      config: config
    }));

    await fetch(config.settings.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    // Also save locally as a cached version
    localStorage.setItem('cccc_form_config', JSON.stringify(config));
    return { success: true };
  } catch (err) {
    console.error("Error saving remote config", err);
    return { success: false, message: err.message };
  }
};

// NEW: Get from Google Sheets
export const getRemoteConfig = async (webhookUrl) => {
  if (!webhookUrl) return null;

  try {
    const response = await fetch(`${webhookUrl}?type=get_config`);
    const data = await response.json();
    if (data && data.header) {
      localStorage.setItem('cccc_form_config', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.error("Error fetching remote config", err);
  }
  return null;
};

export const saveFormConfig = (config) => {
  localStorage.setItem('cccc_form_config', JSON.stringify(config));
};
