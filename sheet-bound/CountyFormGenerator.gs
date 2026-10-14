// ============================================================
// County Intake Form Generator (Direct .docx, Full Branding)
// ============================================================
// SETUP:
//   1. Upload INTAKE FORM FY25.docx to Google Drive (as-is)
//   2. Get file ID from: drive.google.com/file/d/THIS_PART/view
//   3. Set TEMPLATE_FILE_ID and OUTPUT_FOLDER_ID below
// ============================================================

var TEMPLATE_FILE_ID = 'PASTE_COUNTY_DOCX_TEMPLATE_FILE_ID';
var OUTPUT_FOLDER_ID = 'PASTE_REPORT_OUTPUT_FOLDER_ID';
var ROWS_PER_PAGE = 16;

var COL = {
  ROW_ID:0, TIMESTAMP:1, ENTRY_MODE:2, LANGUAGE:3,
  FIRST_NAME:4, LAST_NAME:5, PHONE:6, CITY:7, STATE:8,
  ZIP:9, EMAIL:10, CHILDREN:11, ADULTS:12, SENIORS:13,
  HH_SIZE:14, GOVT_SHUTDOWN:15, SHUTDOWN_REASON:16,
  UNHOUSED:17, INCOME_TIER:18, RACE_ETHNICITY:19,
  HOH_62PLUS:20, HOH_FEMALE:21, HOH_DISABLED:22,
  HOH_UNEMPLOYED:23, HOH_VETERAN:24, HOH_HOMELESS:25,
  HOH_FURLOUGHED:26, HOH_SNAP:27, FIRST_VISIT:28,
  REFERRAL:29, INFO_CHANGED:30, CHANGE_DETAILS:31,
  SIG_FILE_ID:32, SIG_URL:33, PDF_FILE_ID:34, SITE_ID:35
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('County Forms')
    .addItem('Generate County Intake Form (DOCX)...', 'showDatePickerDialog')
    .addItem('Generate Neighbor Intake Database (XLSX)...', 'showXlsxDialog')
    .addSeparator()
    .addItem('Generate DOCX for Today', 'generateForToday')
    .addItem('Generate DOCX for This Month', 'generateForThisMonth')
    .addToUi();
}

function showDatePickerDialog() {
  var html = HtmlService.createHtmlOutput(
    '<style>body{font-family:Arial,sans-serif;padding:16px}label{display:block;margin:8px 0 4px;font-weight:bold;font-size:13px}input{width:100%;padding:6px;box-sizing:border-box;font-size:13px}.btn{background:#1B3A5C;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;font-size:14px;margin-top:12px}.btn:hover{background:#2E8B8B}.note{color:#666;font-size:12px;margin-top:8px}</style>' +
    '<label for="s">Start Date</label><input type="date" id="s"/>' +
    '<label for="e">End Date</label><input type="date" id="e"/>' +
    '<div class="note">Leave End Date blank for a single day.</div><br/>' +
    '<button class="btn" onclick="go()">Generate Form</button>' +
    '<script>var t=new Date().toISOString().split("T")[0];document.getElementById("s").value=t;' +
    'function go(){var s=document.getElementById("s").value,e=document.getElementById("e").value||s;' +
    'if(!s){alert("Pick a date.");return;}var b=document.querySelector(".btn");b.textContent="Generating...";b.disabled=true;' +
    'google.script.run.withSuccessHandler(function(u){if(u){document.body.innerHTML="<p style=\\"font-family:Arial;padding:16px\\">Done! <a href=\\""+u+"\\" target=\\"_blank\\">Download .docx</a></p>";}else{alert("No records for that range.");b.textContent="Generate Form";b.disabled=false;}})' +
    '.withFailureHandler(function(err){alert("Error: "+err.message);b.textContent="Generate Form";b.disabled=false;})' +
    '.generateCountyForm(s,e);}</script>'
  ).setWidth(320).setHeight(280);
  SpreadsheetApp.getUi().showModalDialog(html, 'Generate County Intake Form');
}

function generateForToday() {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var url = generateCountyForm(today, today);
  if (url) SpreadsheetApp.getUi().alert('Done!\n\n' + url);
  else SpreadsheetApp.getUi().alert('No records found for today.');
}

