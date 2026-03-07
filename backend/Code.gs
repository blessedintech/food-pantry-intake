/**
 * Food Pantry Digital Intake System
 * Code.gs - Backend API (standalone Apps Script project)
 * 
 * UPDATED for GitHub Pages frontend.
 * The form is now hosted on GitHub Pages. This script acts as the
 * backend API that receives submissions via HTTP POST.
 * 
 * doGet() is no longer needed for serving the form.
 * doPost() receives JSON submissions from the form's fetch() call.
 */

// Handle POST submissions from the GitHub Pages form
function doPost(e) {
  try {
    // Parse the incoming JSON
    var formData = JSON.parse(e.postData.contents);
    
    // Process the submission (same logic as before)
    var result = processFormSubmission(formData);
    
    // Return JSON response with CORS headers
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

// Keep doGet() as a simple status page / health check
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'ok', 
      message: 'Food Pantry Intake API is running.',
      version: '2.0',
      note: 'Form is hosted on GitHub Pages. This endpoint accepts POST submissions.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Process form submission (unchanged from original)
function processFormSubmission(formData) {
  try {
    // 1. Validate required fields
    var errors = validateForm(formData);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; ') };
    }
    
    // 2. Generate row ID
    var rowId = generateRowId();
    
    // 3. Save signature to Drive
    var sigResult = saveSignature(formData.signatureBase64, rowId);
    
    // 4. Build and append row to Sheet
    var row = buildRow(formData, rowId, sigResult);
    appendRow(row);
    
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

// Custom menu for Sheet UI (only for the BOUND script in the Sheet)
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
    'Version: 2.0 (GitHub Pages frontend)\n\n' +
    'Form hosted at: [Your GitHub Pages URL]\n' +
    'Questions? Contact the project lead.'
  );
}
