/**
 * CheckoutBackend.gs
 *
 * Backend endpoints for the food pantry checkout app, including
 * password authentication via short-lived session tokens.
 *
 * Endpoints (all on the same web-app URL):
 *   POST {action:'login', username, password}                  -> {ok, token, expiresAt}
 *   GET  ?action=list&token=...&date=YYYYMMDD                  -> {ok, rows, date}
 *   POST {action:'checkout',   token, rowId}                   -> {ok, checkedOutAt}
 *   POST {action:'uncheckout', token, rowId}                   -> {ok, checkedOutAt:''}
 *   POST {action:'logout', token}                              -> {ok}
 *
 * CREDENTIALS are stored in Script Properties (Project Settings > Script
 * Properties in the Apps Script editor), NOT in this file:
 *   CHECKOUT_USERNAME
 *   CHECKOUT_PASSWORD
 *
 * If those properties are missing, login will fail with a clear error.
 * To rotate the password, just edit the Script Property - no redeploy needed.
 */

// ============================================================
// CONFIG
// ============================================================

// The intake data spreadsheet.
var INTAKE_SPREADSHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';;

var CHECKOUT_COLUMN_HEADER = 'Checked Out';

// Column indices in the intake sheet (1-based, for Sheet.getRange()).
// Verified against the live sheet screenshot 2026-05-21.
var COL_ROW_ID = 1;          // A - Row ID (YYYYMMDD_NNN)
var COL_TIMESTAMP = 2;       // B - Timestamp
var COL_FIRST_NAME = 5;      // E - First Name
var COL_LAST_NAME = 6;       // F - Last Name
var COL_HOUSEHOLD_SIZE = 15; // O - Household Size

// Session token lifetime: 12 hours, covers a distribution day with margin.
var TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000;

// ============================================================
// ROUTER (called from Code.gs doGet/doPost)
// ============================================================

function routeCheckoutGet_(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action !== 'list') return null;

  var authError = requireAuth_(e.parameter && e.parameter.token);
  if (authError) return jsonResponse_(authError);

  var dateKey = (e.parameter && e.parameter.date) || '';
  return jsonResponse_(getIntakeRowsForDate_(dateKey));
}

function routeCheckoutPost_(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return null;
  }

  // Login is the one action that doesn't require an existing token.
  if (data.action === 'login') {
    return jsonResponse_(handleLogin_(data.username, data.password));
  }

  if (data.action === 'logout') {
    if (data.token) deleteToken_(data.token);
    return jsonResponse_({ ok: true });
  }

  if (data.action === 'checkout' || data.action === 'uncheckout') {
    var authError = requireAuth_(data.token);
    if (authError) return jsonResponse_(authError);

    var isCheckout = data.action === 'checkout';
    return jsonResponse_(markCheckedOut_(data.rowId, isCheckout));
  }

  // Not a checkout-related action - fall through to Code.gs intake handler.
  return null;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// AUTH: login, token storage, validation
// ============================================================

function handleLogin_(username, password) {
  var props = PropertiesService.getScriptProperties();
  var expectedUser = props.getProperty('CHECKOUT_USERNAME');
  var expectedPass = props.getProperty('CHECKOUT_PASSWORD');

  if (!expectedUser || !expectedPass) {
    return {
      ok: false,
      error: 'Checkout credentials not configured. Set CHECKOUT_USERNAME and CHECKOUT_PASSWORD in Script Properties.'
    };
  }

  if (String(username || '') !== expectedUser || String(password || '') !== expectedPass) {
    // Generic message - don't leak which field was wrong.
    return { ok: false, error: 'Invalid username or password.' };
  }

  // Issue a token.
  var token = generateToken_();
  var expiresAt = Date.now() + TOKEN_LIFETIME_MS;
  storeToken_(token, expiresAt);
  return { ok: true, token: token, expiresAt: expiresAt };
}

/**
 * Returns null if the token is valid, or an {ok:false, error, authRequired:true}
 * object if it's missing/expired/unknown.
 */
function requireAuth_(token) {
  if (!token) {
    return { ok: false, error: 'Not signed in.', authRequired: true };
  }
  var expiresAt = lookupToken_(token);
  if (expiresAt === null) {
    return { ok: false, error: 'Session not found. Please sign in again.', authRequired: true };
  }
  if (Date.now() > expiresAt) {
    deleteToken_(token);
    return { ok: false, error: 'Session expired. Please sign in again.', authRequired: true };
  }
  return null;
}