function generateForThisMonth() {
  var now = new Date();
  var first = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth(), 1), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var last = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var url = generateCountyForm(first, last);
  if (url) SpreadsheetApp.getUi().alert('Done!\n\n' + url);
  else SpreadsheetApp.getUi().alert('No records found for this month.');
}

// ============================================================
// MAIN
// ============================================================
function generateCountyForm(startDate, endDate) {
  var countyRows = getFilteredData_(startDate, endDate);
  if (!countyRows || countyRows.length === 0) return null;

  var templateFile = DriveApp.getFileById(TEMPLATE_FILE_ID);
  var templateBlob = templateFile.getBlob();
  templateBlob.setContentType('application/zip');
  var zipEntries = Utilities.unzip(templateBlob);

  var entryMap = {};
  for (var i = 0; i < zipEntries.length; i++) {
    entryMap[zipEntries[i].getName()] = i;
  }

  // ---- FIX HEADERS: Copy branded header2 content over header1 ----
  if (entryMap['word/header2.xml'] !== undefined && entryMap['word/header1.xml'] !== undefined) {
    var h2 = zipEntries[entryMap['word/header2.xml']].getDataAsString();
    zipEntries[entryMap['word/header1.xml']] = Utilities.newBlob(h2, 'text/xml', 'word/header1.xml');
  }
  if (entryMap['word/_rels/header2.xml.rels'] !== undefined && entryMap['word/_rels/header1.xml.rels'] !== undefined) {
    var h2r = zipEntries[entryMap['word/_rels/header2.xml.rels']].getDataAsString();
    zipEntries[entryMap['word/_rels/header1.xml.rels']] = Utilities.newBlob(h2r, 'text/xml', 'word/_rels/header1.xml.rels');
  }

  // ---- EDIT DOCUMENT.XML ----
  var docXml = zipEntries[entryMap['word/document.xml']].getDataAsString();

  // Remove titlePg (any format)
  docXml = docXml.replace(/<w:titlePg[^>]*\/>/g, '');
  docXml = docXml.replace(/<w:titlePg[^>]*>.*?<\/w:titlePg>/g, '');

  // Change first-page header to default
  docXml = docXml.replace(
    /(<w:headerReference\s[^>]*?)w:type="first"([^>]*?\/>)/g,
    '$1w:type="default"$2'
  );
  // Remove first-page footer ref
  docXml = docXml.replace(/<w:footerReference\s[^>]*?w:type="first"[^>]*?\/>/g, '');

  // ---- PARSE THE DOCUMENT STRUCTURE ----
  // The floating elements (STATUS KEY, NEIGHBOR INTAKE FORM title) use
  // absolute positioning (behindDoc, wrapNone). In the original template
  // they sit AFTER the table. Apps Script rezip may move them before it.
  // Either way, we combine all non-table content and ALWAYS place it
  // AFTER the table to avoid extra vertical space before the table.
  
  var bodyStart = docXml.indexOf('<w:body>') + '<w:body>'.length;

  // Find the main data table
  var tblStart = findTag_(docXml, '<w:tbl');
  if (tblStart === -1) throw new Error('No table found');
  var tblEnd = findMatchingClose_(docXml, 'w:tbl', tblStart);
  if (tblEnd === -1) throw new Error('Could not find table end');

  // Find sectPr
  var sectStart = docXml.indexOf('<w:sectPr');
  if (sectStart === -1) throw new Error('No sectPr found');

  // Extract pieces
  var docPrefix = docXml.substring(0, bodyStart);
  var beforeTable = docXml.substring(bodyStart, tblStart);
  var tableXml = docXml.substring(tblStart, tblEnd);
  var afterTable = docXml.substring(tblEnd, sectStart);
  var docSuffix = docXml.substring(sectStart);

  // Combine floating content and compact it.
  // Apps Script rezip splits floating shapes into multiple paragraphs
  // and adds empty flow paragraphs that push content to the next page.
  // Fix: keep ONLY paragraphs that contain drawings/shapes.
  var rawFloating = beforeTable + afterTable;
  var floatingContent = compactFloating_(rawFloating);

  // ---- FILL PAGE 1 ----
  var totalPages = Math.ceil(countyRows.length / ROWS_PER_PAGE);
  var page1Rows = countyRows.slice(0, ROWS_PER_PAGE);
  var filledTable1 = fillTableXml_(tableXml, page1Rows, 0, totalPages === 1);

  // ---- BUILD OVERFLOW PAGES ----
  // Each overflow page gets: pageBreak + filledTable + floatingContent
  var overflowXml = '';

  for (var page = 1; page < totalPages; page++) {
    var ps = page * ROWS_PER_PAGE;
    var pageRows = countyRows.slice(ps, ps + ROWS_PER_PAGE);
    var isLast = (page === totalPages - 1);
    var filledTable = fillTableXml_(tableXml, pageRows, ps, isLast);
    overflowXml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' +
                   filledTable + floatingContent;
  }

  // ---- REASSEMBLE ----
  var newDocXml = docPrefix + filledTable1 + floatingContent + overflowXml + docSuffix;

  zipEntries[entryMap['word/document.xml']] = Utilities.newBlob(newDocXml, 'text/xml', 'word/document.xml');

  var newBlob = Utilities.zip(zipEntries, buildFileName_(startDate, endDate) + '.docx');
  newBlob.setContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  var outputFolder;
  try { outputFolder = DriveApp.getFolderById(OUTPUT_FOLDER_ID); }
  catch(e) { outputFolder = DriveApp.getRootFolder(); }

  return outputFolder.createFile(newBlob).getUrl();
}

