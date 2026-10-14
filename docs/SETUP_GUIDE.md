# Setup Guide - Food Pantry Digital Intake System

This guide walks through setting up the complete system from scratch. It's written so someone with minimal technical experience can follow it.

## What You Need Before Starting

- A GitHub account (free at github.com)
- A Google account that owns the Google Sheet and Drive folders (the "script account")
- A computer with a web browser (Chrome recommended)
- The county's Word intake form template (.docx) and Excel Neighbor Intake Database template (.xlsx), if you will generate county reports

## Overview

There are four parts to set up:

1. **GitHub Pages** - hosts the intake form (what neighbors see) and the checkout app (what the distribution lead uses)
2. **Standalone Apps Script web app** (`backend/`) - receives form submissions and serves the checkout app's data. Neighbors never see it.
3. **Checkout** - a username and password for the distribution lead, stored in the web app's Script Properties
4. **Sheet-bound Apps Script** (`sheet-bound/`) - adds the County Forms menu to the Sheet for the monthly county reports

All four share one Google Sheet. See [SHEET_LAYOUT.md](SHEET_LAYOUT.md) for its columns.

---

## Part 1: Set Up GitHub Pages (the form and checkout app)

### Step 1: Create the Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon in the top right, then **New repository**
3. Name it something like `food-pantry-intake`
4. Set it to **Public**
5. Check **Add a README file**
6. Click **Create repository**

### Step 2: Upload the Files

1. In your new repository, click **Add file** > **Upload files**
2. Drag and drop ALL files from this project folder:
   - `index.html` (the intake form)
   - `checkout.html` (the checkout app)
   - `README.md` (documentation)
   - The `docs/`, `backend/` and `sheet-bound/` folders
3. In the "Commit changes" box, type "Initial upload"
4. Click **Commit changes**

### Step 3: Enable GitHub Pages

1. In your repository, click **Settings** (gear icon)
2. In the left sidebar, click **Pages**
3. Under "Source", select **Deploy from a branch**
4. Under "Branch", select **main** and folder **/ (root)**
5. Click **Save**
6. Wait 1-2 minutes, then refresh the page
7. You'll see a green box with your URL, for example `https://blessedintech.github.io/food-pantry-intake/`
8. Click that URL to verify the form loads. The checkout app is the same URL with `checkout.html` on the end.

### Step 4: Point Both Pages at the Backend

Both pages need the web app URL you get in Part 2, Step 5. The same URL goes in both files.

1. In your repository, open `index.html` and click the pencil icon (Edit)
2. Search for `const BACKEND_URL` and replace the URL in quotes with your web app URL
3. Click **Commit changes**
4. Open `checkout.html`, search for `const APPS_SCRIPT_URL`, replace the URL the same way, and commit

---

## Part 2: Set Up the Backend (standalone Apps Script web app)

### Step 1: Create the Apps Script Project

