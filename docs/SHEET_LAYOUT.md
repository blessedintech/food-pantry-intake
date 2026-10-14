# Sheet Layout

The intake Sheet is the only place the parts of the system meet. The web app writes to it; Checkout and both county report generators read it. One row per household per visit, on the first tab (`DATA`).

Everything reads columns **by position**. If you add, remove or move a column, check every reader (see [UPDATING_FORMS.md](UPDATING_FORMS.md)).

| Column | Header | Written by | Notes |
|--------|--------|------------|-------|
| A | Row ID | Form submission | Text, not a date. See "Row ID" below |
| B | Timestamp | Form submission | |
| C | Entry Mode | Form submission | `digital` for everything sent from the form |
| D | Language | Form submission | `en` or `es` |
| E | First Name | Form submission | Read by Checkout |
| F | Last Name | Form submission | Read by Checkout |
| G | Phone | Form submission | |
| H | City | Form submission | Filled from zip code |
| I | State | Form submission | Filled from zip code |
| J | Zip Code | Form submission | |
| K | Email | Form submission | |
| L | Children | Form submission | |
| M | Adults | Form submission | |
| N | Seniors | Form submission | |
| O | Household Size | Form submission | Read by Checkout |
| P | Govt Shutdown | Form submission | |
| Q | Shutdown Reason | Form submission | |
| R | Unhoused | Form submission | |
| S | Income Tier | Form submission | `60AMI` or `61ALICE` = below ALICE; `AboveALICE` = above |
| T | Race/Ethnicity | Form submission | One combined value, for example `black_nonhispanic` |
| U | 62+ | Form submission | Head of household status |
| V | Female-Headed | Form submission | Head of household status |
| W | Disabled | Form submission | Head of household status |
| X | Unemployed | Form submission | Head of household status |
| Y | Veteran | Form submission | Head of household status |
| Z | Homeless | Form submission | Head of household status |
| AA | Furloughed | Form submission | Head of household status |
| AB | SNAP | Form submission | Head of household status |
| AC | First Visit | Form submission | |
| AD | Referral Source | Form submission | |
| AE | Info Changed | Form submission | |
| AF | Change Details | Form submission | |
| AG | Signature File ID | Form submission | Signature PNG in Drive |
| AH | Signature URL | Form submission | |
| AI | PDF File ID | PDF generator | Empty unless a per-row PDF was generated |
| AJ | Site ID | Form submission | `pip_moyer`, `tyler_heights` |
| AK | Checked Out | Checkout | Not created by `setupSheetHeaders()`. Checkout adds it the first time a household is marked served, and finds it by its header text |

Columns A to AJ are created by `setupSheetHeaders()` in `SheetManager.gs`.

## Row ID

The Row ID is the date of the submission plus a number that restarts at 001 each day, for example `20261016_001`. Each submission takes the highest number already used that day and adds 1. The number is assigned while the backend holds a lock, so two submissions arriving at the same moment get different numbers.

Rows written before v1.1 was deployed use the older scheme, where the number is the Sheet's row count (for example `20261009_3970`), and some of those Row IDs are duplicated. They are left as they are.

The county report generators find a date's rows by the first 8 characters of the Row ID. Checkout lists each row with its sheet row number and marks that exact row, after checking it still holds the expected Row ID. If someone has sorted or deleted rows in the Sheet so the row moved, Checkout falls back to the Row ID, and asks for a refresh if that Row ID is shared.

## Paper Entries

Forms collected on paper during an outage and typed in afterwards carry the date they were entered, not the date of the distribution.