// ============================================================
// TABLE FILLING
// ============================================================

// Column widths from template (DXA) - used to calculate font sizes
var COL_WIDTHS = [505, 2010, 1079, 901, 1604, 1378, 1559, 1017, 1196, 1135, 788];
var DEFAULT_FONT = 16; // 8pt in half-points
var MIN_FONT = 10;     // 5pt minimum in half-points

function fillTableXml_(tableXml, dataRows, globalOffset, isLastPage) {
  var rows = findAllElements_(tableXml, 'w:tr');
  if (rows.length < 2) return tableXml;
  var result = tableXml;

  // Work backwards through ALL data rows (skip header at index 0)
  for (var i = rows.length - 2; i >= 0; i--) {
    var ri = i + 1; // row index in table (0=header)

    if (i < dataRows.length) {
      // Fill with data
      var cr = dataRows[i];
      var vals = [
        String(globalOffset + i + 1), cr.name, cr.address, cr.zip, cr.phone,
        String(cr.householdSize), cr.belowAlice, cr.hohStatus,
        cr.unhoused, cr.ethnicity, cr.race
      ];
      var filled = fillRowCells_(rows[ri].xml, vals);
      filled = lockRowHeight_(filled);
      result = result.substring(0, rows[ri].start) + filled + result.substring(rows[ri].end);
    } else if (isLastPage) {
      // Last page: clear blank rows entirely (no row number)
      var emptyVals = ['', '', '', '', '', '', '', '', '', '', ''];
      var cleared = fillRowCells_(rows[ri].xml, emptyVals);
      cleared = lockRowHeight_(cleared);
      result = result.substring(0, rows[ri].start) + cleared + result.substring(rows[ri].end);
    } else {
      // Not last page - just lock row height on existing blank rows
      var locked = lockRowHeight_(rows[ri].xml);
      result = result.substring(0, rows[ri].start) + locked + result.substring(rows[ri].end);
    }
  }
  return result;
}

// Lock row height to exact so cells never expand
function lockRowHeight_(rowXml) {
  // Replace any existing trHeight with exact version
  // Handle both: w:val="529" alone, or with other attributes
  var replaced = rowXml.replace(
    /<w:trHeight([^/]*?)\/>/g,
    function(match, attrs) {
      // Extract the val attribute
      var valMatch = attrs.match(/w:val="(\d+)"/);
      var val = valMatch ? valMatch[1] : '529';
      return '<w:trHeight w:val="' + val + '" w:hRule="exact"/>';
    }
  );
  // If no trHeight existed, add one inside trPr
  if (replaced.indexOf('w:trHeight') === -1) {
    var trPrEnd = replaced.indexOf('</w:trPr>');
    if (trPrEnd !== -1) {
      replaced = replaced.substring(0, trPrEnd) +
        '<w:trHeight w:val="529" w:hRule="exact"/>' +
        replaced.substring(trPrEnd);
    }
  }
  return replaced;
}

