# Updating Forms When the County Changes Them

This guide explains what to do when you receive a new version of the intake forms or county verification forms.

## When the Form Layout Changes

If the county sends you a new paper form with different fields, different layout, or different income thresholds:

### Step 1: Update the Digital Form (index.html)

1. Go to your GitHub repository
2. Edit `index.html`
3. Find the relevant section (fields are labeled with HTML comments)
4. Add, remove, or modify fields to match the new paper form
5. Update the income table values if thresholds changed
6. Commit the changes

### Step 2: Update the Fillable PDF Template

The fillable PDF is what gets generated for audit records. When the paper form changes, you need a new fillable version.

**To create a new fillable PDF:**

1. Get the new blank form as a PDF
2. Open it in a PDF form editor:
   - **Free online**: [Sejda](https://www.sejda.com/pdf-forms), [DocFly](https://www.docfly.com)
   - **Desktop**: LibreOffice Draw (free), Adobe Acrobat (paid)
3. Drag text fields onto every blank line
4. Drag checkboxes onto every checkbox location
5. Name each field clearly (e.g., "First Name", "Last Name", "HH1 Low")
6. Save the fillable PDF
7. Upload it to Google Drive
8. Update the file ID in Config.gs (in Apps Script)

**To read the field names from an existing fillable PDF (for wiring up the code):**

Use this free online tool: [PDF Form Field Viewer](https://www.pdfescape.com) or ask your technical contact to run this Python script:

```python
from pypdf import PdfReader
reader = PdfReader('your_fillable_form.pdf')
for name, field in reader.get_fields().items():
    print(f"  {name}: {field.get('/FT', 'unknown')}")
```

### Step 3: Update the PDF Generator

If field names changed in the new fillable PDF, update `PDFGenerator.gs` in Apps Script:

1. Open the script at script.google.com
2. Find the `textFields` and `checkboxes` objects in PDFGenerator.gs
3. Update the field name mappings to match the new fillable PDF's field names
4. Save and redeploy

### Step 4: Update the Backend (if data fields changed)

If the form now collects different data:

1. Update `FormHandler.gs` to handle new fields
2. Update `SheetManager.gs` if new columns are needed
3. Run `setupSheetHeaders()` to add new column headers
4. Redeploy the Apps Script web app

## When Only Income Thresholds Change

This is the most common annual update. You only need to:

1. Edit `index.html` - find the `incomeData` array and update the dollar amounts
2. Create a new fillable PDF with updated amounts (or update the existing one)
3. Upload to Drive and update Config.gs if the file ID changed

No backend changes needed.

## When Adding a New Pantry Site

1. Edit `index.html` - find the site dropdown and add the new option
2. Edit `Config.gs` in Apps Script - add the new site to the `sites` object
3. Print new QR codes for the new site
4. That's it - data flows to the same Sheet with the site ID in the Site column

## Summary Checklist

For any form change:

- [ ] Updated index.html on GitHub
- [ ] Created new fillable PDF (if layout changed)
- [ ] Uploaded fillable PDF to Drive
- [ ] Updated Config.gs with new file ID (if applicable)
- [ ] Updated PDFGenerator.gs field mappings (if field names changed)
- [ ] Updated FormHandler.gs (if data structure changed)
- [ ] Redeployed Apps Script web app (if backend changed)
- [ ] Tested end-to-end with a sample submission
- [ ] Generated and printed new QR codes (if URL changed)
