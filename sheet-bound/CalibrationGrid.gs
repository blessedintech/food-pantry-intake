/**
 * CalibrationGrid.gs - Generates a coordinate overlay on the form images
 * 
 * Run generateCalibrationGrid() to produce a PDF with:
 * - 5% grid lines across the form
 * - Labeled X% and Y% coordinates
 * - Both form pages overlaid
 * 
 * Use this to read exact coordinates for field placement.
 * Once you have the coordinates, update PDFGenerator.gs positions.
 * 
 * To use for a NEW form in the future:
 * 1. Upload new form page images to Drive
 * 2. Update the image file IDs in Config.gs
 * 3. Run generateCalibrationGrid()
 * 4. Read coordinates from the calibration PDF
 * 5. Update put() calls in PDFGenerator.gs
 */

function generateCalibrationGrid() {
  var lang = 'en'; // Change to 'es' to calibrate Spanish form
  
  var p1Id = (lang === 'es') ? CONFIG.formImages.es_page1 : CONFIG.formImages.en_page1;
  var p2Id = (lang === 'es') ? CONFIG.formImages.es_page2 : CONFIG.formImages.en_page2;
  
  var page1Img = Utilities.base64Encode(DriveApp.getFileById(p1Id).getBlob().getBytes());
  var page2Img = Utilities.base64Encode(DriveApp.getFileById(p2Id).getBlob().getBytes());
  
  var html = buildCalibrationHtml(page1Img, page2Img);
  
  var pdfBlob = Utilities.newBlob(html, 'text/html', 'temp.html')
    .getAs('application/pdf')
    .setName('CALIBRATION_GRID_' + lang.toUpperCase() + '.pdf');
  
  var folder = DriveApp.getFolderById(CONFIG.pdfFolderId);
  var file = folder.createFile(pdfBlob);
  
  Logger.log('Calibration grid created: ' + file.getUrl());
  SpreadsheetApp.getUi().alert('Calibration grid created!\n\nCheck your PDFs folder in Drive.\n\n' + file.getUrl());
}

function buildCalibrationHtml(page1Img, page2Img) {
  // Build grid overlay SVG
  function makeGrid() {
    var lines = '';
    var labels = '';
    
    // Horizontal lines every 5%
    for (var y = 0; y <= 100; y += 5) {
      var color = (y % 10 === 0) ? 'rgba(255,0,0,0.5)' : 'rgba(255,0,0,0.25)';
      var width = (y % 10 === 0) ? '1' : '0.5';
      lines += '<div style="position:absolute;left:0;top:' + y + '%;width:100%;height:0;border-top:' + width + 'px solid ' + color + ';z-index:10"></div>';
      
      // Y label on left
      var fontSize = (y % 10 === 0) ? '8pt' : '7pt';
      var fontWeight = (y % 10 === 0) ? 'bold' : 'normal';
      var bgColor = (y % 10 === 0) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)';
      labels += '<div style="position:absolute;left:0;top:' + y + '%;font-size:' + fontSize + ';font-weight:' + fontWeight + ';color:red;background:' + bgColor + ';padding:0 3px;z-index:20;line-height:1.2">' + y + '%</div>';
      
      // Y label on right
      labels += '<div style="position:absolute;right:0;top:' + y + '%;font-size:' + fontSize + ';font-weight:' + fontWeight + ';color:red;background:' + bgColor + ';padding:0 3px;z-index:20;line-height:1.2">' + y + '%</div>';
    }
    
    // Vertical lines every 10%
    for (var x = 0; x <= 100; x += 10) {
      var color2 = 'rgba(0,0,255,0.3)';
      var width2 = (x % 20 === 0) ? '1' : '0.5';
      lines += '<div style="position:absolute;left:' + x + '%;top:0;width:0;height:100%;border-left:' + width2 + 'px solid ' + color2 + ';z-index:10"></div>';
      
      // X label at top
      labels += '<div style="position:absolute;left:' + x + '%;top:0;font-size:7pt;font-weight:bold;color:blue;background:rgba(255,255,255,0.85);padding:1px 2px;z-index:20;transform:translateX(-50%)">' + x + '%</div>';
      
      // X label at bottom
      labels += '<div style="position:absolute;left:' + x + '%;bottom:0;font-size:7pt;font-weight:bold;color:blue;background:rgba(255,255,255,0.85);padding:1px 2px;z-index:20;transform:translateX(-50%)">' + x + '%</div>';
    }
    
    // Add 5% vertical lines too (thinner)
    for (var x2 = 5; x2 < 100; x2 += 10) {
      lines += '<div style="position:absolute;left:' + x2 + '%;top:0;width:0;height:100%;border-left:0.5px solid rgba(0,0,255,0.15);z-index:10"></div>';
      labels += '<div style="position:absolute;left:' + x2 + '%;top:0;font-size:6pt;color:blue;background:rgba(255,255,255,0.7);padding:0 2px;z-index:20;transform:translateX(-50%)">' + x2 + '</div>';
    }
    
    return lines + labels;
  }
  
  var grid = makeGrid();
  
  return '<!DOCTYPE html><html><head><style>'
    + '@page{size:letter;margin:0}'
    + 'body{margin:0;padding:0}'
    + '.page{position:relative;width:8.5in;height:11in;overflow:hidden}'
    + '.page img.bg{position:absolute;top:0;left:0;width:100%;height:100%}'
    + '.pb{page-break-before:always}'
    + '</style></head><body>'
    
    // Page 1 with grid
    + '<div class="page">'
    + '<img class="bg" src="data:image/jpeg;base64,' + page1Img + '">'
    + grid
    + '<div style="position:absolute;left:30%;top:1%;font-size:10pt;font-weight:bold;color:red;background:rgba(255,255,255,0.9);padding:2px 8px;z-index:30;border:2px solid red">PAGE 1 - INTAKE FORM - CALIBRATION GRID</div>'
    + '</div>'
    
    // Page 2 with grid
    + '<div class="page pb">'
    + '<img class="bg" src="data:image/jpeg;base64,' + page2Img + '">'
    + grid
    + '<div style="position:absolute;left:25%;top:1%;font-size:10pt;font-weight:bold;color:red;background:rgba(255,255,255,0.9);padding:2px 8px;z-index:30;border:2px solid red">PAGE 2 - INCOME VERIFICATION - CALIBRATION GRID</div>'
    + '</div>'
    
    + '</body></html>';
}