// Calculate font size (half-points) to fit text in column
function getFontSize_(colIndex, text) {
  if (!text) return DEFAULT_FONT;
  var len = text.length;
  var widthDxa = COL_WIDTHS[colIndex] || 1000;
  // Usable width after cell padding (~100 DXA each side)
  var usablePts = (widthDxa - 200) / 20;
  // At 8pt, average char width ~4.5pt (conservative for proportional font)
  var charsAtDefault = Math.floor(usablePts / 4.5);
  if (len <= charsAtDefault) return DEFAULT_FONT;
  // Scale down proportionally
  var scaled = Math.floor(DEFAULT_FONT * charsAtDefault / len);
  return Math.max(scaled, MIN_FONT);
}

function fillRowCells_(rowXml, values) {
  var cells = findAllElements_(rowXml, 'w:tc');
  var result = rowXml;
  for (var c = Math.min(values.length, cells.length) - 1; c >= 0; c--) {
    var fontSize = getFontSize_(c, values[c]);
    var newCell = setCellValue_(cells[c].xml, values[c] || '', fontSize);
    result = result.substring(0, cells[c].start) + newCell + result.substring(cells[c].end);
  }
  return result;
}

function setCellValue_(cellXml, value, fontSize) {
  var pStart = findTag_(cellXml, '<w:p');
  if (pStart === -1) return cellXml;
  var pEnd = findMatchingClose_(cellXml, 'w:p', pStart);
  if (pEnd === -1) return cellXml;

  var paraXml = cellXml.substring(pStart, pEnd);
  var pPr = extractElement_(paraXml, 'w:pPr');

  // Build run properties with explicit font size
  // Extract existing rPr for font family etc, then override size
  var rPr = '';
  var rIdx = findTag_(paraXml, '<w:r');
  if (rIdx >= 0) rPr = extractElement_(paraXml.substring(rIdx), 'w:rPr');

  // Remove any existing sz/szCs from rPr so we can set our own
  if (rPr) {
    rPr = rPr.replace(/<w:sz[^/]*\/>/g, '');
    rPr = rPr.replace(/<w:szCs[^/]*\/>/g, '');
    // Insert our font size before closing </w:rPr>
    rPr = rPr.replace('</w:rPr>',
      '<w:sz w:val="' + fontSize + '"/><w:szCs w:val="' + fontSize + '"/></w:rPr>');
  } else {
    // No existing rPr - create one with just the font size
    rPr = '<w:rPr><w:sz w:val="' + fontSize + '"/><w:szCs w:val="' + fontSize + '"/></w:rPr>';
  }

  var newPara = '<w:p>' + pPr + '<w:r>' + rPr +
    '<w:t xml:space="preserve">' + escXml_(value) + '</w:t></w:r></w:p>';

  // Remove all paragraphs in cell, replace with one
  var tcClose = cellXml.lastIndexOf('</w:tc>');
  var lastPEnd = pEnd;
  var sf = pEnd;
  while (true) {
    var np = findTag_(cellXml.substring(sf), '<w:p');
    if (np === -1) break;
    np += sf;
    if (np > tcClose) break;
    var npe = findMatchingClose_(cellXml, 'w:p', np);
    if (npe === -1 || npe > tcClose + 7) break;
    lastPEnd = npe;
    sf = npe;
  }
  return cellXml.substring(0, pStart) + newPara + cellXml.substring(lastPEnd);
}

