/**
 * PDFGenerator.gs - Overlay data onto actual county form images
 * FINAL - Calibrated positions with adjustment guide
 * 
 * HOW TO FINE-TUNE POSITIONS:
 * Each put(X, Y, ...) call places text at X% from left and Y% from top.
 * If a field is too high, INCREASE its Y value by 0.5-1%.
 * If a field is too low, DECREASE its Y value by 0.5-1%.
 * If a field is too far left, INCREASE its X value.
 * If a field is too far right, DECREASE its X value.
 * Save and regenerate the PDF to see the change.
 */

function generatePdfForSelected() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveRange().getRow();
  if (row <= 1) { SpreadsheetApp.getUi().alert('Please select a data row (not the header).'); return; }
  var rowId = sheet.getRange(row, 1).getValue();
  if (!rowId) { SpreadsheetApp.getUi().alert('No Row ID found.'); return; }
  var url = generatePdf(String(rowId));
  if (url) { SpreadsheetApp.getUi().alert('PDF generated!\n\nCheck your PDFs folder in Drive.'); }
  else { SpreadsheetApp.getUi().alert('PDF generation failed. Check Execution log for details.'); }
}

function generateAllMissingPdfs() {
  var sheet = getDataSheet();
  var data = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && !data[i][34]) { generatePdf(String(data[i][0])); count++; }
  }
  SpreadsheetApp.getUi().alert('Generated ' + count + ' PDF(s).');
}

function generatePdf(rowId) {
  try {
    var rowData = getRowById(rowId);
    if (!rowData) { Logger.log('Record not found: ' + rowId); return null; }
    
    var sigBase64 = '';
    if (rowData['Signature File ID']) {
      try {
        var sigFile = DriveApp.getFileById(rowData['Signature File ID']);
        sigBase64 = Utilities.base64Encode(sigFile.getBlob().getBytes());
      } catch (e) { Logger.log('Could not load signature: ' + e.toString()); }
    }
    
    var lang = rowData['Language'] || 'en';
    var p1Id = (lang === 'es') ? CONFIG.formImages.es_page1 : CONFIG.formImages.en_page1;
    var p2Id = (lang === 'es') ? CONFIG.formImages.es_page2 : CONFIG.formImages.en_page2;
    
    var page1Img = Utilities.base64Encode(DriveApp.getFileById(p1Id).getBlob().getBytes());
    var page2Img = Utilities.base64Encode(DriveApp.getFileById(p2Id).getBlob().getBytes());
    
    var html = buildOverlayPdf(rowData, page1Img, page2Img, sigBase64);
    
    var pdfBlob = Utilities.newBlob(html, 'text/html', 'temp.html')
      .getAs('application/pdf')
      .setName('FORM_' + rowId + '.pdf');
    
    var folder = DriveApp.getFolderById(CONFIG.pdfFolderId);
    var pdfFile = folder.createFile(pdfBlob);
    updatePdfReference(rowId, pdfFile.getId());
    
    Logger.log('PDF created: ' + pdfFile.getUrl());
    return pdfFile.getUrl();
  } catch (e) {
    Logger.log('Error generating PDF: ' + e.toString());
    return null;
  }
}

function formatDate(timestamp) {
  try {
    var d = new Date(timestamp);
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  } catch(e) {
    return String(timestamp).substring(0, 10);
  }
}

