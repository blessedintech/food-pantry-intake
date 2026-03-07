/**
 * SheetManager.gs - Google Sheets operations
 */

// Get the DATA tab
function getDataSheet() {
  var ss = SpreadsheetApp.openById(CONFIG.sheetId);
  return ss.getSheetByName(CONFIG.dataTabName);
}

// Append a row to the DATA tab
function appendRow(rowArray) {
  var sheet = getDataSheet();
  sheet.appendRow(rowArray);
}

// Get a row by Row ID (column A)
function getRowById(rowId) {
  var sheet = getDataSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === rowId) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      row._rowNumber = i + 1; // 1-indexed Sheet row
      return row;
    }
  }
  return null;
}

// Update PDF reference for a row
function updatePdfReference(rowId, pdfFileId) {
  var sheet = getDataSheet();
  var data = sheet.getRange('A:A').getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === rowId) {
      // Column AI = column 35 (1-indexed)
      sheet.getRange(i + 1, 35).setValue(pdfFileId);
      return true;
    }
  }
  return false;
}

/**
 * COLUMN HEADERS - Run this once to set up a new Sheet
 * Go to Apps Script editor > Run > setupSheetHeaders
 */
function setupSheetHeaders() {
  var sheet = getDataSheet();
  
  var headers = [
    'Row ID',           // A
    'Timestamp',        // B
    'Entry Mode',       // C
    'Language',          // D
    'First Name',       // E
    'Last Name',        // F
    'Phone',            // G
    'City',             // H
    'State',            // I
    'Zip Code',         // J
    'Email',            // K
    'Children',         // L
    'Adults',           // M
    'Seniors',          // N
    'Household Size',   // O
    'Govt Shutdown',    // P
    'Shutdown Reason',  // Q
    'Unhoused',         // R
    'Income Tier',      // S
    'Race/Ethnicity',   // T
    '62+',              // U
    'Female-Headed',    // V
    'Disabled',         // W
    'Unemployed',       // X
    'Veteran',          // Y
    'Homeless',         // Z
    'Furloughed',       // AA
    'SNAP',             // AB
    'First Visit',      // AC
    'Referral Source',  // AD
    'Info Changed',     // AE
    'Change Details',   // AF
    'Signature File ID',// AG
    'Signature URL',    // AH
    'PDF File ID',      // AI
    'Site ID',          // AJ
  ];
  
  // Write headers to row 1
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  
  // Format header row
  range.setFontWeight('bold');
  range.setBackground('#1B3A5C');
  range.setFontColor('#FFFFFF');
  range.setWrap(true);
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  Logger.log('Sheet headers created successfully! ' + headers.length + ' columns.');
}
