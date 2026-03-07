# Food Pantry Digital Intake System

A bilingual (English/Spanish) digital intake form for food pantries in the Anne Arundel County Food Bank network.

## How It Works

```
Patron's Phone/Tablet
        |
        |  (loads form)
        v
  GitHub Pages          <-- You are here (this repo)
  (index.html)
        |
        |  (submits data via HTTPS)
        v
  Google Apps Script    <-- Backend API (in /backend folder)
        |
        |  (saves data)
        v
  Google Sheets         <-- Database
  Google Drive          <-- Signatures & PDFs
```

**Patrons see:** A clean URL with no Google branding or warning bars.

**Data stays in:** Google Workspace (Sheets + Drive) - nothing is stored on GitHub.

## Quick Start

### For the Form (Frontend)

The form is the `index.html` file at the root of this repo. GitHub Pages serves it automatically.

**Live URL:** `https://[your-username].github.io/[repo-name]/`

To make changes to the form, edit `index.html` and push to the `main` branch. Changes go live in ~1 minute.

### For the Backend

The Apps Script files are in the `/backend` folder. These are **reference copies** - the live versions run in Google Apps Script at script.google.com.

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for full setup instructions.

## Sites

| Site | Schedule | Devices |
|------|----------|---------|
| Pip Moyer Recreation Center | Weekly | Android tablets |
| Tyler Heights Elementary | Monthly | iPhones |

## File Structure

```
/
├── index.html              # The intake form (served by GitHub Pages)
├── README.md               # This file
├── docs/
│   ├── SETUP_GUIDE.md      # Complete setup instructions
│   └── UPDATING_FORMS.md   # How to update when forms change
└── backend/
    ├── Code.gs             # API entry point (doPost)
    ├── Config.gs           # Configuration (Sheet IDs, folder IDs)
    ├── FormHandler.gs      # Validation and row building
    ├── SignatureHandler.gs  # Signature image saving
    ├── SheetManager.gs     # Google Sheets operations
    └── PDFGenerator.gs     # Fillable PDF generation
```

## Support

For technical issues, refer to the [Setup Guide](docs/SETUP_GUIDE.md) or the Project Handover Document.
