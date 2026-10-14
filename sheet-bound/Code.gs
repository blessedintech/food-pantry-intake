function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Food Pantry Tools')
    .addItem('Generate PDF for selected row', 'generatePdfForSelected')
    .addItem('Generate all missing PDFs', 'generateAllMissingPdfs')
    .addToUi();
}