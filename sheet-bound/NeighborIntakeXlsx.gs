// ============================================================
// Neighbor Intake Database (XLSX) Generator
// ============================================================
// Fills the county's Neighbor Intake Database FY26 template with
// neighbor data filtered by month and site. Preserves all existing
// formulas in the template (Unique Data, Duplicated Data, etc.)
//
// v2 changes (May 2026):
//   - New template with 5 added HOH columns (Unemployed, Veteran,
//     Homeless, Furloughed, SNAP) - now 42 cols vs 37
//   - Month columns shifted from Z-AK to AE-AP
//   - Race/ethnicity columns shifted from L-X to Q-AC
//   - Distribution event ranking: instead of writing "1" in the
//     month column, writes 1 for the 1st distribution date of the
//     month at that site, 2 for the 2nd, etc. Per-site ranking.
//
// SETUP:
//   1. Upload the FY26 template to Drive
//   2. Get file ID from the Drive URL
//   3. Set XLSX_TEMPLATE_FILE_ID below
//   4. OUTPUT_FOLDER_ID is shared with CountyFormGenerator.gs
// ============================================================

var XLSX_TEMPLATE_FILE_ID = 'PASTE_COUNTY_XLSX_TEMPLATE_FILE_ID';
// OUTPUT_FOLDER_ID is already defined in CountyFormGenerator.gs - reused.

function showXlsxDialog() {
  var now = new Date();
  var months = [];
  for (var i = 0; i < 13; i++) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var label = Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMMM yyyy');
    var value = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
    months.push({label: label, value: value});
  }
  var defaultMonth = months[1].value;

  var monthOptions = months.map(function(m) {
    return '<option value="' + m.value + '"' +
           (m.value === defaultMonth ? ' selected' : '') + '>' +
           m.label + '</option>';
  }).join('');

  var html = HtmlService.createHtmlOutput(
    '<style>' +
    'body{font-family:Arial,sans-serif;padding:16px;margin:0}' +
    'label{display:block;margin:12px 0 4px;font-weight:bold;font-size:13px}' +
    'select{width:100%;padding:8px;box-sizing:border-box;font-size:13px;border:1px solid #ccc;border-radius:4px;background:white}' +
    '.btn{background:#1B3A5C;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;font-size:14px;margin-top:16px;width:100%}' +
    '.btn:hover{background:#2E8B8B}' +
    '.btn:disabled{background:#888;cursor:wait}' +
    '.note{color:#666;font-size:12px;margin-top:8px}' +
    '</style>' +
    '<label for="m">Month</label>' +
    '<select id="m">' + monthOptions + '</select>' +
    '<label for="s">Site</label>' +
    '<select id="s">' +
    '<option value="">All Sites</option>' +
    '<option value="pip_moyer">Pip Moyer Recreation Center</option>' +
    '<option value="tyler_heights">Tyler Heights Elementary</option>' +
    '</select>' +
    '<button class="btn" id="go">Generate</button>' +
    '<div id="status" class="note"></div>' +
    '<script>' +
    'document.getElementById("go").onclick=function(){' +
    'var m=document.getElementById("m").value;' +
    'var s=document.getElementById("s").value;' +
    'var b=document.getElementById("go");' +
    'var st=document.getElementById("status");' +
    'b.textContent="Generating...";b.disabled=true;st.textContent="This may take 10-30 seconds.";' +
    'google.script.run' +
    '.withSuccessHandler(function(r){' +
    'if(r&&r.url){document.body.innerHTML="<div style=\\"font-family:Arial;padding:16px\\"><p><strong>Done!</strong></p><p>Generated <strong>"+r.count+"</strong> records across <strong>"+r.distributions+"</strong> distribution event(s).</p><p><a href=\\""+r.url+"\\" target=\\"_blank\\">Download "+r.filename+"</a></p></div>";}' +
    'else{st.textContent="No records found for that month and site.";b.textContent="Generate";b.disabled=false;}' +
    '})' +
    '.withFailureHandler(function(err){st.textContent="Error: "+err.message;b.textContent="Generate";b.disabled=false;})' +
    '.generateNeighborIntakeXlsx(m,s);' +
    '};' +
    '</script>'
  ).setWidth(360).setHeight(320);
  SpreadsheetApp.getUi().showModalDialog(html, 'Generate Neighbor Intake XLSX');
}

