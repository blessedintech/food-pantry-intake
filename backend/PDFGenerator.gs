/**
 * PDFGenerator.gs - Fill Drew's fillable PDF templates using pdf-lib
 * 
 * Field names match the fillable PDF created by the project lead.
 * To update for a new form: read field names with a PDF tool,
 * then update the FIELD_MAP below.
 */

function generatePdfForSelected() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveRange().getRow();
  if (row <= 1) { SpreadsheetApp.getUi().alert('Please select a data row (not the header).'); return; }
  var rowId = sheet.getRange(row, 1).getValue();
  if (!rowId) { SpreadsheetApp.getUi().alert('No Row ID found.'); return; }
  
  var rowData = getRowById(String(rowId));
  if (!rowData) { SpreadsheetApp.getUi().alert('Row not found.'); return; }
  
  // Load fillable PDF template
  var lang = rowData['Language'] || 'en';
  var templateId = (lang === 'es') ? CONFIG.fillablePdfs.es : CONFIG.fillablePdfs.en;
  var templateBase64 = Utilities.base64Encode(DriveApp.getFileById(templateId).getBlob().getBytes());
  
  // Load signature
  var sigBase64 = '';
  if (rowData['Signature File ID']) {
    try {
      sigBase64 = Utilities.base64Encode(DriveApp.getFileById(rowData['Signature File ID']).getBlob().getBytes());
    } catch(e) { Logger.log('Sig error: ' + e); }
  }
  
  // Format date
  var dateStr = '';
  try {
    var d = new Date(rowData['Timestamp']);
    dateStr = (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
  } catch(e) { dateStr = String(rowData['Timestamp']).substring(0,10); }
  
  // Build field values matching the fillable PDF field names
  var textFields = {
    // Page 1 - Intake
    'First Name': rowData['First Name'] || '',
    'Last Name': rowData['Last Name'] || '',
    'Phone Number': rowData['Phone'] || '',
    'City': rowData['City'] || '',
    'State': rowData['State'] || '',
    'Zip Code': rowData['Zip Code'] || '',
    'Email': rowData['Email'] || '',
    'HOUSEHOLD SIZE Total': String(rowData['Household Size'] || ''),
    'HOUSEHOLD SIZE Children': String(rowData['Children'] || ''),
    'HOUSEHOLD SIZE Adults': String(rowData['Adults'] || ''),
    'HOUSEHOLD SIZE Seniors': String(rowData['Seniors'] || ''),
    'How did you hear about us?': rowData['Referral Source'] || '',
    'Info changed since last visit?': rowData['Change Details'] || '',
    // Shutdown text fields
    'Have you been effected by the Government Shutdown - Yes': rowData['Govt Shutdown'] === 'Yes' ? 'X' : '',
    'Effected by Government Shutdown - No': rowData['Govt Shutdown'] === 'No' ? 'X' : '',
    'If yes is it due to the Furlough': rowData['Shutdown Reason'] === 'Furlough' ? 'X' : '',
    'or SNAP Foodstamps': rowData['Shutdown Reason'] === 'SNAP' ? 'X' : '',
    // Page 2 - Income Verification
    'First Name_2': rowData['First Name'] || '',
    'Last Name_2': rowData['Last Name'] || '',
    'Total number of people in the household': String(rowData['Household Size'] || ''),
    'Zip Code you reside in': rowData['Zip Code'] || '',
    'Date': dateStr,
    'Signature1_es_:signer:signature': 'Digitally Signed - ' + (rowData['First Name'] || '') + ' ' + (rowData['Last Name'] || ''),
  };
  
  // Build checkbox values
  var checkboxes = {};
  
  // Unhoused
  if (rowData['Unhoused'] === 'Yes') checkboxes['Unhoused - Yes'] = true;
  if (rowData['Unhoused'] === 'No') checkboxes['Unhoused - No'] = true;
  
  // First Visit
  if (rowData['First Visit'] === 'Yes') checkboxes['First Visit - Yes'] = true;
  if (rowData['First Visit'] === 'No') checkboxes['First Visit - No'] = true;
  
  // Income tier checkboxes: HH1-HH8 x Low/Med/High
  var hhSize = rowData['Household Size'] || 0;
  var tier = rowData['Income Tier'] || '';
  if (hhSize > 0 && tier) {
    var sizeNum = Math.min(hhSize, 8);
    var tierMap = {'60AMI': 'Low', '61ALICE': 'Med', 'AboveALICE': 'High'};
    var tierLabel = tierMap[tier];
    if (tierLabel) {
      checkboxes['HH' + sizeNum + ' ' + tierLabel] = true;
    }
  }
  
  // Race/Ethnicity
  var raceMap = {
    'white_hispanic': 'WhiteHispanic',
    'white_nonhispanic': 'WhiteNonHispanic',
    'black_hispanic': 'BlackAfrican AmericanHispanic',
    'black_nonhispanic': 'BlackAfrican AmericanNonHispanic',
    'asian_hispanic': 'AsianHispanic',
    'asian_nonhispanic': 'AsianNonHispanic',
    'native_american_hispanic': 'American IndianAlaskan NativeHispanic',
    'native_american_nonhispanic': 'American IndianAlaskan NativeNonHispanic',
    'pacific_islander_hispanic': 'Native HawaiianPacific IslanderHispanic',
    'pacific_islander_nonhispanic': 'Native HawaiianPacific IslanderNonHispanic',
    'other_hispanic': 'OtherMultiRacialHispanic',
    'other_nonhispanic': 'OtherMultiRacialNonHispanic',
    'prefer_not': 'Prefer not to answer',
  };
  var raceVal = rowData['Race/Ethnicity'] || '';
  if (raceVal && raceMap[raceVal]) {
    checkboxes[raceMap[raceVal]] = true;
  }
  
  // Head of Household
  if (rowData['62+'] === 'X') checkboxes['62 years or older'] = true;
  if (rowData['Female-Headed'] === 'X') checkboxes['Femaleheaded household'] = true;
  if (rowData['Disabled'] === 'X') checkboxes['Disabled'] = true;
  
  // Store data for the dialog
  PropertiesService.getScriptProperties().setProperty('pdfData', JSON.stringify({
    templateBase64: templateBase64,
    textFields: textFields,
    checkboxes: checkboxes,
    sigBase64: sigBase64,
    rowId: String(rowId),
  }));
  
  var html = HtmlService.createHtmlOutput(getPdfFillerHtml())
    .setWidth(400)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'Generating PDF...');
}