// Merge all floating shapes into ONE zero-height paragraph and fix
// their vertical positioning to be PAGE-relative instead of paragraph-relative.
// This ensures shapes appear at the exact same spot on every page.
function compactFloating_(xml) {
  if (!xml) return '';

  // Find all <w:r> elements that contain drawings/shapes
  var allRuns = findAllElements_(xml, 'w:r');
  var drawingRuns = [];
  for (var i = 0; i < allRuns.length; i++) {
    var run = allRuns[i].xml;
    if (run.indexOf('<w:drawing') >= 0 ||
        run.indexOf('<mc:AlternateContent') >= 0 ||
        run.indexOf('<w:pict') >= 0) {
      drawingRuns.push(run);
    }
  }

  if (drawingRuns.length === 0) return '';

  // Fix vertical positioning: change from paragraph-relative to page-relative.
  // In the original template, the anchor paragraph sits right after a floating
  // table (tblpY=1156 DXA from page top), so the paragraph is effectively at
  // the page content top (~1080 DXA = 685800 EMU from page top).
  //
  // STATUS KEY:           original V offset = -20871 EMU from paragraph
  //   -> page-relative:   685800 + (-20871) = 664929 EMU from page top
  //   -> round to:        665000 EMU
  //
  // NEIGHBOR INTAKE FORM: original V offset = -497840 EMU from paragraph
  //   -> page-relative:   685800 + (-497840) = 187960 EMU from page top
  //   -> round to:        188000 EMU

  for (var j = 0; j < drawingRuns.length; j++) {
    var run = drawingRuns[j];

    // Determine which shape this is based on content
    var isStatusKey = run.indexOf('STATUS KEY') >= 0 ||
      (run.indexOf('6010910') >= 0) || (run.indexOf('6020435') >= 0);
    var newVOffset = isStatusKey ? '665000' : '188000';

    // Replace positionV: change relativeFrom to "page" and set fixed offset
    run = run.replace(
      /<wp:positionV[^>]*>[\s\S]*?<\/wp:positionV>/g,
      '<wp:positionV relativeFrom="page"><wp:posOffset>' + newVOffset + '</wp:posOffset></wp:positionV>'
    );

    // Also ensure horizontal position for STATUS KEY is page-relative
    if (isStatusKey) {
      run = run.replace(
        /<wp:positionH[^>]*>[\s\S]*?<\/wp:positionH>/g,
        '<wp:positionH relativeFrom="page"><wp:posOffset>8557404</wp:posOffset></wp:positionH>'
      );
    }

    drawingRuns[j] = run;
  }

  // Build a single paragraph with zero height containing all drawing runs
  return '<w:p><w:pPr>' +
    '<w:spacing w:line="1" w:lineRule="exact" w:before="0" w:after="0"/>' +
    '<w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>' +
    '</w:pPr>' +
    drawingRuns.join('') +
    '</w:p>';
}

// ============================================================
// XML UTILITIES
// ============================================================
function findTag_(xml, tagStart) {
  var i1 = xml.indexOf(tagStart + '>');
  var i2 = xml.indexOf(tagStart + ' ');
  if (i1 === -1 && i2 === -1) return -1;
  if (i1 === -1) return i2;
  if (i2 === -1) return i1;
  return Math.min(i1, i2);
}

function findMatchingClose_(xml, tagName, openPos) {
  var o1 = '<' + tagName + '>', o2 = '<' + tagName + ' ';
  var cl = '</' + tagName + '>';
  var depth = 0, pos = openPos;
  while (pos < xml.length) {
    var n1 = xml.indexOf(o1, pos+1), n2 = xml.indexOf(o2, pos+1);
    var no = -1;
    if (n1>=0 && n2>=0) no=Math.min(n1,n2);
    else if (n1>=0) no=n1;
    else if (n2>=0) no=n2;
    var nc = xml.indexOf(cl, pos+1);
    if (nc<0) return -1;
    if (no>=0 && no<nc) { depth++; pos=no+1; }
    else { if (depth===0) return nc+cl.length; depth--; pos=nc+1; }
  }
  return -1;
}

function findAllElements_(xml, tagName) {
  var results = [], pos = 0;
  while (pos < xml.length) {
    var start = findTag_(xml.substring(pos), '<' + tagName);
    if (start === -1) break;
    start += pos;
    var end = findMatchingClose_(xml, tagName, start);
    if (end === -1) break;
    results.push({start:start, end:end, xml:xml.substring(start, end)});
    pos = end;
  }
  return results;
}

function extractElement_(xml, tagName) {
  var s = findTag_(xml, '<' + tagName);
  if (s === -1) return '';
  var e = findMatchingClose_(xml, tagName, s);
  return e === -1 ? '' : xml.substring(s, e);
}

