/**
 * PDFGenerator.gs - Generate audit-ready PDF forms
 * Matches the county paper form layout as closely as possible
 */

function generatePdfForSelected() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row = sheet.getActiveRange().getRow();
  
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a data row (not the header).');
    return;
  }
  
  var rowId = sheet.getRange(row, 1).getValue();
  if (!rowId) {
    SpreadsheetApp.getUi().alert('No Row ID found. Please select a valid data row.');
    return;
  }
  
  var url = generatePdf(String(rowId));
  if (url) {
    SpreadsheetApp.getUi().alert('PDF generated!\n\nCheck your PDFs folder in Drive.');
  } else {
    SpreadsheetApp.getUi().alert('PDF generation failed. Check Execution log for details.');
  }
}

function generateAllMissingPdfs() {
  var sheet = getDataSheet();
  var data = sheet.getDataRange().getValues();
  var count = 0;
  
  for (var i = 1; i < data.length; i++) {
    var rowId = data[i][0];
    var pdfFileId = data[i][34];
    if (rowId && !pdfFileId) {
      generatePdf(String(rowId));
      count++;
    }
  }
  SpreadsheetApp.getUi().alert('Generated ' + count + ' PDF(s).');
}

function generatePdf(rowId) {
  try {
    var rowData = getRowById(rowId);
    if (!rowData) { Logger.log('Record not found: ' + rowId); return null; }
    
    var sigBase64 = '';
    var sigFileId = rowData['Signature File ID'];
    if (sigFileId) {
      try {
        var sigFile = DriveApp.getFileById(sigFileId);
        sigBase64 = Utilities.base64Encode(sigFile.getBlob().getBytes());
      } catch (e) { Logger.log('Could not load signature: ' + e.toString()); }
    }
    
    var siteName = getSiteName(rowData['Site ID'] || '');
    var html = buildPdfHtml(rowData, sigBase64, siteName);
    
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

function buildPdfHtml(d, sigBase64, siteName) {
  var v = function(key) { return d[key] || ''; };
  var vn = function(key) { return d[key] || 0; };
  
  // Checkbox helper
  var chk = function(val) {
    if (val === 'X') return '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #000;text-align:center;line-height:13px;font-size:9pt;vertical-align:middle;margin-right:4px">&#10003;</span>';
    return '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #000;vertical-align:middle;margin-right:4px"></span>';
  };
  
  // Fill-in line helper
  var fl = function(val, width) {
    width = width || '200px';
    var display = val ? '<u>&nbsp;' + val + '&nbsp;</u>' : '<span style="display:inline-block;width:' + width + ';border-bottom:1px solid #000">&nbsp;</span>';
    return display;
  };
  
  // Yes/No check helper
  var yn = function(val) {
    if (val === 'Yes') return '&nbsp;<u>&nbsp;Yes&nbsp;</u>&nbsp; ___ No';
    if (val === 'No') return '&nbsp;___ Yes&nbsp; <u>&nbsp;No&nbsp;</u>';
    return '&nbsp;___ Yes&nbsp; ___ No';
  };
  
  // Determine which race option is selected
  var raceVal = v('Race/Ethnicity');
  var raceChk = function(key) {
    return raceVal === key ? chk('X') : chk('');
  };
  
  // Income tier
  var incomeTier = v('Income Tier');
  var hhSize = vn('Household Size');
  
  // Income data
  var incomeData = [
    {size: 1, low: '$49,770', mid: '$49,770 - $55,740', high: '$55,740'},
    {size: 2, low: '$56,813', mid: '$56,813 - $69,448', high: '$69,448'},
    {size: 3, low: '$63,900', mid: '$63,900 - $98,134', high: '$98,134'},
    {size: 4, low: '$70,988', mid: '$70,988 - $116,984', high: '$116,984'},
    {size: 5, low: '$76,688', mid: '$76,688 - $146,980', high: '$146,980'},
    {size: 6, low: '$82,350', mid: '$82,350 - $159,621', high: '$159,621'},
    {size: 7, low: '$88,050', mid: '$88,050 - $180,135', high: '$180,135'},
    {size: '8+', low: '$93,713', mid: '$93,713 - $193,765', high: '$193,765'},
  ];
  
  // Build income table rows
  var incomeRows = '';
  for (var i = 0; i < incomeData.length; i++) {
    var inc = incomeData[i];
    var rowSize = inc.size;
    var isHighlighted = (hhSize == rowSize) || (hhSize >= 8 && rowSize === '8+');
    var rowStyle = isHighlighted ? 'background:#FFF8E1;font-weight:bold' : '';
    
    var lowChk = (isHighlighted && incomeTier === '60AMI') ? chk('X') : chk('');
    var midChk = (isHighlighted && incomeTier === '61ALICE') ? chk('X') : chk('');
    var highChk = (isHighlighted && incomeTier === 'AboveALICE') ? chk('X') : chk('');
    
    incomeRows += '<tr style="' + rowStyle + '">'
      + '<td style="font-weight:bold;text-align:center;padding:4px 6px;border:1px solid #999">' + rowSize + '</td>'
      + '<td style="padding:4px 6px;border:1px solid #999">' + lowChk + ' Less than ' + inc.low + '</td>'
      + '<td style="padding:4px 6px;border:1px solid #999">' + midChk + ' ' + inc.mid + '</td>'
      + '<td style="padding:4px 6px;border:1px solid #999">' + highChk + ' Above ' + inc.high + '</td>'
      + '</tr>';
  }
  
  // Signature HTML
  var sigHtml = sigBase64 
    ? '<img style="max-width:280px;height:auto" src="data:image/png;base64,' + sigBase64 + '">'
    : '';
  
  // ============================================
  // PAGE 1 - BLESSED IN TECH INTAKE FORM
  // ============================================
  var page1 = ''
    + '<div style="text-align:center;margin-bottom:20px">'
    + '<div style="font-size:16pt;font-weight:bold;margin-bottom:2px">BLESSED IN TECH MINISTRIES</div>'
    + '<div style="font-size:11pt;font-weight:bold;margin-bottom:12px">' + siteName + '</div>'
    + '<div style="font-size:12pt;font-weight:bold">PLEASE COMPLETE THIS FORM FOR OUR PANTRY REGISTRATION TODAY</div>'
    + '<div style="font-size:11pt;font-weight:bold;margin-top:4px">PLEASE PRINT</div>'
    + '</div>'
    
    // Name
    + '<div style="margin-bottom:10px">'
    + '<span style="font-size:10pt">First Name: ' + fl(v('First Name'), '220px') + '</span>'
    + '&nbsp;&nbsp;&nbsp;'
    + '<span style="font-size:10pt">Last Name: ' + fl(v('Last Name'), '220px') + '</span>'
    + '</div>'
    
    // Phone
    + '<div style="margin-bottom:10px">'
    + '<span style="font-size:10pt">Phone Number: ' + fl(v('Phone'), '280px') + '</span>'
    + '</div>'
    
    // City / State / Zip
    + '<div style="margin-bottom:10px">'
    + '<span style="font-size:10pt">City: ' + fl(v('City'), '180px') + '</span>'
    + '&nbsp;&nbsp;'
    + '<span style="font-size:10pt">State: ' + fl(v('State'), '40px') + '</span>'
    + '&nbsp;&nbsp;'
    + '<span style="font-size:10pt">Zip Code: ' + fl(v('Zip Code'), '80px') + '</span>'
    + '</div>'
    
    // Email
    + '<div style="margin-bottom:16px">'
    + '<span style="font-size:10pt">Email: ' + fl(v('Email'), '360px') + '</span>'
    + '</div>'
    
    // Government shutdown
    + '<div style="border:1.5px solid #000;padding:8px 12px;margin-bottom:14px">'
    + '<div style="font-size:10pt;margin-bottom:4px"><strong>Have you been affected by the Government Shutdown?</strong> ' + yn(v('Govt Shutdown')) + '</div>'
    + '<div style="font-size:10pt">If yes, is it due to the Furlough ' + (v('Shutdown Reason') === 'Furlough' ? '<u>&nbsp;X&nbsp;</u>' : '____') + ' or SNAP (Foodstamps) ' + (v('Shutdown Reason') === 'SNAP' ? '<u>&nbsp;X&nbsp;</u>' : '____') + '?</div>'
    + '</div>'
    
    // Household table
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'
    + '<tr>'
    + '<th style="border:1.5px solid #000;padding:6px 10px;text-align:center;font-size:10pt;background:#f0f0f0"><strong>HOUSEHOLD SIZE #</strong></th>'
    + '<th style="border:1.5px solid #000;padding:6px 10px;text-align:center;font-size:10pt;background:#f0f0f0"><strong>#Children</strong></th>'
    + '<th style="border:1.5px solid #000;padding:6px 10px;text-align:center;font-size:10pt;background:#f0f0f0"><strong>#Adults</strong></th>'
    + '<th style="border:1.5px solid #000;padding:6px 10px;text-align:center;font-size:10pt;background:#f0f0f0"><strong># Seniors</strong></th>'
    + '</tr>'
    + '<tr>'
    + '<td style="border:1.5px solid #000;padding:8px 10px;text-align:center;font-size:12pt;font-weight:bold">' + vn('Household Size') + '</td>'
    + '<td style="border:1.5px solid #000;padding:8px 10px;text-align:center;font-size:12pt">' + vn('Children') + '</td>'
    + '<td style="border:1.5px solid #000;padding:8px 10px;text-align:center;font-size:12pt">' + vn('Adults') + '</td>'
    + '<td style="border:1.5px solid #000;padding:8px 10px;text-align:center;font-size:12pt">' + vn('Seniors') + '</td>'
    + '</tr></table>'
    
    // Unhoused
    + '<div style="font-size:11pt;font-weight:bold;margin-bottom:14px">'
    + 'Are you and/or your family unhoused? ' + yn(v('Unhoused'))
    + '</div>'
    
    // Visit info
    + '<div style="margin-bottom:6px;font-size:10pt">Is this your first visit? ' + yn(v('First Visit')) + '</div>'
    + (v('First Visit') === 'Yes' ? '<div style="margin-bottom:6px;font-size:10pt">If yes, how did you hear about us? ' + fl(v('Referral Source'), '250px') + '</div>' : '')
    + '<div style="margin-bottom:6px;font-size:10pt">Has any information changed since your last visit? ' + yn(v('Info Changed')) + '</div>'
    + (v('Info Changed') === 'Yes' ? '<div style="margin-bottom:6px;font-size:10pt">If Yes, what? ' + fl(v('Change Details'), '300px') + '</div>' : '')
    
    // Footer
    + '<div style="text-align:center;margin-top:24px;font-size:11pt;font-weight:bold">ONE PAGE PER HOUSEHOLD</div>'
    + '<div style="text-align:center;margin-top:8px;font-size:11pt;font-weight:bold">THANK YOU FOR YOUR SUPPORT</div>'
    + '<div style="text-align:center;margin-top:12px;font-size:9pt;color:#666">http://www.blessedintech.org &nbsp;|&nbsp; Facebook @blessedintechministries</div>'
    
    // Record metadata (small, bottom)
    + '<div style="margin-top:16px;font-size:7pt;color:#aaa;text-align:right">Record ID: ' + v('Row ID') + ' | Digital submission: ' + v('Timestamp') + ' | Language: ' + v('Language') + '</div>';
  
  // ============================================
  // PAGE 2 - COUNTY INCOME VERIFICATION
  // ============================================
  var page2 = ''
    + '<div style="text-align:center;margin-bottom:6px">'
    + '<div style="font-size:9pt;font-weight:bold;margin-bottom:2px">ANNE ARUNDEL COUNTY FOOD BANK</div>'
    + '<div style="font-size:12pt;font-weight:bold;margin-bottom:2px">VERIFICATION OF CUSTOMER REVENUE AND ENGAGEMENT DATA:</div>'
    + '<div style="font-size:11pt;font-weight:bold;margin-bottom:8px">LYF 2026</div>'
    + '</div>'
    
    // Disclaimer
    + '<div style="font-size:7.5pt;color:#444;margin-bottom:12px;line-height:1.4">'
    + 'The service provided to you is supported in part by the Anne Arundel County Food Bank and Anne Arundel County Government through the A.A. Co. Partnership for Children, Youth &amp; Families. The information requested is only to meet local data collection standards, monitoring, and auditing purposes as required by the County and is not intended for public dissemination. Please provide the requested information below.'
    + '</div>'
    
    // Must be completed notice
    + '<div style="border:1.5px solid #000;padding:6px 10px;text-align:center;font-size:9pt;font-weight:bold;margin-bottom:14px">'
    + 'The form must be completed by the participant or by the parent or guardian of a child under the age of 18'
    + '</div>'
    
    // Fields 1-3
    + '<div style="margin-bottom:8px;font-size:10pt"><strong>1.</strong> First Name: ' + fl(v('First Name'), '200px') + '&nbsp;&nbsp;Last Name: ' + fl(v('Last Name'), '200px') + '</div>'
    + '<div style="margin-bottom:8px;font-size:10pt"><strong>2.</strong> Total number of people in the household: ' + fl(String(vn('Household Size')), '60px') + '</div>'
    + '<div style="margin-bottom:8px;font-size:10pt"><strong>3.</strong> Zip Code you reside in: ' + fl(v('Zip Code'), '100px') + '</div>'
    
    // Field 4 - Income
    + '<div style="margin-bottom:6px;font-size:10pt"><strong>4. Household size and total annual household income:</strong></div>'
    + '<div style="font-size:8.5pt;margin-left:20px;margin-bottom:4px"><strong>a.</strong> Circle the total number of people in your household in the first column.</div>'
    + '<div style="font-size:8.5pt;margin-left:20px;margin-bottom:8px"><strong>b.</strong> Along the same lines as your household size, check the income range that includes your annual household income.</div>'
    
    // Income determination note
    + '<div style="font-size:7pt;color:#555;margin-bottom:8px;line-height:1.3;font-style:italic">'
    + 'When determining your household income, include at least the following sources for all wage earners: 1) gross amount of wages, salaries, and other earnings; 2) net income from the operation of a business or profession; 3) interest, dividends and other net income from movable or immovable property; 4) total amount of periodic amounts received from Social Security, annuities, pensions or disability or death benefits, unemployment, disability compensation, workers\' compensation, and severance pay; 5) public assistance, e.g., welfare payments, food stamps; 6) alimony, child support payments, etc.'
    + '</div>'
    
    // Income table
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:6px;font-size:9pt">'
    + '<tr>'
    + '<th colspan="1" rowspan="2" style="border:1.5px solid #000;padding:4px 6px;text-align:center;background:#D4A94A;color:#000;font-size:8pt">Household<br>Size</th>'
    + '<th colspan="3" style="border:1.5px solid #000;padding:3px 6px;text-align:center;background:#6B8EAE;color:#000;font-size:8pt">Annual Household Income</th>'
    + '</tr>'
    + '<tr>'
    + '<th style="border:1.5px solid #000;padding:3px 6px;text-align:center;background:#6B8EAE;color:#000;font-size:7.5pt">60% AMI or less</th>'
    + '<th style="border:1.5px solid #000;padding:3px 6px;text-align:center;background:#6B8EAE;color:#000;font-size:7.5pt">61% AMI -<br>ALICE* Threshold</th>'
    + '<th style="border:1.5px solid #000;padding:3px 6px;text-align:center;background:#6B8EAE;color:#000;font-size:7.5pt">Above<br>ALICE* Threshold</th>'
    + '</tr>'
    + incomeRows
    + '</table>'
    
    // ALICE note
    + '<div style="font-size:7pt;color:#555;margin-bottom:12px;line-height:1.3">'
    + '* ALICE families (Asset Limited, Income Constrained, Employed) are households that earn more than the federal poverty level but not enough to cover basic needs. These needs include housing, food, transportation, childcare, health care, and technology. ALICE families are forced to make tough decisions and trade-offs every day.'
    + '</div>'
    
    // Field 5 - Race/Ethnicity
    + '<div style="margin-bottom:6px;font-size:10pt"><strong>5. Race/Ethnicity (Select One):</strong></div>'
    + '<table style="width:100%;font-size:8.5pt;margin-bottom:12px">'
    + '<tr>'
    + '<td style="padding:2px 0;width:33%">' + raceChk('white_hispanic') + ' White - Hispanic</td>'
    + '<td style="padding:2px 0;width:33%">' + raceChk('asian_hispanic') + ' Asian - Hispanic</td>'
    + '<td style="padding:2px 0;width:34%">' + raceChk('pacific_islander_hispanic') + ' Native Hawaiian/Pacific Islander - Hispanic</td>'
    + '</tr><tr>'
    + '<td style="padding:2px 0">' + raceChk('white_nonhispanic') + ' White - Non-Hispanic</td>'
    + '<td style="padding:2px 0">' + raceChk('asian_nonhispanic') + ' Asian - Non-Hispanic</td>'
    + '<td style="padding:2px 0">' + raceChk('pacific_islander_nonhispanic') + ' Native Hawaiian/Pacific Islander - Non-Hispanic</td>'
    + '</tr><tr>'
    + '<td style="padding:2px 0">' + raceChk('black_hispanic') + ' Black/African American - Hispanic</td>'
    + '<td style="padding:2px 0">' + raceChk('native_american_hispanic') + ' American Indian/Alaska Native - Hispanic</td>'
    + '<td style="padding:2px 0">&nbsp;</td>'
    + '</tr><tr>'
    + '<td style="padding:2px 0">' + raceChk('black_nonhispanic') + ' Black/African American - Non-Hispanic</td>'
    + '<td style="padding:2px 0">' + raceChk('native_american_nonhispanic') + ' American Indian/Alaska Native - Non-Hispanic</td>'
    + '<td style="padding:2px 0">&nbsp;</td>'
    + '</tr><tr>'
    + '<td style="padding:2px 0">' + raceChk('other_hispanic') + ' Other/Multi-Racial - Hispanic</td>'
    + '<td style="padding:2px 0">' + raceChk('other_nonhispanic') + ' Other/Multi-Racial - Non-Hispanic</td>'
    + '<td style="padding:2px 0">' + raceChk('prefer_not') + ' Prefer not to answer</td>'
    + '</tr></table>'
    
    // Field 6 - Head of Household
    + '<div style="margin-bottom:6px;font-size:10pt"><strong>6. Head of Household (Check all that apply):</strong>'
    + '&nbsp;&nbsp;' + chk(v('62+')) + ' 62 years or older'
    + '&nbsp;&nbsp;' + chk(v('Female-Headed')) + ' Female-headed household'
    + '&nbsp;&nbsp;' + chk(v('Disabled')) + ' Disabled'
    + '</div>'
    + '<div style="margin-bottom:4px;font-size:10pt;margin-left:20px">'
    + chk(v('Unemployed')) + ' Unemployed'
    + '&nbsp;&nbsp;' + chk(v('Veteran')) + ' Veteran'
    + '&nbsp;&nbsp;' + chk(v('Homeless')) + ' Homeless'
    + '&nbsp;&nbsp;' + chk(v('Furloughed')) + ' Furloughed Government Worker'
    + '&nbsp;&nbsp;' + chk(v('SNAP')) + ' Receives SNAP'
    + '</div>'
    
    // Certification
    + '<div style="font-size:7.5pt;color:#333;margin:14px 0 16px 0;line-height:1.4">'
    + 'I hereby certify that the above information is true and correct to the best of my knowledge. I, the undersigned, agree and acknowledge that the information provided is true and correct as of the date outlined in front of my signature. I acknowledge that a material misstatement made fraudulently or negligently in this, or any other statement made by me may constitute a federal violation and may result in my denial of participation in this program. I also understand that this agency, A.A. Co. Partnership for Children, Youth and Families, or Anne Arundel County Government may at any time request to see documentation that can verify that the income and information reported on this form is accurate and correct.'
    + '</div>'
    
    // Signature
    + '<div style="margin-top:8px">'
    + sigHtml
    + '</div>'
    + '<div style="display:flex;margin-top:4px;border-top:1px solid #000;padding-top:4px">'
    + '<div style="flex:2;font-size:9pt;font-weight:bold">Head of Household Signature</div>'
    + '<div style="flex:1;text-align:right;font-size:9pt"><strong>Date:</strong> ' + v('Timestamp') + '</div>'
    + '</div>'
    
    // Footer
    + '<div style="margin-top:10px;font-size:7.5pt;font-style:italic;color:#555">The form must be completed by the participant or by the parent or guardian of a child under the age of 18.</div>'
    
    // Record metadata
    + '<div style="margin-top:8px;font-size:7pt;color:#aaa;text-align:right">Record ID: ' + v('Row ID') + ' | Digital submission</div>';
  
  // ============================================
  // COMBINE INTO FULL HTML
  // ============================================
  return '<!DOCTYPE html><html><head><style>'
    + '@page{size:letter;margin:0.6in 0.65in}'
    + 'body{font-family:Arial,sans-serif;font-size:10pt;color:#000;line-height:1.35}'
    + '.pb{page-break-before:always}'
    + '</style></head><body>'
    + page1
    + '<div class="pb"></div>'
    + page2
    + '</body></html>';
}