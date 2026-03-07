# Setup Guide - Food Pantry Digital Intake System

This guide walks through setting up the complete system from scratch. It's written so someone with minimal technical experience can follow it.

## What You Need Before Starting

- A GitHub account (free at github.com)
- A Google account that owns the Google Sheet and Drive folders
- A computer with a web browser (Chrome recommended)

## Overview

There are two parts to set up:

1. **GitHub Pages** - hosts the intake form (what patrons see)
2. **Google Apps Script** - the backend that saves data (patrons never see this)

---

## Part 1: Set Up GitHub Pages (the form)

### Step 1: Create the Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon in the top right, then **New repository**
3. Name it something like `food-pantry-intake`
4. Set it to **Public**
5. Check **Add a README file**
6. Click **Create repository**

### Step 2: Upload the Form Files

1. In your new repository, click **Add file** > **Upload files**
2. Drag and drop ALL files from this project folder:
   - `index.html` (the form)
   - `README.md` (documentation)
   - The `docs/` folder
   - The `backend/` folder
3. In the "Commit changes" box, type "Initial upload"
4. Click **Commit changes**

### Step 3: Enable GitHub Pages

1. In your repository, click **Settings** (gear icon)
2. In the left sidebar, click **Pages**
3. Under "Source", select **Deploy from a branch**
4. Under "Branch", select **main** and folder **/ (root)**
5. Click **Save**
6. Wait 1-2 minutes, then refresh the page
7. You'll see a green box with your URL: `https://YOUR-USERNAME.github.io/food-pantry-intake/`
8. Click that URL to verify the form loads

### Step 4: Update the Backend URL in the Form

The form needs to know where to send data. You'll get this URL in Part 2.

1. In your repository, click on `index.html`
2. Click the pencil icon (Edit) in the top right
3. Press Ctrl+F (or Cmd+F on Mac) and search for: `YOUR_APPS_SCRIPT_WEB_APP_URL_HERE`
4. Replace it with the actual Apps Script URL (from Part 2, Step 5)
5. Click **Commit changes**

---

## Part 2: Set Up the Backend (Apps Script)

### Step 1: Create the Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New project**
3. Name it "Food Pantry Intake Backend"

### Step 2: Add the Backend Files

For EACH file in the `backend/` folder:

1. In the Apps Script editor, click **+** next to "Files"
2. Click **Script**
3. Name it to match the filename (without .gs extension):
   - `Code` (already exists - just replace its contents)
   - `Config`
   - `FormHandler`
   - `SignatureHandler`
   - `SheetManager`
   - `PDFGenerator`
4. Paste the contents of the corresponding .gs file

### Step 3: Update Config.gs

Open Config.gs and replace the placeholder values with your actual IDs:

- **sheetId**: Open your Google Sheet, the ID is in the URL between `/d/` and `/edit`
- **signatureFolderId**: Open the Signatures folder in Drive, the ID is in the URL after `/folders/`
- **pdfFolderId**: Same process for the PDFs folder
- **fillablePdfs.en**: The file ID of your fillable English PDF template
- **fillablePdfs.es**: The file ID of your fillable Spanish PDF template

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

**IMPORTANT**: This URL goes back into the form. Go to Part 1, Step 4 and paste it there.

### Step 6: Test the System

1. Open your GitHub Pages URL in a phone browser
2. Fill out the form with test data
3. Submit
4. Check your Google Sheet - you should see the new row
5. Check your Drive - you should see the signature PNG

---

## Making Changes to the Form

To edit the form after it's live:

1. Go to your GitHub repository
2. Click on `index.html`
3. Click the pencil icon to edit
4. Make your changes
5. Click **Commit changes**
6. Wait ~1 minute for the change to go live

No redeployment needed. No Apps Script changes needed. Just edit and commit.

---

## Updating the Backend

If you need to change how data is processed:

1. Go to [script.google.com](https://script.google.com)
2. Open the "Food Pantry Intake Backend" project
3. Edit the relevant .gs file
4. Click **Deploy** > **Manage deployments**
5. Click the pencil icon on your deployment
6. Change **Version** to "New version"
7. Click **Deploy**

---

## Generating QR Codes

The QR code should point to your GitHub Pages URL:
`https://YOUR-USERNAME.github.io/food-pantry-intake/`

Use any free QR code generator (qr-code-generator.com, etc.) to create and print QR codes for each site.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Form loads but won't submit | Check that the BACKEND_URL in index.html matches your Apps Script deployment URL |
| "CORS error" in browser console | Make sure Apps Script is deployed with "Anyone" access |
| Form doesn't load at all | Check that GitHub Pages is enabled in Settings > Pages |
| Changes not showing up | GitHub Pages can take 1-2 minutes to update after a commit |
| "Script error" on submission | Check the Apps Script execution log at script.google.com |
| Sheet not receiving data | Verify the Sheet ID in Config.gs matches your actual Sheet |

---

## Custom Domain (Optional)

Instead of `your-username.github.io/food-pantry-intake`, you can use a custom domain like `intake.blessedintech.org`:

1. Buy a domain or use one you already own
2. In your repo Settings > Pages > Custom domain, enter your domain
3. At your domain registrar, add a CNAME record pointing to `your-username.github.io`
4. Wait for DNS to propagate (up to 24 hours)
5. Check "Enforce HTTPS"
6. Update QR codes with the new URL
