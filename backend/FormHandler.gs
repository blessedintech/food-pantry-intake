/**
 * FormHandler.gs - Validation and data processing
 */

// Validate required fields server-side
function validateForm(data) {
  var errors = [];
  
  if (!data.firstName || data.firstName.trim() === '') {
    errors.push('First name is required');
  }
  if (!data.lastName || data.lastName.trim() === '') {
    errors.push('Last name is required');
  }
  if (!data.zipCode || !/^\d{5}$/.test(data.zipCode)) {
    errors.push('Valid 5-digit zip code is required');
  }
  
  var total = (data.children || 0) + (data.adults || 0) + (data.seniors || 0);
  if (total < 1) {
    errors.push('Household must have at least 1 person');
  }
  
  if (!data.signatureBase64 || data.signatureBase64.length < 100) {
    errors.push('Signature is required');
  }
  
  return errors;
}

// Generate unique row ID: YYYYMMDD_NNN
function generateRowId() {
  var now = new Date();
  var date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
  var sheet = getDataSheet();
  var lastRow = sheet.getLastRow();
  var seq = String(lastRow).padStart(3, '0');
  return date + '_' + seq;
}

// Build array matching Sheet column order (A through AJ)
function buildRow(data, rowId, sigResult) {
  var now = new Date();
  var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  
  // Map HOH status array to individual X/blank columns
  var hohStatus = data.hohStatus || [];
  
  return [
    rowId,                                              // A: Row ID
    timestamp,                                          // B: Timestamp
    data.entryMode || 'self',                           // C: Entry Mode
    data.language || 'en',                              // D: Language
    (data.firstName || '').trim(),                       // E: First Name
    (data.lastName || '').trim(),                        // F: Last Name
    (data.phone || '').trim(),                           // G: Phone
    (data.city || '').trim(),                             // H: City
    (data.state || '').trim(),                            // I: State
    (data.zipCode || '').trim(),                          // J: Zip Code
    (data.email || '').trim(),                            // K: Email
    data.children || 0,                                  // L: Children
    data.adults || 0,                                    // M: Adults
    data.seniors || 0,                                   // N: Seniors
    (data.children || 0) + (data.adults || 0) + (data.seniors || 0), // O: Household Size
    data.govtShutdown || '',                             // P: Govt Shutdown
    data.shutdownReason || '',                           // Q: Shutdown Reason
    data.unhoused || '',                                 // R: Unhoused
    data.incomeTier || '',                               // S: Income Tier
    data.raceEthnicity || '',                            // T: Race/Ethnicity (combined)
    hohStatus.indexOf('62plus') > -1 ? 'X' : '',        // U: 62+
    hohStatus.indexOf('female') > -1 ? 'X' : '',        // V: Female-Headed
    hohStatus.indexOf('disabled') > -1 ? 'X' : '',      // W: Disabled
    hohStatus.indexOf('unemployed') > -1 ? 'X' : '',    // X: Unemployed (NEW)
    hohStatus.indexOf('veteran') > -1 ? 'X' : '',       // Y: Veteran (NEW)
    hohStatus.indexOf('homeless') > -1 ? 'X' : '',      // Z: Homeless (NEW)
    hohStatus.indexOf('furloughed') > -1 ? 'X' : '',    // AA: Furloughed (NEW)
    hohStatus.indexOf('snap') > -1 ? 'X' : '',          // AB: SNAP (NEW)
    data.firstVisit || '',                               // AC: First Visit
    data.referralSource || '',                           // AD: Referral Source
    data.infoChanged || '',                              // AE: Info Changed
    data.changeDetails || '',                            // AF: Change Details
    sigResult.fileId || '',                              // AG: Signature File ID
    sigResult.fileUrl || '',                             // AH: Signature URL
    '',                                                  // AI: PDF File ID (populated on demand)
    data.siteId || '',                                   // AJ: Site ID
  ];
}
