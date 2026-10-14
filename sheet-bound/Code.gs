// Apps Script runs only one onOpen per project, so every menu is built here.
function onOpen() {
  addCountyFormsMenu_();   // CountyFormGenerator.gs
  SpreadsheetApp.getUi()
    .createMenu('Food Pantry Tools')
    .addItem('Generate PDF for selected row', 'generatePdfForSelected')
    .addItem('Generate all missing PDFs', 'generateAllMissingPdfs')
    .addToUi();
}
