/**
 * SignatureHandler.gs - Digital signature processing
 * 
 * Receives base64-encoded PNG from the form,
 * saves it to the site's Signatures folder in Drive.
 */

function saveSignature(base64Data, rowId) {
  try {
    // Strip the data URL prefix if present
    var raw = base64Data.replace(/^data:image\/png;base64,/, '');
    
    // Decode base64 to blob
    var decoded = Utilities.base64Decode(raw);
    var blob = Utilities.newBlob(decoded, 'image/png', 'SIG_' + rowId + '.png');
    
    // Save to Drive folder
    var folder = DriveApp.getFolderById(CONFIG.signatureFolderId);
    var file = folder.createFile(blob);
    
    return {
      fileId: file.getId(),
      fileUrl: file.getUrl()
    };
    
  } catch (e) {
    Logger.log('Error saving signature: ' + e.toString());
    return { fileId: '', fileUrl: '' };
  }
}