// ============================================================
// MAIN
// ============================================================
function generateNeighborIntakeXlsx(yearMonth, siteId) {
  var raw = getXlsxFilteredData_(yearMonth, siteId);
  if (!raw || raw.length === 0) return null;

  var ranked = rankDistributions_(raw);
  var rows = ranked.rows.map(function(r) { return mapRowToXlsx_(r); });

  var templateFile = DriveApp.getFileById(XLSX_TEMPLATE_FILE_ID);
  var templateBlob = getXlsxBlob_(templateFile);
  templateBlob.setContentType('application/zip');

  var zipEntries = Utilities.unzip(templateBlob);
  var entryMap = {};
  for (var i = 0; i < zipEntries.length; i++) {
    entryMap[zipEntries[i].getName()] = i;
  }

  var dataSheetPath = findSheetPath_(zipEntries, entryMap, 'DATA');
  if (!dataSheetPath) throw new Error('Could not find DATA sheet in template');

  var origSheetXml = zipEntries[entryMap[dataSheetPath]].getDataAsString();
  var newSheetXml = fillDataSheet_(origSheetXml, rows);

  zipEntries[entryMap[dataSheetPath]] = Utilities.newBlob(
    newSheetXml, 'text/xml', dataSheetPath);

  if (entryMap['xl/workbook.xml'] !== undefined) {
    var wbXml = zipEntries[entryMap['xl/workbook.xml']].getDataAsString();
    wbXml = forceRecalcOnLoad_(wbXml);
    zipEntries[entryMap['xl/workbook.xml']] = Utilities.newBlob(
      wbXml, 'text/xml', 'xl/workbook.xml');
  }

  var filename = buildXlsxFilename_(yearMonth, siteId);
  var newBlob = Utilities.zip(zipEntries, filename);
  newBlob.setContentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  var outputFolder;
  try { outputFolder = DriveApp.getFolderById(OUTPUT_FOLDER_ID); }
  catch (e) { outputFolder = DriveApp.getRootFolder(); }

  var file = outputFolder.createFile(newBlob);
  return {
    url: file.getUrl(),
    filename: filename,
    count: rows.length,
    distributions: ranked.totalDistributions
  };
}

// ============================================================
// DISTRIBUTION EVENT RANKING
// ============================================================
function rankDistributions_(rawRows) {
  var datesBySite = {};

  for (var i = 0; i < rawRows.length; i++) {
    var r = rawRows[i];
    var rowId = String(r[COL.ROW_ID] || '');
    var dateKey = rowId.substring(0, 8);
    var site = String(r[COL.SITE_ID] || '_unknown');
    if (!datesBySite[site]) datesBySite[site] = {};
    datesBySite[site][dateKey] = true;
  }

  var rankBySiteDate = {};
  for (var site in datesBySite) {
    var dates = Object.keys(datesBySite[site]).sort();
    rankBySiteDate[site] = {};
    for (var d = 0; d < dates.length; d++) {
      rankBySiteDate[site][dates[d]] = d + 1;
    }
  }

  var ranked = rawRows.map(function(r) {
    var rowId = String(r[COL.ROW_ID] || '');
    var dateKey = rowId.substring(0, 8);
    var site = String(r[COL.SITE_ID] || '_unknown');
    var rank = (rankBySiteDate[site] && rankBySiteDate[site][dateKey]) || 1;
    return { source: r, distRank: rank };
  });

  var total = 0;
  for (var s in datesBySite) {
    total += Object.keys(datesBySite[s]).length;
  }

  return { rows: ranked, totalDistributions: total };
}

// ============================================================
// DATA FILTERING & MAPPING
// ============================================================
function getXlsxFilteredData_(yearMonth, siteId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  var data = sheet.getRange(2, 1, lastRow - 1, 36).getValues();
  var monthKey = yearMonth.replace(/-/g, '');

  var filtered = data.filter(function(r) {
    var id = String(r[COL.ROW_ID] || '');
    if (!id) return false;
    var dk = id.substring(0, 6);
    if (dk !== monthKey) return false;
    if (siteId) {
      var rowSite = String(r[COL.SITE_ID] || '');
      if (rowSite !== siteId) return false;
    }
    return true;
  });

  return filtered.length ? filtered : null;
}

