const SHEET_ORDERS = '訂單';
const SHEET_MEMBERS = '會員名單';

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function ensureSheet(name, headers) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function doGet(e) {
  const orders = getSheetData(SHEET_ORDERS);
  const members = getSheetData(SHEET_MEMBERS);
  const result = JSON.stringify({ orders, members });
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
    if (data.type === 'member') {
      const sheet = ensureSheet(SHEET_MEMBERS, ['name', 'email', 'password', 'createdAt']);
      sheet.appendRow([data.name, data.email, data.password, data.createdAt || new Date().toISOString()]);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = ensureSheet(SHEET_ORDERS, ['id', 'userId', 'user', 'items', 'delivery', 'total', 'status', 'createdAt']);
    sheet.appendRow([
      data.id || '', data.userId || '', JSON.stringify(data.user||{}),
      JSON.stringify(data.items||[]), JSON.stringify(data.delivery||{}),
      data.total || 0, data.status || 'pending', data.createdAt || new Date().toISOString()
    ]);
    return ContentService.createTextOutput(JSON.stringify({ success: true, id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
