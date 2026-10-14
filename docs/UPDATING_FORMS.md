# Updating Forms When the County Changes Them

This guide explains what to do when the county sends a new version of the intake form, the income thresholds, or the reporting templates.

## When the Intake Form Changes

If the county sends you a new paper form with different fields or wording:

### Step 1: Update the Digital Form (index.html)

1. Go to your GitHub repository
2. Edit `index.html`
3. Find the relevant section (sections are labeled with HTML comments, for example `SECTION E: INCOME`)
4. Add, remove, or modify fields to match the new paper form
5. Update the text in BOTH languages: every label lives in the `T` object, with an English and a Spanish version
6. Commit the changes. The form updates in about 1 minute.

### Step 2: Update the Backend (if data fields changed)

If the form now collects different data:

1. Update `FormHandler.gs` to handle new fields
2. Update `SheetManager.gs` if new columns are needed
3. Run `setupSheetHeaders()` to add new column headers
4. Deploy a new version of the web app (see "Updating the Backend" in the [Setup Guide](SETUP_GUIDE.md)). Saving alone does not change the live app.

### Step 3: Check Everything That Reads the Sheet

Checkout and both county report generators read Sheet columns by position. If you add, remove or move a column, check `CheckoutBackend.gs` (the `COL_` values), `CountyFormGenerator.gs` and `NeighborIntakeXlsx.gs`. See [SHEET_LAYOUT.md](SHEET_LAYOUT.md).

## When Only Income Thresholds Change

This is the most common annual update (the LYF income table changes every program year). You only need to:

1. Edit `index.html` - find `const INCOME_DATA` and update the dollar amounts
2. Commit the change

No backend changes needed.

## When a County Report Template Changes

The county's Word intake form and Excel Neighbor Intake Database are filled by editing the template files directly, so the generators depend on the template's exact layout. This has already happened once: the Excel template went from 37 to 42 columns in FY26.

1. Upload the new template to Drive as an Office file. Do NOT convert it to Google Docs or Sheets.
2. Share it with the script account (Viewer)
3. In the Sheet's bound script (Extensions > Apps Script), update the file ID: `TEMPLATE_FILE_ID` in `CountyFormGenerator.gs` for the Word form, or `XLSX_TEMPLATE_FILE_ID` in `NeighborIntakeXlsx.gs` for the Excel file
4. Run `diagnose` or `diagnoseXlsx` and check View > Logs for OK
5. Compare the new template's columns with the old one:
   - **Excel:** the generator fills the DATA tab and leaves the formula tabs alone. If columns moved, update `mapRowToXlsx_` (and `mapRaceEthnicityCols_` for the race and ethnicity block) in `NeighborIntakeXlsx.gs`.
   - **Word:** the generator expects the table layout set in `CountyFormGenerator.gs` (`COL_WIDTHS`, `ROWS_PER_PAGE`). If the table changed, update those and `mapRow_`.
6. Generate a report for a past month you already filed and compare it with the filed copy before using it for real

No web app deploy is needed; the bound scripts run whatever is saved.

## When Adding a New Pantry Site

1. Edit `index.html` - find the site dropdown (`<option value="pip_moyer">`) and add the new option
2. In the web app project, edit `Config.gs` - add the new site to the `sites` object - and deploy a new version
3. In the Sheet's bound script, add the site to `sites` in `Config.gs`, and to the site picker and `buildXlsxFilename_` in `NeighborIntakeXlsx.gs`, so the Excel report can be generated for that site
4. Print new QR codes for the new site
5. Data flows to the same Sheet with the site ID in the Site ID column

If the new site needs its own Sheet, it needs its own web app deployment and Checkout as well; follow the full [Setup Guide](SETUP_GUIDE.md).

## About the Per-Row PDF

Both Apps Script projects contain a `PDFGenerator.gs` that can make a PDF copy of a single intake row ("Generate PDF for selected row" / "Generate all missing PDFs"). The two versions differ: the web app's builds the page from `PDFTemplate.html`, and the bound script's overlays the answers on images of the county form (`formImages` in `Config.gs`; `CalibrationGrid.gs` helps place the text). As of October 2026 PDFs are not being generated - the PDF File ID column is empty - so no PDF update is needed when forms change.

## Summary Checklist

For any form change:

- [ ] Updated index.html on GitHub (both languages)
- [ ] Updated FormHandler.gs / SheetManager.gs (if data structure changed)
- [ ] Deployed a new version of the web app (if backend changed)
- [ ] Checked Checkout and both county generators (if Sheet columns changed)
- [ ] Updated the template file ID and column mapping (if a county template changed)
- [ ] Tested end-to-end with a sample submission
- [ ] Generated and printed new QR codes (if URL changed)
