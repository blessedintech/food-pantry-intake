/**
 * Config.gs - Configuration for single deployment serving all sites
 * 
 * One Apps Script project, one Sheet, one set of Drive folders.
 * The site is selected by the patron/volunteer on the form.
 */

var CONFIG = {
  // Google Sheet - paste the Sheet ID from the URL
  // Example URL: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
  sheetId: 'PASTE_YOUR_SHEET_ID_HERE',
  dataTabName: 'DATA',
  
  // Google Drive folders - paste folder IDs from URLs
  // Example URL: https://drive.google.com/drive/folders/FOLDER_ID_HERE
  signatureFolderId: 'PASTE_YOUR_SIGNATURES_FOLDER_ID_HERE',
  pdfFolderId: 'PASTE_YOUR_PDFS_FOLDER_ID_HERE',
  
  // Site display names (used in PDFs and confirmations)
  sites: {
    'pip_moyer': 'Pip Moyer Recreation Center',
    'tyler_heights': 'Tyler Heights Elementary',
  },
};

// Helper to get site display name
function getSiteName(siteId) {
  return CONFIG.sites[siteId] || siteId;
}