function buildOverlayPdf(d, page1Img, page2Img, sigBase64) {
  var v = function(key) { return d[key] || ''; };
  var vn = function(key) { return d[key] || 0; };
  
  // Place text at position: x% from left, y% from top
  var put = function(x, y, text, opts) {
    opts = opts || {};
    var fontSize = opts.fontSize || '11pt';
    var fontWeight = opts.bold ? 'bold' : 'normal';
    var color = opts.color || '#000';
    return '<div style="position:absolute;left:' + x + '%;top:' + y + '%;font-size:' + fontSize + ';font-weight:' + fontWeight + ';font-family:Arial,sans-serif;color:' + color + ';white-space:nowrap">' + text + '</div>';
  };
  
  var check = '<span style="font-size:14pt;font-weight:bold;color:#000">&#10003;</span>';
  var smallCheck = '<span style="font-size:11pt;font-weight:bold;color:#000">&#10003;</span>';
  
  var ynMark = function(val, yesX, yesY, noX, noY) {
    if (val === 'Yes') return put(yesX, yesY, check);
    if (val === 'No') return put(noX, noY, check);
    return '';
  };
  
  var incomeTier = v('Income Tier');
  var hhSize = vn('Household Size');
  var dateStr = formatDate(v('Timestamp'));
  
  // ==========================================
  // PAGE 1 - BLESSED IN TECH INTAKE FORM
  // ==========================================
  var page1Html = ''
    // --- Contact Fields ---
    + put(14.5, 19.5, v('First Name'), {fontSize: '12pt'})    // ADJUST Y: First Name blank line
    + put(55, 19.5, v('Last Name'), {fontSize: '12pt'})        // ADJUST Y: Last Name blank line
    + put(19, 23, v('Phone'), {fontSize: '12pt'})               // ADJUST Y: Phone blank line
    + put(7, 26.5, v('City'), {fontSize: '12pt'})               // ADJUST Y: City blank line
    + put(48, 26.5, v('State'), {fontSize: '12pt'})             // ADJUST Y: State
    + put(65, 26.5, v('Zip Code'), {fontSize: '12pt'})          // ADJUST Y: Zip Code
    + put(9, 30, v('Email'), {fontSize: '12pt'})                 // ADJUST Y: Email blank line
    
    // --- Government Shutdown ---
    + ynMark(v('Govt Shutdown'), 64.5, 35.5, 72, 35.5)          // ADJUST Y: Shutdown Yes/No checks
    + (v('Shutdown Reason') === 'Furlough' ? put(35, 37.5, check) : '')   // ADJUST Y: Furlough check
    + (v('Shutdown Reason') === 'SNAP' ? put(60, 37.5, check) : '')       // ADJUST Y: SNAP check
    
    // --- Household Table (data row below header) ---
    + put(20, 45, String(vn('Household Size')), {fontSize: '13pt', bold: true})  // ADJUST Y: HH size
    + put(43, 45, String(vn('Children')), {fontSize: '13pt'})    // ADJUST Y: Children
    + put(55.5, 45, String(vn('Adults')), {fontSize: '13pt'})    // ADJUST Y: Adults
    + put(68, 45, String(vn('Seniors')), {fontSize: '13pt'})     // ADJUST Y: Seniors
    
    // --- Unhoused ---
    + ynMark(v('Unhoused'), 54, 49.5, 63, 49.5)                  // ADJUST Y: Unhoused Yes/No
    
    // --- Visit Info ---
    + ynMark(v('First Visit'), 36, 54, 44, 54)                    // ADJUST Y: First Visit Yes/No
    + (v('Referral Source') ? put(17, 57.5, v('Referral Source'), {fontSize: '10pt'}) : '')  // ADJUST Y: Referral
    + ynMark(v('Info Changed'), 55, 61, 62, 61)                   // ADJUST Y: Info Changed Yes/No
    + (v('Change Details') ? put(17, 63, v('Change Details'), {fontSize: '10pt'}) : '')      // ADJUST Y: Details
    
    // --- Record ID watermark ---
    + put(35, 96, 'Record: ' + v('Row ID') + ' | Digital', {fontSize: '7pt', color: '#aaa'});
  
  // ==========================================
  // PAGE 2 - COUNTY INCOME VERIFICATION
  // ==========================================
  
  // --- Income Table Row Positions ---
  // Each value is Y% for household sizes 1 through 8+
  // ADJUST: If checkmarks are too high, increase all values. Too low, decrease.
  var incomeRowY = [42.0, 44.4, 46.8, 49.2, 51.6, 54.0, 56.4, 58.8];
  
  // Column X positions for the three income tier checkboxes
  var incomeColX = { '60AMI': 19, '61ALICE': 42, 'AboveALICE': 67 };
  
  var incomeRowIdx = -1;
  if (hhSize >= 1 && hhSize <= 7) incomeRowIdx = hhSize - 1;
  else if (hhSize >= 8) incomeRowIdx = 7;
  
  var incomeCheck = '';
  if (incomeRowIdx >= 0 && incomeTier && incomeColX[incomeTier] !== undefined) {
    incomeCheck = put(incomeColX[incomeTier], incomeRowY[incomeRowIdx], check, {fontSize: '12pt'});
  }
  
  // --- Race/Ethnicity Checkbox Positions ---
  // ADJUST: Increase Y to move down, decrease to move up
  var racePositions = {
    'white_hispanic':              {x: 7.5,  y: 72.5},
    'white_nonhispanic':           {x: 7.5,  y: 74.5},
    'black_hispanic':              {x: 7.5,  y: 76.5},
    'black_nonhispanic':           {x: 7.5,  y: 78.5},
    'other_hispanic':              {x: 7.5,  y: 80.5},
    'asian_hispanic':              {x: 36,   y: 72.5},
    'asian_nonhispanic':           {x: 36,   y: 74.5},
    'native_american_hispanic':    {x: 36,   y: 76.5},
    'native_american_nonhispanic': {x: 36,   y: 78.5},
    'other_nonhispanic':           {x: 36,   y: 80.5},
    'pacific_islander_hispanic':   {x: 64.5, y: 72.5},
    'pacific_islander_nonhispanic':{x: 64.5, y: 74.5},
    'prefer_not':                  {x: 64.5, y: 80.5},
  };
  
  var raceVal = v('Race/Ethnicity');
  var raceCheck = '';
  if (raceVal && racePositions[raceVal]) {
    var rp = racePositions[raceVal];
    raceCheck = put(rp.x, rp.y, smallCheck);
  }
  
  // --- Head of Household Checkboxes ---
  // ADJUST Y: Move all HOH checks together
  var hohY = 85;
  var hohChecks = '';
  if (v('62+') === 'X')            hohChecks += put(41, hohY, smallCheck);         // ADJUST X: 62+ checkbox
  if (v('Female-Headed') === 'X')  hohChecks += put(57, hohY, smallCheck);         // ADJUST X: Female-headed
  if (v('Disabled') === 'X')       hohChecks += put(78, hohY, smallCheck);         // ADJUST X: Disabled
  
  // --- Signature ---
  var sigHtml = '';
  if (sigBase64) {
    sigHtml = '<div style="position:absolute;left:5%;top:93%"><img src="data:image/png;base64,' + sigBase64 + '" style="max-width:240px;max-height:35px"></div>';
  }
  
  var page2Html = ''
    // --- Lines 1-3 ---
    + put(21, 18, v('First Name'), {fontSize: '11pt'})             // ADJUST Y: Line 1 First Name
    + put(56, 18, v('Last Name'), {fontSize: '11pt'})              // ADJUST Y: Line 1 Last Name
    + put(40, 21.5, String(vn('Household Size')), {fontSize: '11pt'})  // ADJUST Y: Line 2 HH count
    + put(27, 24, v('Zip Code'), {fontSize: '11pt'})                    // ADJUST Y: Line 3 Zip
    
    // --- Income, Race, HOH checkmarks ---
    + incomeCheck
    + raceCheck
    + hohChecks
    
    // --- Signature & Date ---
    + sigHtml
    + put(72, 93.5, dateStr, {fontSize: '10pt'})                   // ADJUST Y: Date
    
    // --- Record ID ---
    + put(65, 95.5, 'Record: ' + v('Row ID'), {fontSize: '7pt', color: '#aaa'});
  
  // ==========================================
  // FULL HTML
  // ==========================================
  return '<!DOCTYPE html><html><head><style>'
    + '@page{size:letter;margin:0}'
    + 'body{margin:0;padding:0;font-family:Arial,sans-serif}'
    + '.page{position:relative;width:8.5in;height:11in;overflow:hidden}'
    + '.page img.bg{position:absolute;top:0;left:0;width:100%;height:100%}'
    + '.pb{page-break-before:always}'
    + '</style></head><body>'
    + '<div class="page">'
    + '<img class="bg" src="data:image/jpeg;base64,' + page1Img + '">'
    + page1Html
    + '</div>'
    + '<div class="page pb">'
    + '<img class="bg" src="data:image/jpeg;base64,' + page2Img + '">'
    + page2Html
    + '</div>'
    + '</body></html>';
}