function generateToken_() {
  // Mix UUID with random bytes for extra entropy.
  var bytes = [];
  for (var i = 0; i < 32; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  var rand = Utilities.getUuid().replace(/-/g, '');
  var hex = bytes.map(function(b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  return rand + hex;
}

// Token storage uses Script Properties keyed by "tok_<token>" with the
// expiration timestamp as the value.
function storeToken_(token, expiresAt) {
  PropertiesService.getScriptProperties()
    .setProperty('tok_' + token, String(expiresAt));
  // Opportunistic cleanup: every login is a chance to prune expired tokens.
  pruneExpiredTokens_();
}

function lookupToken_(token) {
  var raw = PropertiesService.getScriptProperties().getProperty('tok_' + token);
  if (!raw) return null;
  var n = Number(raw);
  if (isNaN(n)) return null;
  return n;
}

function deleteToken_(token) {
  PropertiesService.getScriptProperties().deleteProperty('tok_' + token);
}

function pruneExpiredTokens_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var now = Date.now();
  for (var key in all) {
    if (key.indexOf('tok_') === 0) {
      var exp = Number(all[key]);
      if (!isNaN(exp) && now > exp) {
        props.deleteProperty(key);
      }
    }
  }
}

// ============================================================
// DATA: read intake rows for a date
// ============================================================

function getIntakeRowsForDate_(dateKey) {
  var sheet = SpreadsheetApp.openById(INTAKE_SPREADSHEET_ID).getSheets()[0];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (!/^\d{8}$/.test(String(dateKey || ''))) {
    dateKey = formatDateKey_(new Date());
  }

  if (lastRow < 2) {
    return { ok: true, rows: [], date: dateKey, serverTime: new Date().toISOString() };
  }

  var checkoutCol = ensureCheckoutColumn_(sheet);
  var allValues = sheet.getRange(1, 1, lastRow, Math.max(lastCol, checkoutCol)).getValues();

  var rows = [];
  for (var i = 1; i < allValues.length; i++) {
    var row = allValues[i];
    var rowId = String(row[COL_ROW_ID - 1] || '');
    if (!rowId) continue;

    var datePrefix = rowId.substring(0, 8);
    if (datePrefix !== dateKey) continue;

    var checkedOutRaw = row[checkoutCol - 1];
    var checkedOutAt = '';
    if (checkedOutRaw) {
      checkedOutAt = (checkedOutRaw instanceof Date)
        ? checkedOutRaw.toISOString()
        : String(checkedOutRaw);
    }

    rows.push({
      rowId: rowId,
      timestamp: (row[COL_TIMESTAMP - 1] instanceof Date)
        ? row[COL_TIMESTAMP - 1].toISOString()
        : String(row[COL_TIMESTAMP - 1] || ''),
      firstName: String(row[COL_FIRST_NAME - 1] || ''),
      lastName: String(row[COL_LAST_NAME - 1] || ''),
      householdSize: Number(row[COL_HOUSEHOLD_SIZE - 1] || 0),
      checkedOutAt: checkedOutAt
    });
  }

  return { ok: true, rows: rows, date: dateKey, serverTime: new Date().toISOString() };
}

// ============================================================
// DATA: mark / unmark checked out
// ============================================================

function markCheckedOut_(rowId, checked) {
  if (!rowId) {
    return { ok: false, error: 'Missing rowId' };
  }

  var sheet = SpreadsheetApp.openById(INTAKE_SPREADSHEET_ID).getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: false, error: 'Sheet is empty' };
  }

  var checkoutCol = ensureCheckoutColumn_(sheet);

  var rowIds = sheet.getRange(2, COL_ROW_ID, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = 0; i < rowIds.length; i++) {
    if (String(rowIds[i][0]) === String(rowId)) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    return { ok: false, error: 'Row ID not found: ' + rowId };
  }

  if (checked) {
    var nowIso = new Date().toISOString();
    sheet.getRange(targetRow, checkoutCol).setValue(nowIso);
    return { ok: true, rowId: rowId, checkedOutAt: nowIso };
  } else {
    sheet.getRange(targetRow, checkoutCol).setValue('');
    return { ok: true, rowId: rowId, checkedOutAt: '' };
  }
}

// ============================================================
// HELPERS
// ============================================================

function ensureCheckoutColumn_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol > 0) {
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === CHECKOUT_COLUMN_HEADER) {
        return i + 1;
      }
    }
  }
  var newCol = lastCol + 1;
  sheet.getRange(1, newCol).setValue(CHECKOUT_COLUMN_HEADER);
  sheet.getRange(1, newCol)
    .setBackground('#1B3A5C')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  return newCol;
}

function formatDateKey_(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return '' + y + m + day;
}