function mapRowToXlsx_(ranked) {
  var row = ranked.source;
  var distRank = ranked.distRank;

  var rowId = String(row[COL.ROW_ID] || '');
  var datePrefix = rowId.substring(0, 8);
  var dateOfVisit = '';
  if (datePrefix.length === 8) {
    var yyyy = datePrefix.substring(0, 4);
    var mm = datePrefix.substring(4, 6);
    var dd = datePrefix.substring(6, 8);
    dateOfVisit = mm + '/' + dd + '/' + yyyy;
  }

  var firstName = String(row[COL.FIRST_NAME] || '').trim();
  var lastName = String(row[COL.LAST_NAME] || '').trim();
  var zip = String(row[COL.ZIP] || '').trim();
  var phone = String(row[COL.PHONE] || '').trim();
  var hhSize = row[COL.HH_SIZE] || '';

  var tier = String(row[COL.INCOME_TIER] || '');
  var belowAlice = (tier === '60AMI' || tier === '61ALICE') ? 'X' : '';
  var selfDisclosure = 'X';

  var f62        = row[COL.HOH_62PLUS]     ? 'X' : '';
  var fFemale    = row[COL.HOH_FEMALE]     ? 'X' : '';
  var fDisabled  = row[COL.HOH_DISABLED]   ? 'X' : '';
  var fUnemp     = row[COL.HOH_UNEMPLOYED] ? 'X' : '';
  var fVeteran   = row[COL.HOH_VETERAN]    ? 'X' : '';
  var fHomeless  = row[COL.HOH_HOMELESS]   ? 'X' : '';
  var fFurlough  = row[COL.HOH_FURLOUGHED] ? 'X' : '';
  var fSnap      = row[COL.HOH_SNAP]       ? 'X' : '';

  var re = mapRaceEthnicityCols_(String(row[COL.RACE_ETHNICITY] || ''));

  // Month columns AE-AP (fiscal year order Jul->Jun)
  // AE=Jul(7), AF=Aug(8), AG=Sep(9), AH=Oct(10), AI=Nov(11), AJ=Dec(12),
  // AK=Jan(1), AL=Feb(2), AM=Mar(3), AN=Apr(4), AO=May(5), AP=Jun(6)
  var visitMonth = parseInt(datePrefix.substring(4, 6), 10);
  var monthCols = ['', '', '', '', '', '', '', '', '', '', '', ''];
  var monthMap = {7:0, 8:1, 9:2, 10:3, 11:4, 12:5, 1:6, 2:7, 3:8, 4:9, 5:10, 6:11};
  if (monthMap[visitMonth] !== undefined) {
    monthCols[monthMap[visitMonth]] = String(distRank);
  }

  return [
    dateOfVisit,        // A:  Date of visit
    firstName,          // B:  First Name
    lastName,           // C:  Last Name
    zip,                // D:  Zip Code
    phone,              // E:  Phone #
    hhSize,             // F:  # in Household
    selfDisclosure,     // G:  Self Disclosure on File
    belowAlice,         // H:  Income Below ALICE
    f62,                // I:  62 Years or Older
    fFemale,            // J:  Female Head of HH
    fDisabled,          // K:  Disabled HH
    fUnemp,             // L:  Unemployed HH
    fVeteran,           // M:  Veteran HH
    fHomeless,          // N:  Homeless HH
    fFurlough,          // O:  Furloughed Worker HH
    fSnap,              // P:  SNAP Recipient
    re[0],              // Q:  White-Hispanic
    re[1],              // R:  White-NonHispanic
    re[2],              // S:  Black-Hispanic
    re[3],              // T:  Black-NonHispanic
    re[4],              // U:  Asian-Hispanic
    re[5],              // V:  Asian-NonHispanic
    re[6],              // W:  AI/AN-Hispanic
    re[7],              // X:  AI/AN-NonHispanic
    re[8],              // Y:  NH/PI-Hispanic
    re[9],              // Z:  NH/PI-NonHispanic
    re[10],             // AA: Other-Hispanic
    re[11],             // AB: Other-NonHispanic
    re[12],             // AC: Prefer not to answer
    '',                 // AD: # Babies (baby pantry only)
    monthCols[0],       // AE: JULY
    monthCols[1],       // AF: AUGUST
    monthCols[2],       // AG: SEPTEMBER
    monthCols[3],       // AH: OCTOBER
    monthCols[4],       // AI: NOVEMBER
    monthCols[5],       // AJ: DECEMBER
    monthCols[6],       // AK: JANUARY
    monthCols[7],       // AL: FEBRUARY
    monthCols[8],       // AM: MARCH
    monthCols[9],       // AN: APRIL
    monthCols[10],      // AO: MAY
    monthCols[11]       // AP: JUNE
  ];
}

