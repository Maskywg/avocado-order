// Google Apps Script — 環湖幸福果 訂單系統
// 1. 建立 Google 試算表
// 2. 延伸功能 → Apps Script → 貼入此程式碼
// 3. 部署 → 新版 → 以本人身份執行 → 任何人皆可存取
// 4. 複製產生的網址，貼到 js/app.js 的 API_URL

const SHEET_NAME = '訂單';
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found' }))
    .setMimeType(ContentService.MimeType.JSON);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const orders = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    try { if (obj.items) obj.items = JSON.parse(obj.items); } catch(e) {}
    try { if (obj.delivery) obj.delivery = JSON.parse(obj.delivery); } catch(e) {}
    return obj;
  });
  const result = JSON.stringify({ orders });
  const callback = e.parameter.callback;
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + result + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // 如果工作表不存在則建立
    if (!sheet) {
      const newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
      newSheet.appendRow(['id', 'userId', 'user', 'items', 'delivery', 'total', 'status', 'createdAt']);
    }

    const row = [
      data.id || '',
      data.userId || '',
      data.user ? JSON.stringify(data.user) : '',
      data.items ? JSON.stringify(data.items) : '',
      data.delivery ? JSON.stringify(data.delivery) : '',
      data.total || 0,
      data.status || 'pending',
      data.createdAt || new Date().toISOString()
    ];
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ success: true, id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
