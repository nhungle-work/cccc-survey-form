// Hướng dẫn cài đặt Google Sheets Webhook cho Form Khảo Sát CCCC:
// 1. Tạo 1 file Google Sheets mới.
// 2. Click "Tiện ích mở rộng" (Extensions) -> "Apps Script".
// 3. Xóa toàn bộ nội dung trong đó và dán đè đoạn code dưới đây vào.
// 4. Bấm "Lưu" (Ctrl+S).
// 5. Bấm "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
// 6. Hình thức: Ứng dụng Web (Web app). 
//    - Thực thi dưới dạng: Tôi (Me). 
//    - Quyền truy cập: Bất kỳ ai (Anyone). <--- QUAN TRỌNG NHẤT
// 7. Click cấp quyền truy cập (nếu Google hỏi, bấm Advanced -> Go to ...).
// 8. Copy "URL Ứng dụng web" và dán vào tab "Tích hợp" trong trang Admin của Form.

function doPost(e) {
    var sheet;
    try {
        sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Sheet not found" }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var data = null;

        // Path 1: JSON body
        if (e.postData && e.postData.contents) {
            try {
                data = JSON.parse(e.postData.contents);
            } catch (err) { }
        }

        // Path 2: Form parameter 'payload' (Form Encoded)
        if (!data && e.parameter && e.parameter.payload) {
            try {
                data = JSON.parse(e.parameter.payload);
            } catch (err) { }
        }

        // Path 3: Direct parameters
        if (!data) {
            data = e.parameter;
        }

        if (!data || Object.keys(data).length === 0) {
            throw new Error("No data received.");
        }

        if (!data.timestamp) data.timestamp = new Date().toISOString();

        const keys = Object.keys(data).filter(k => k !== 'timestamp');
        const allKeys = ['timestamp', ...keys];

        // HEADER AUTO-INIT
        var firstCell = sheet.getRange(1, 1).getValue();
        if (sheet.getLastRow() === 0 || (firstCell !== "Thời gian" && firstCell !== "")) {
            const headers = allKeys.map(k => (k === 'timestamp' ? "Thời gian" : k));

            if (sheet.getLastRow() > 0 && firstCell !== "Thời gian") {
                sheet.insertRowBefore(1);
            }

            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f0f9ff").setFontColor("#00b0f0");
            sheet.setFrozenRows(1);
        }

        // MAP DATA TO HEADERS
        const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const rowData = currentHeaders.map(header => {
            if (header === "Thời gian") return data.timestamp;
            return data[header] !== undefined ? data[header] : "";
        });

        sheet.appendRow(rowData);
        return ContentService.createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        if (sheet) {
            sheet.appendRow(["ERROR LOG", new Date().toISOString(), error.message, JSON.stringify(e || {})]);
        }
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doGet(e) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
        const data = sheet.getDataRange().getValues();

        if (data.length <= 1) {
            return ContentService.createTextOutput(JSON.stringify([]))
                .setMimeType(ContentService.MimeType.JSON);
        }

        const headers = data[0];
        const rows = data.slice(1);

        const jsonData = rows.map(row => {
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = row[i];
            });
            return obj;
        });

        return ContentService.createTextOutput(JSON.stringify(jsonData))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