function mapRaceEthnicityCols_(combined) {
  // 13-element array matching cols Q-AC
  var arr = ['','','','','','','','','','','','',''];

  if (!combined || combined === 'prefer_not') {
    arr[12] = 'X';
    return arr;
  }

  var isHispanic = /_hispanic$/.test(combined);
  var racePart = combined.replace(/_hispanic$/, '').replace(/_nonhispanic$/, '');

  var raceBase = {
    'white': 0, 'black': 2, 'asian': 4,
    'native_american': 6, 'american_indian': 6,
    'pacific_islander': 8, 'native_hawaiian': 8,
    'other': 10, 'multiracial': 10, 'multi_racial': 10, 'other_multiracial': 10
  };

  var base = raceBase[racePart];
  if (base === undefined) base = 10;

  var offset = isHispanic ? 0 : 1;
  arr[base + offset] = 'X';
  return arr;
}

// ============================================================
// XLSX MANIPULATION
// ============================================================
function getXlsxBlob_(file) {
  var XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  try {
    return file.getAs(XLSX_MIME);
  } catch (e) {
    return file.getBlob();
  }
}

function findSheetPath_(zipEntries, entryMap, sheetName) {
  if (entryMap['xl/workbook.xml'] === undefined) return null;
  var wbXml = zipEntries[entryMap['xl/workbook.xml']].getDataAsString();
  var relsPath = 'xl/_rels/workbook.xml.rels';
  if (entryMap[relsPath] === undefined) return null;
  var relsXml = zipEntries[entryMap[relsPath]].getDataAsString();

  var sheetRegex  = /<sheet[^/>]*name="([^"]+)"[^/>]*r:id="([^"]+)"[^/>]*\/>/g;
  var sheetRegex2 = /<sheet[^/>]*r:id="([^"]+)"[^/>]*name="([^"]+)"[^/>]*\/>/g;

  var rId = null, m;
  while ((m = sheetRegex.exec(wbXml)) !== null) {
    if (m[1] === sheetName) { rId = m[2]; break; }
  }
  if (!rId) {
    while ((m = sheetRegex2.exec(wbXml)) !== null) {
      if (m[2] === sheetName) { rId = m[1]; break; }
    }
  }
  if (!rId) return null;

  var relRegex  = new RegExp('<Relationship[^>]*Id="' + rId + '"[^>]*Target="([^"]+)"', 'g');
  var relRegex2 = new RegExp('<Relationship[^>]*Target="([^"]+)"[^>]*Id="' + rId + '"', 'g');
  var target = null;
  m = relRegex.exec(relsXml);
  if (m) target = m[1];
  if (!target) {
    m = relRegex2.exec(relsXml);
    if (m) target = m[1];
  }
  if (!target) return null;

  if (target.charAt(0) === '/') target = target.substring(1);
  else target = 'xl/' + target;
  return target;
}

function fillDataSheet_(sheetXml, rows) {
  var sdStart = sheetXml.indexOf('<sheetData');
  if (sdStart === -1) throw new Error('No sheetData in sheet XML');
  var sdOpenEnd = sheetXml.indexOf('>', sdStart) + 1;
  var sdSelfClose = sheetXml.substring(sdStart, sdOpenEnd);
  var sdContentStart, sdContentEnd;
  if (sdSelfClose.indexOf('/>') !== -1) {
    var afterSelfClose = sdStart + sdSelfClose.length;
    sheetXml = sheetXml.substring(0, sdStart) +
               sdSelfClose.replace('/>', '>') +
               '</sheetData>' +
               sheetXml.substring(afterSelfClose);
    sdContentStart = sdStart + sdSelfClose.replace('/>', '>').length;
    sdContentEnd = sdContentStart;
  } else {
    sdContentStart = sdOpenEnd;
    sdContentEnd = sheetXml.indexOf('</sheetData>', sdContentStart);
    if (sdContentEnd === -1) throw new Error('No </sheetData>');
  }

  var existingContent = sheetXml.substring(sdContentStart, sdContentEnd);
  var headerMatch = existingContent.match(/<row[^>]*\sr="1"[^>]*>[\s\S]*?<\/row>/);
  var headerRowXml = headerMatch ? headerMatch[0] : '';

  var newRows = [];
  for (var i = 0; i < rows.length; i++) {
    newRows.push(buildRowXml_(i + 2, rows[i]));
  }

  var newSheetData = headerRowXml + newRows.join('');
  var newSheetXml = sheetXml.substring(0, sdContentStart) +
                    newSheetData +
                    sheetXml.substring(sdContentEnd);

  newSheetXml = newSheetXml.replace(
    /<dimension[^/]*ref="[^"]*"\s*\/>/,
    '<dimension ref="A1:AP' + (rows.length + 1) + '"/>'
  );

  return newSheetXml;
}