function generateAllMissingPdfs() {
  SpreadsheetApp.getUi().alert('For now, please select each row and generate individually.');
}

function getPdfData() {
  var data = PropertiesService.getScriptProperties().getProperty('pdfData');
  PropertiesService.getScriptProperties().deleteProperty('pdfData');
  return data;
}

function savePdfToFolder(base64Pdf, rowId) {
  var bytes = Utilities.base64Decode(base64Pdf);
  var blob = Utilities.newBlob(bytes, 'application/pdf', 'FORM_' + rowId + '.pdf');
  var folder = DriveApp.getFolderById(CONFIG.pdfFolderId);
  var file = folder.createFile(blob);
  updatePdfReference(rowId, file.getId());
  return file.getUrl();
}

function getPdfFillerHtml() {
  return '<!DOCTYPE html>\
<html><head>\
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"><\/script>\
<style>body{font-family:Arial,sans-serif;padding:20px;text-align:center}#status{margin:20px 0;font-size:14px;color:#333}.spinner{width:40px;height:40px;border:4px solid #ddd;border-top:4px solid #2E8B8B;border-radius:50%;animation:spin 1s linear infinite;margin:20px auto}@keyframes spin{to{transform:rotate(360deg)}}.done{color:#2E7D32;font-weight:bold;font-size:16px}.error{color:#C62828}</style>\
</head><body>\
<div class="spinner" id="spinner"></div>\
<div id="status">Loading template...</div>\
<script>\
async function run() {\
  try {\
    var statusEl = document.getElementById("status");\
    statusEl.textContent = "Loading data...";\
    \
    var raw = await new Promise(function(resolve, reject) {\
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getPdfData();\
    });\
    var data = JSON.parse(raw);\
    \
    statusEl.textContent = "Filling PDF fields...";\
    var pdfBytes = Uint8Array.from(atob(data.templateBase64), function(c){ return c.charCodeAt(0); });\
    var pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);\
    var form = pdfDoc.getForm();\
    \
    /* Fill text fields */\
    for (var fieldName in data.textFields) {\
      try {\
        var field = form.getTextField(fieldName);\
        field.setText(data.textFields[fieldName]);\
      } catch(e) { console.log("Skip text: " + fieldName + " - " + e.message); }\
    }\
    \
    /* Check checkboxes */\
    for (var cbName in data.checkboxes) {\
      if (data.checkboxes[cbName]) {\
        try {\
          var cb = form.getCheckBox(cbName);\
          cb.check();\
        } catch(e) { console.log("Skip checkbox: " + cbName + " - " + e.message); }\
      }\
    }\
    \
    /* Embed signature image on page 2 */\
    if (data.sigBase64) {\
      try {\
        var sigBytes = Uint8Array.from(atob(data.sigBase64), function(c){ return c.charCodeAt(0); });\
        var sigImage = await pdfDoc.embedPng(sigBytes);\
        var pages = pdfDoc.getPages();\
        var page2 = pages[1];\
        page2.drawImage(sigImage, { x: 42, y: 55, width: 200, height: 30 });\
      } catch(e) { console.log("Sig embed error: " + e); }\
    }\
    \
    /* Flatten so fields become permanent */\
    form.flatten();\
    \
    statusEl.textContent = "Saving to Drive...";\
    var filledBytes = await pdfDoc.save();\
    \
    /* Convert to base64 in chunks to avoid stack overflow */\
    var binary = "";\
    var bytes = new Uint8Array(filledBytes);\
    var chunkSize = 8192;\
    for (var i = 0; i < bytes.length; i += chunkSize) {\
      var chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));\
      binary += String.fromCharCode.apply(null, chunk);\
    }\
    var base64 = btoa(binary);\
    \
    var url = await new Promise(function(resolve, reject) {\
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).savePdfToFolder(base64, data.rowId);\
    });\
    \
    document.getElementById("spinner").style.display = "none";\
    statusEl.className = "done";\
    statusEl.textContent = "PDF generated! Check your PDFs folder.";\
    setTimeout(function(){ google.script.host.close(); }, 2000);\
    \
  } catch(e) {\
    document.getElementById("spinner").style.display = "none";\
    document.getElementById("status").className = "error";\
    document.getElementById("status").textContent = "Error: " + e.toString();\
    console.error(e);\
  }\
}\
run();\
<\/script>\
</body></html>';
}
