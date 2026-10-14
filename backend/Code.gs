/**
 * Food Pantry Digital Intake System
 * Code.gs - Backend API (standalone Apps Script project)
 *
 * Handles two kinds of HTTP requests on the same deployment URL:
 *   1. Intake form submissions from GitHub Pages (existing behavior)
 *   2. Checkout app actions: login, list, checkout, uncheckout (new)
 *
 * Checkout actions are dispatched to routeCheckoutGet_ / routeCheckoutPost_
 * in CheckoutBackend.gs. Anything that isn't a checkout action falls through
 * to the original intake form handling.
 */

// ============================================================
// HTTP entry points
// ============================================================

function doPost(e) {
  try {
    // Check if this is a checkout app action first.
    var handled = routeCheckoutPost_(e);
    if (handled) return handled;

    // Otherwise, treat as intake form submission (original behavior).
    var formData = JSON.parse(e.postData.contents);
    var result = processFormSubmission(formData);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Server error. Please try again.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Checkout app GET endpoints (e.g. ?action=list).
  var handled = routeCheckoutGet_(e);
  if (handled) return handled;

  // Fallback: serve the legacy hosted form for anyone who visits the bare URL.
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Food Pantry Intake Form')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

// ============================================================
// Intake form submission processor (unchanged from original)
// ============================================================

function processFormSubmission(formData) {
  try {
    // 1. Validate required fields
    var errors = validateForm(formData);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; ') };
    }

    // 2-4. Generate the Row ID, save the signature and append the row while
    // holding the script lock, so two submissions arriving at the same moment
    // can't be given the same Row ID. waitLock throws after 30s, which lands
    // in the catch below and asks the neighbor to try again.
    var rowId;
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      rowId = generateRowId();
      var sigResult = saveSignature(formData.signatureBase64, rowId);
      var row = buildRow(formData, rowId, sigResult);
      appendRow(row);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    // 5. Return success with info for confirmation screen
    return {
      success: true,
      rowId: rowId,
      householdSize: (formData.children || 0) + (formData.adults || 0) + (formData.seniors || 0),
      patronName: formData.firstName + ' ' + formData.lastName
    };

  } catch (e) {
    Logger.log('Error processing submission: ' + e.toString());
    return { success: false, error: 'An error occurred. Please try again.' };
  }
}

// ============================================================
// Spreadsheet UI menu (only fires when opened from a bound sheet)
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Food Pantry Tools')
    .addItem('Generate PDF for selected row', 'generatePdfForSelected')
    .addItem('Generate all missing PDFs', 'generateAllMissingPdfs')
    .addSeparator()
    .addItem('About', 'showAbout')
    .addToUi();
}

function showAbout() {
  SpreadsheetApp.getUi().alert(
    'Food Pantry Digital Intake System\n' +
    'Sites: Pip Moyer, Tyler Heights\n' +
    'Version: 2.1 (Checkout app added)\n\n' +
    'Form hosted at: [Your GitHub Pages URL]\n' +
    'Questions? Contact the project lead.'
  );
}