function buildRowXml_(rowNum, values) {
  var cells = [];
  for (var c = 0; c < values.length; c++) {
    var v = values[c];
    if (v === '' || v === null || v === undefined) continue;
    var colLetter = colNumToLetter_(c + 1);
    var ref = colLetter + rowNum;
    if (typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v))) {
      cells.push('<c r="' + ref + '"><v>' + v + '</v></c>');
    } else {
      cells.push('<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' +
                 escXmlXlsx_(String(v)) + '</t></is></c>');
    }
  }
  return '<row r="' + rowNum + '">' + cells.join('') + '</row>';
}

function colNumToLetter_(n) {
  var s = '';
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function escXmlXlsx_(s) {
  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
}

function forceRecalcOnLoad_(wbXml) {
  if (wbXml.indexOf('<calcPr') >= 0) {
    wbXml = wbXml.replace(
      /<calcPr([^/]*?)\/>/,
      function(match, attrs) {
        if (attrs.indexOf('fullCalcOnLoad') >= 0) return match;
        return '<calcPr' + attrs + ' fullCalcOnLoad="1"/>';
      }
    );
  } else {
    wbXml = wbXml.replace(
      '</workbook>',
      '<calcPr fullCalcOnLoad="1"/></workbook>'
    );
  }
  return wbXml;
}

function buildXlsxFilename_(yearMonth, siteId) {
  var parts = yearMonth.split('-');
  var monthName = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'][parseInt(parts[1], 10) - 1];
  var siteLabel = '';
  if (siteId === 'pip_moyer') siteLabel = ' - Pip Moyer';
  else if (siteId === 'tyler_heights') siteLabel = ' - Tyler Heights';
  else siteLabel = ' - All Sites';
  return 'Neighbor Intake - ' + monthName + ' ' + parts[0] + siteLabel + '.xlsx';
}

// ============================================================
// DIAGNOSTIC
// ============================================================
function diagnoseXlsx() {
  Logger.log('Running as: ' + Session.getActiveUser().getEmail());
  try {
    var f = DriveApp.getFileById(XLSX_TEMPLATE_FILE_ID);
    Logger.log('XLSX template OK: "' + f.getName() + '" owned by ' + f.getOwner().getEmail());
  } catch (e) {
    Logger.log('XLSX template FAIL: ' + e.message);
  }
  try {
    var fo = DriveApp.getFolderById(OUTPUT_FOLDER_ID);
    Logger.log('Output folder OK: "' + fo.getName() + '"');
  } catch (e) {
    Logger.log('Output folder FAIL: ' + e.message);
  }
}