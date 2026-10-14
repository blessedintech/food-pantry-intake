# Food Pantry Digital Intake System

A bilingual (English/Spanish) digital intake form, distribution checkout and county reporting system for food pantries in the Anne Arundel County Food Bank network.

## How It Works

```
Neighbor's Phone/Tablet            Distribution Lead's Device
        |                                   |
        |  (loads form)                     |  (loads checkout)
        v                                   v
  GitHub Pages: index.html           GitHub Pages: checkout.html
        |                                   |
        |  (fetch POST)                     |  (login, list, mark served)
        v                                   v
  Google Apps Script web app  <-- backend/ (intake + checkout, one project)
        |
        v
  Google Sheets (DATA tab)    <-- Database, one row per household visit
  Google Drive                <-- Signatures
        ^
        |
  Sheet-bound Apps Script     <-- sheet-bound/ (County Forms menu:
                                   county Word intake form, county Excel database)
```

**Neighbors see:** A clean URL with no Google branding or warning bars.

**Data stays in:** Google Workspace (Sheets + Drive) - nothing is stored on GitHub.

## Quick Start

### For the Form and Checkout (Frontend)

`index.html` (intake form) and `checkout.html` (distribution checkout) at the root of this repo are served by GitHub Pages.

**Live URL:** `https://blessedintech.github.io/food-pantry-intake/`

Changes pushed to the `main` branch go live in about 1 minute.

### For the Backend

The Apps Script files are **reference copies** of what is installed. The live versions run in Google Apps Script at script.google.com. Real Sheet, folder and file IDs are replaced with `PASTE_...` placeholders here.

- `backend/` - the standalone web app (deployment version 13). Handles intake submissions and the checkout app on the same URL. Checkout credentials are stored in Script Properties (`CHECKOUT_USERNAME`, `CHECKOUT_PASSWORD`), never in code.
- `sheet-bound/` - the script bound to the intake Sheet. Adds the County Forms menu that generates the county's Word intake form and Excel Neighbor Intake Database from their templates.

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for setup instructions and [docs/SHEET_LAYOUT.md](docs/SHEET_LAYOUT.md) for the Sheet columns.

## Sites

| Site | Schedule | Devices |
|------|----------|---------|
| Pip Moyer Recreation Center | Weekly | Android tablets |
| Tyler Heights Elementary | Monthly | iPhones |

A third site ID, `marshall_hope`, is configured in the backend but is not yet offered on the form.

## File Structure

```
/
├── index.html                  # Intake form (GitHub Pages)
├── checkout.html               # Distribution checkout app (GitHub Pages)
├── README.md                   # This file
├── docs/
│   ├── SETUP_GUIDE.md          # Setup instructions
│   ├── UPDATING_FORMS.md       # How to update when forms or templates change
│   └── SHEET_LAYOUT.md         # Columns of the intake Sheet
├── backend/                    # Standalone Apps Script web app
│   ├── appsscript.json         # Project manifest
│   ├── Code.gs                 # doPost/doGet; routes checkout actions, then intake
│   ├── CheckoutBackend.gs      # Checkout login, list, mark served / undo
│   ├── Config.gs               # Configuration (Sheet ID, folder IDs, sites)
│   ├── FormHandler.gs          # Validation, Row ID, row building
│   ├── SignatureHandler.gs     # Signature image saving
│   ├── SheetManager.gs         # Google Sheets operations
│   ├── PDFGenerator.gs         # Per-row PDF generation
│   ├── PDFTemplate.html        # PDF layout
│   └── Index.html              # Legacy Apps Script-served form (doGet fallback)
└── sheet-bound/                # Script bound to the intake Sheet
    ├── appsscript.json         # Project manifest
    ├── Code.gs                 # Food Pantry Tools menu
    ├── CountyFormGenerator.gs  # County Forms menu; county Word intake form (.docx)
    ├── NeighborIntakeXlsx.gs   # County Excel Neighbor Intake Database (.xlsx)
    ├── CalibrationGrid.gs      # Template geometry calibration helper
    ├── Config.gs               # Configuration (Sheet ID, folder IDs, form images)
    ├── SheetManager.gs         # Google Sheets operations
    ├── PDFGenerator.gs         # Per-row PDF generation (image overlay)
    └── PDFTemplate.html        # PDF layout
```

## Support

For technical issues, refer to the [Setup Guide](docs/SETUP_GUIDE.md) or the Project Handover Document.
