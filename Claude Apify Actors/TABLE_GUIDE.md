# Table Extraction: Before vs After

## ❌ WITHOUT pdfplumber (PyPDF2 only)

When a PDF contains this table:

```
Department          Budget          FTEs
─────────────────────────────────────────
Public Safety      $15,000,000       85
Public Works       $12,500,000       62
Education          $25,000,000      180
```

**PyPDF2 extracts it as jumbled text:**

```
"Department Budget FTEs Public Safety $15,000,000 85 Public Works 
$12,500,000 62 Education $25,000,000 180"
```

❌ No structure  
❌ Hard to parse  
❌ Lost relationships between columns  
❌ Can't query specific values  

---

## ✅ WITH pdfplumber (NEW)

The same table is extracted as **structured data**:

```json
{
  "table_index": 1,
  "page": 8,
  "rows": 4,
  "cols": 3,
  "headers": ["Department", "Budget", "FTEs"],
  "body": [
    ["Public Safety", "$15,000,000", "85"],
    ["Public Works", "$12,500,000", "62"],
    ["Education", "$25,000,000", "180"]
  ]
}
```

✅ Preserves structure  
✅ Easy to query  
✅ Can export to CSV/Excel  
✅ Can search by column  
✅ Ready for analysis  

---

## Real-World Government Document Examples

### 1. Budget Document

**Table Found:**
```
Revenue Source       FY 2023         FY 2024      Change %
──────────────────────────────────────────────────────────
Property Tax        $45,000,000    $47,250,000     5.0%
Sales Tax           $8,500,000     $9,000,000      5.9%
Harbor Fees         $1,800,000     $1,950,000      8.3%
```

**Extracted As:**
```json
{
  "headers": ["Revenue Source", "FY 2023", "FY 2024", "Change %"],
  "body": [
    ["Property Tax", "$45,000,000", "$47,250,000", "5.0%"],
    ["Sales Tax", "$8,500,000", "$9,000,000", "5.9%"],
    ["Harbor Fees", "$1,800,000", "$1,950,000", "8.3%"]
  ]
}
```

**Now you can:**
- Find budget for specific revenue source
- Calculate year-over-year changes
- Export to spreadsheet
- Create charts/visualizations

---

### 2. Meeting Minutes - Voting Record

**Table Found:**
```
Item                    For    Against    Abstain
─────────────────────────────────────────────────
Budget Amendment        4        1          0
Zoning Change          3        2          0
Park Funding           5        0          0
```

**Extracted As:**
```json
{
  "headers": ["Item", "For", "Against", "Abstain"],
  "body": [
    ["Budget Amendment", "4", "1", "0"],
    ["Zoning Change", "3", "2", "0"],
    ["Park Funding", "5", "0", "0"]
  ]
}
```

**Now you can:**
- Track voting patterns
- Find controversial items
- Generate voting history reports

---

### 3. Permit Applications

**Table Found:**
```
Applicant          Property Address       Type           Fee
────────────────────────────────────────────────────────────
Smith, John        12 Main St            Building       $850
Jones Corp         45 Harbor Way         Renovation     $650
```

**Extracted As:**
```json
{
  "headers": ["Applicant", "Property Address", "Type", "Fee"],
  "body": [
    ["Smith, John", "12 Main St", "Building", "$850"],
    ["Jones Corp", "45 Harbor Way", "Renovation", "$650"]
  ]
}
```

**Now you can:**
- Search by address
- Filter by permit type
- Calculate total fees
- Track applicants

---

## How to Use Extracted Tables

### Option 1: Search by Column

```python
# Find all Public Safety budget entries
for table in pdf_data['tables']:
    if 'Department' in table['headers']:
        dept_index = table['headers'].index('Department')
        budget_index = table['headers'].index('Budget')
        
        for row in table['body']:
            if 'Public Safety' in row[dept_index]:
                print(f"Budget: {row[budget_index]}")
```

### Option 2: Export to CSV

```python
import csv

for table in pdf_data['tables']:
    filename = f"table_page_{table['page']}.csv"
    with open(filename, 'w') as f:
        writer = csv.writer(f)
        writer.writerow(table['headers'])
        writer.writerows(table['body'])
```

### Option 3: Load into Database

```python
for table in pdf_data['tables']:
    for row in table['body']:
        # Create dict from headers and row
        record = dict(zip(table['headers'], row))
        # Insert into database
        db.insert(record)
```

### Option 4: Calculate Totals

```python
# Sum budget column
total = 0
for table in pdf_data['tables']:
    if 'Budget' in table['headers']:
        budget_col = table['headers'].index('Budget')
        for row in table['body']:
            amount = row[budget_col].replace('$','').replace(',','')
            total += float(amount)
```

---

## What If Tables Don't Extract Perfectly?

Some PDFs have complex layouts that can be tricky:

### Issue: Merged Cells
**Problem:** Table has merged header cells  
**Solution:** pdfplumber handles most cases, may need manual adjustment

### Issue: Nested Tables
**Problem:** Tables within tables  
**Solution:** Will extract as separate tables

### Issue: Poorly Formatted PDFs
**Problem:** Table looks like a table but isn't structured as one  
**Solution:** Falls back to text extraction, you may need to parse manually

### Issue: Images of Tables (Scanned PDFs)
**Problem:** Table is an image, not text  
**Solution:** Need OCR (see README for OCR instructions)

---

## Quick Check: Is Your PDF Compatible?

✅ **Good candidates for table extraction:**
- PDFs created from Word/Excel
- Digital forms
- Reports generated from databases
- Budget documents from accounting software

❌ **May need OCR:**
- Scanned paper documents
- Photos of documents
- Old PDFs from photocopies

---

## Testing Table Extraction

Run the test script to see what gets extracted:

```bash
python table_extraction_examples.py
```

This will show you:
- Sample output format
- How to access table data
- Common use cases
- Processing examples

---

## Summary

| Feature | Without pdfplumber | With pdfplumber ⭐ |
|---------|-------------------|-------------------|
| Text extraction | ✅ | ✅ |
| Table detection | ❌ | ✅ |
| Column preservation | ❌ | ✅ |
| Row structure | ❌ | ✅ |
| Headers identified | ❌ | ✅ |
| CSV export ready | ❌ | ✅ |
| Database loading | ❌ | ✅ |
| Searchable by column | ❌ | ✅ |

**Bottom line:** For government documents with budget tables, voting records, permits, or any structured data, table extraction is essential. This package includes pdfplumber by default and provides helper functions to work with extracted tables.
