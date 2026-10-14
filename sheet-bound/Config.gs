/**
 * Config.gs - Configuration for single deployment serving all sites
 * 
 * One Apps Script project, one Sheet, one set of Drive folders.
 * The site is selected by the neighbor or volunteer on the form.
 */

var CONFIG = {
  sheetId: 'PASTE_YOUR_SHEET_ID_HERE',
  dataTabName: 'DATA',
  signatureFolderId: 'PASTE_YOUR_SIGNATURES_FOLDER_ID_HERE',
  pdfFolderId: 'PASTE_YOUR_PDFS_FOLDER_ID_HERE',
  
  // Form background images (uploaded to Drive)
  // Upload the 4 JPEG files, then paste each file's ID here
  // To get a file ID: right-click file in Drive > Share > Copy link
  // The ID is between /d/ and /view in the URL
  formImages: {
    en_page1: 'PASTE_EN_PAGE1_IMAGE_ID',     // ENG_Page1_Intake.jpeg
    en_page2: 'PASTE_EN_PAGE2_IMAGE_ID',     // ENG_Page2_Income.jpeg
    es_page1: 'PASTE_ES_PAGE1_IMAGE_ID',    // SPAN_Page1_Intake.jpeg
    es_page2: 'PASTE_ES_PAGE2_IMAGE_ID',    // SPAN_Page2_Income.jpeg
  },

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