1. Go to [script.google.com](https://script.google.com) signed in as the script account
2. Click **New project**
3. Name it, for example `FoodPantry_PipMoyer`

### Step 2: Add the Backend Files

For EACH file in the `backend/` folder:

1. In the Apps Script editor, click **+** next to "Files"
2. Click **Script** for `.gs` files, or **HTML** for `.html` files
3. Name it to match the filename (without the extension):
   - `Code` (already exists - just replace its contents)
   - `Config`
   - `FormHandler`
   - `SignatureHandler`
   - `SheetManager`
   - `CheckoutBackend`
   - `PDFGenerator`
   - `PDFTemplate` (HTML)
   - `Index` (HTML - the legacy form, served if someone opens the web app URL directly)
4. Paste the contents of the corresponding file

### Step 3: Update the IDs

Open `Config.gs` and replace the placeholder values with your actual IDs:

- **sheetId**: Open your Google Sheet, the ID is in the URL between `/d/` and `/edit`
- **signatureFolderId**: Open the Signatures folder in Drive, the ID is in the URL after `/folders/`
- **pdfFolderId**: Same process for the PDFs folder
- **sites**: the site IDs and names offered on the form

Open `CheckoutBackend.gs` and set **INTAKE_SPREADSHEET_ID** to the same Sheet ID. Checkout must point at this site's intake Sheet, not any other sheet.

### Step 4: Set Up the Sheet

1. Run the `setupSheetHeaders` function (select it from the dropdown, click Run)
2. Authorize the script when prompted (click through the "unsafe" warnings - this is YOUR script)

### Step 5: Deploy as Web App

1. Click **Deploy** > **New deployment**
2. Click the gear icon, select **Web app**
3. Set **Execute as**: "Me"
4. Set **Who has access**: "Anyone"
5. Click **Deploy**
6. Copy the Web app URL (it looks like: `https://script.google.com/macros/s/ABC.../exec`)

**IMPORTANT**: This URL goes into both pages. Go to Part 1, Step 4 and paste it there.

### Step 6: Test the Form

1. Open your GitHub Pages URL in a phone browser
2. Fill out the form with test data
3. Submit
4. Check your Google Sheet - you should see the new row
5. Check your Drive - you should see the signature PNG

---

## Part 3: Set Up Checkout

The checkout app shares the web app from Part 2. It only needs a login.

1. In the Apps Script editor, click **Project Settings** (gear icon)
2. Under **Script Properties**, add two properties:
   - `CHECKOUT_USERNAME` - the shared login name
   - `CHECKOUT_PASSWORD` - the shared password
3. Click **Save script properties**

To change the password later, edit the property. No redeploy is needed.

Test it: open `checkout.html` on your GitHub Pages URL, sign in, and pick today's date. Your test submission from Part 2 should appear. Tap it to mark it served; the Sheet gains a **Checked Out** column with a timestamp the first time this happens. A sign-in lasts 12 hours.

Note: in the Apps Script editor's Run dropdown, the checkout functions do not appear, because their names end in an underscore. That is expected.

---

## Part 4: Set Up County Reports (Sheet-bound script)

These scripts live inside the intake Sheet itself, not in the web app project.

### Step 1: Put the Templates in Drive

1. Upload the county's Word intake form template (.docx) and Excel Neighbor Intake Database template (.xlsx) to Drive. Keep them as Office files - do NOT convert them to Google Docs or Sheets, or the layout and formulas are lost.
2. Create an output folder for the generated reports
3. If these are owned by another account, share all three with the script account (Viewer is enough for the templates; the output folder needs Editor)

### Step 2: Add the Scripts

1. Open the intake Sheet and click **Extensions** > **Apps Script**
2. Add each file from the `sheet-bound/` folder the same way as Part 2, Step 2
3. In `CountyFormGenerator.gs`, set **TEMPLATE_FILE_ID** (the .docx) and **OUTPUT_FOLDER_ID**
4. In `NeighborIntakeXlsx.gs`, set **XLSX_TEMPLATE_FILE_ID** (the .xlsx). It uses the same output folder.
5. In `Config.gs`, set the same IDs as the backend `Config.gs`

### Step 3: Authorize and Check Access

1. Select `diagnose` in the Run dropdown and click Run. Authorize when prompted.
2. Open **View** > **Logs**. Each line should say OK. A FAIL means a template or folder isn't shared with the script account.
3. Run `diagnoseXlsx` the same way for the Excel template

### Step 4: Generate Reports

Reload the Sheet. The **County Forms** menu appears with:

- **Generate County Intake Form (DOCX)...** - pick a date range
- **Generate Neighbor Intake Database (XLSX)...** - pick a month (defaults to last month) and a site
- **Generate DOCX for Today** / **Generate DOCX for This Month**

Generated files land in the output folder. For county filing, generate the Excel file once per site; the All Sites option counts distributions per site, so its total is not a sum of both sites.

Note: the bound project also has a separate `onOpen` in `Code.gs` that adds a **Food Pantry Tools** menu. Apps Script runs only one `onOpen` per project, so only one of the two menus appears.

---

## Making Changes to the Form or Checkout App

To edit `index.html` or `checkout.html` after they're live:

1. Go to your GitHub repository
2. Click on the file
3. Click the pencil icon to edit
4. Make your changes
5. Click **Commit changes**
6. Wait about 1 minute for the change to go live

No Apps Script changes needed. Neighbors see the change as soon as GitHub Pages republishes.

---

## Updating the Backend

**Saving in the Apps Script editor does NOT change the live web app.** The web app keeps running the version it was deployed with until you deploy a new version:

1. Go to [script.google.com](https://script.google.com)
2. Open the web app project
3. Edit the relevant file and save
4. Click **Deploy** > **Manage deployments**
5. Click the pencil icon on your deployment
6. Change **Version** to "New version"
7. Click **Deploy**

Keep the same deployment so the URL in `index.html` and `checkout.html` stays the same.

The Sheet-bound county report scripts are different: they run whatever is saved, with no deploy step.

---

## Generating QR Codes

The QR code should point to your GitHub Pages URL, never the `script.google.com` URL (phones show that as a suspicious link):
`https://blessedintech.github.io/food-pantry-intake/`

Use any free QR code generator (qr-code-generator.com, etc.) to create and print QR codes for each site.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Form loads but won't submit | Check that `BACKEND_URL` in index.html matches your Apps Script deployment URL |
| "CORS error" in browser console | Make sure Apps Script is deployed with "Anyone" access, and that no `Content-Type` header was added to the form's `fetch()` |
| Form doesn't load at all | Check that GitHub Pages is enabled in Settings > Pages |
| Changes not showing up | GitHub Pages can take 1-2 minutes to update after a commit |
| Backend change not taking effect | You saved but didn't deploy a new version (see Updating the Backend) |
| "Script error" on submission | Check the Apps Script execution log at script.google.com |
| Sheet not receiving data | Verify the Sheet ID in Config.gs matches your actual Sheet |
| Checkout login fails | `CHECKOUT_USERNAME` / `CHECKOUT_PASSWORD` missing from Script Properties, or `APPS_SCRIPT_URL` wrong in checkout.html |
| Checkout shows no or the wrong neighbors | `INTAKE_SPREADSHEET_ID` in CheckoutBackend.gs points at the wrong Sheet |
| PERMISSION_DENIED when generating a report | A template or the output folder isn't shared with the script account. Run `diagnose` / `diagnoseXlsx` |
| County Forms menu missing | Reload the Sheet; see the `onOpen` note in Part 4 |
| `getUi().alert()` error when running from the editor | Run report functions from the Sheet's menu, not the editor |
| File access errors in the Apps Script editor | You're signed into the wrong Google account in that browser tab |

---

## Custom Domain (Optional)

Instead of `blessedintech.github.io/food-pantry-intake`, you can use a custom domain like `intake.blessedintech.org`:

1. Buy a domain or use one you already own
2. In your repo Settings > Pages > Custom domain, enter your domain
3. At your domain registrar, add a CNAME record pointing to `blessedintech.github.io`
4. Wait for DNS to propagate (up to 24 hours)
5. Check "Enforce HTTPS"
6. Update QR codes with the new URL