function escXml_(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// DATA
// ============================================================
function getFilteredData_(startDate, endDate) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var rows = sheet.getRange(2, 1, lastRow - 1, 36).getValues();
  var sk = startDate.replace(/-/g,''), ek = endDate.replace(/-/g,'');
  var filtered = rows.filter(function(r) {
    var id = String(r[COL.ROW_ID]||'');
    if (!id) return false;
    var dk = id.substring(0,8);
    return dk >= sk && dk <= ek;
  });
  return filtered.length ? filtered.map(mapRow_) : null;
}

function mapRow_(row) {
  var fn=String(row[COL.FIRST_NAME]||'').trim(), ln=String(row[COL.LAST_NAME]||'').trim();
  var city=String(row[COL.CITY]||'').trim(), state=String(row[COL.STATE]||'').trim();
  var tier=String(row[COL.INCOME_TIER]||'');
  var ba='';
  if (tier==='60AMI'||tier==='61ALICE') ba='Yes';
  else if (tier==='AboveALICE') ba='No';
  var hoh=[];
  if (row[COL.HOH_62PLUS]) hoh.push('62');
  if (row[COL.HOH_FEMALE]) hoh.push('FH');
  if (row[COL.HOH_DISABLED]) hoh.push('DH');
  if (row[COL.HOH_UNEMPLOYED]) hoh.push('Unemployed');
  if (row[COL.HOH_VETERAN]) hoh.push('Veteran');
  if (row[COL.HOH_HOMELESS]) hoh.push('Homeless');
  if (row[COL.HOH_FURLOUGHED]) hoh.push('Furloughed');
  if (row[COL.HOH_SNAP]) hoh.push('SNAP');
  var re=parseRE_(String(row[COL.RACE_ETHNICITY]||''));
  return {
    name:ln+', '+fn, address:city+(state?', '+state:''),
    zip:String(row[COL.ZIP]||''), phone:String(row[COL.PHONE]||''),
    householdSize:row[COL.HH_SIZE]||'', belowAlice:ba,
    hohStatus:hoh.join(', '), unhoused:String(row[COL.UNHOUSED]||''),
    ethnicity:re.e, race:re.r
  };
}

function parseRE_(c) {
  if (!c||c==='prefer_not') return {r:'PNTA',e:'PNTA'};
  var e='',rp=c;
  if (c.match(/_hispanic$/)) { e='H'; rp=c.replace(/_hispanic$/,''); }
  else if (c.match(/_nonhispanic$/)) { e='NH'; rp=c.replace(/_nonhispanic$/,''); }
  var rm={'white':'W','black':'B','asian':'A','native_american':'AI','pacific_islander':'P','other':'MR','other_multiracial':'MR','multiracial':'MR','multi_racial':'MR'};
  return {r:rm[rp]||rp, e:e||c};
}

function buildFileName_(s,e) {
  var sd=fmtD_(s),ed=fmtD_(e);
  return 'Intake Form - '+(s===e?sd:sd+' to '+ed);
}

function diagnose() {
  Logger.log('Running as: ' + Session.getActiveUser().getEmail());
  Logger.log('Effective user: ' + Session.getEffectiveUser().getEmail());
  
  try {
    var f = DriveApp.getFileById(TEMPLATE_FILE_ID);
    Logger.log('Template OK: "' + f.getName() + '" owned by ' + f.getOwner().getEmail());
  } catch (e) { 
    Logger.log('Template FAIL: ' + e.message); 
  }

  try {
    var fo = DriveApp.getFolderById(OUTPUT_FOLDER_ID);
    Logger.log('Output folder OK: "' + fo.getName() + '"');
    // Test write permission
    var testFile = fo.createFile('permission_test.txt', 'test');
    Logger.log('Write OK: created ' + testFile.getName());
    testFile.setTrashed(true);
    Logger.log('Cleanup OK');
  } catch (e) { 
    Logger.log('Output folder FAIL: ' + e.message); 
  }
}

function fmtD_(d){var p=d.split('-');return p[1]+'.'+p[2]+'.'+p[0];}