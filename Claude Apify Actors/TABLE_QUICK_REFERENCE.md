# Table Extraction Quick Reference

## 📋 Quick Access Guide

### Table Structure in Output

```python
table = {
    'page': 5,                    # Page number where table appears
    'table_index': 1,             # Table number on that page
    'rows': 10,                   # Number of rows (including header)
    'cols': 4,                    # Number of columns
    'headers': ['A', 'B', 'C'],  # First row (column names)
    'body': [                     # All data rows
        ['row1_col1', 'row1_col2', 'row1_col3'],
        ['row2_col1', 'row2_col2', 'row2_col3']
    ],
    'data': [                     # Headers + body combined
        ['A', 'B', 'C'],
        ['row1_col1', 'row1_col2', 'row1_col3']
    ]
}
```

### Access Patterns

```python
# Load PDF result
pdf_result = {...}  # From Apify dataset

# Get all tables
all_tables = pdf_result['tables']

# Get tables from specific page
page_5_tables = [t for t in all_tables if t['page'] == 5]

# Get first table
first_table = pdf_result['tables'][0]

# Access headers
headers = first_table['headers']  # ['Department', 'Budget', 'FTEs']

# Access data rows
rows = first_table['body']  # [['Safety', '$1M', '50'], ...]

# Iterate through rows
for row in first_table['body']:
    dept = row[0]
    budget = row[1]
    ftes = row[2]
```

## 🔍 Common Operations

### 1. Find Specific Table

```python
# By keyword in headers
budget_table = None
for table in pdf_result['tables']:
    if any('budget' in h.lower() for h in table['headers']):
        budget_table = table
        break
```

### 2. Search Column for Value

```python
# Find row where Department is "Public Safety"
headers = table['headers']
dept_index = headers.index('Department')

for row in table['body']:
    if 'Public Safety' in row[dept_index]:
        print(f"Found: {row}")
```

### 3. Convert to Dict

```python
# Make each row a dictionary
records = []
for row in table['body']:
    record = dict(zip(table['headers'], row))
    records.append(record)

# Now access as: record['Department']
```

### 4. Export to CSV

```python
import csv

with open('output.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(table['headers'])
    writer.writerows(table['body'])
```

### 5. Extract Numbers

```python
# Get all values from Budget column
budget_col = table['headers'].index('Budget')
budgets = []

for row in table['body']:
    value = row[budget_col]
    # Remove $, commas
    value = value.replace('$', '').replace(',', '')
    budgets.append(float(value))

total = sum(budgets)
```

## 📊 By Document Type

### Budget Documents
```python
# Find revenue tables
revenue_tables = [
    t for t in pdf_result['tables'] 
    if any('revenue' in h.lower() for h in t['headers'])
]

# Sum a column
for table in revenue_tables:
    if 'FY 2024' in table['headers']:
        idx = table['headers'].index('FY 2024')
        amounts = [float(row[idx].replace('$','').replace(',','')) 
                   for row in table['body'] if row[idx]]
        print(f"Total: ${sum(amounts):,.2f}")
```

### Meeting Minutes
```python
# Find voting tables
voting_tables = [
    t for t in pdf_result['tables']
    if any(word in ' '.join(t['headers']).lower() 
           for word in ['vote', 'for', 'against'])
]

# Extract votes
for table in voting_tables:
    records = [dict(zip(table['headers'], row)) 
               for row in table['body']]
    
    for record in records:
        print(f"{record.get('Item')}: "
              f"{record.get('For')} for, "
              f"{record.get('Against')} against")
```

### Permits & Applications
```python
# Search for address
target_address = "123 Main St"

for table in pdf_result['tables']:
    for i, header in enumerate(table['headers']):
        if 'address' in header.lower():
            for row in table['body']:
                if target_address.lower() in row[i].lower():
                    print(f"Found on page {table['page']}")
                    print(dict(zip(table['headers'], row)))
```

## 🛠️ Helper Functions

### Available in table_processing_examples.py:

```python
from table_processing_examples import TableProcessor

# Find tables with keywords
tables = TableProcessor.find_tables_by_keyword(
    pdf_data, 
    ['budget', 'department']
)

# Search specific column
rows = TableProcessor.search_table_column(
    table, 
    'Department', 
    'Public Safety'
)

# Export to CSV
TableProcessor.table_to_csv(table, 'output.csv')

# Convert to dict list
records = TableProcessor.table_to_dict_list(table)

# Extract numeric values
amounts = TableProcessor.extract_numeric_column(table, 'Budget')
total = sum(amounts)
```

## ⚠️ Common Gotchas

### Issue: Column index out of range
```python
# BAD: Assumes column exists
value = row[3]

# GOOD: Check length first
value = row[3] if len(row) > 3 else None
```

### Issue: Case sensitivity
```python
# BAD: Exact match required
if 'Budget' in headers:

# GOOD: Case insensitive
if any('budget' in h.lower() for h in headers):
```

### Issue: Number parsing fails
```python
# BAD: Direct conversion
amount = float(row[1])

# GOOD: Clean first
value = row[1].replace('$', '').replace(',', '')
amount = float(value)
```

### Issue: Missing tables
```python
# Check if any tables were found
if not pdf_result.get('tables'):
    print("No tables extracted - might need OCR")

# Check parser used
if pdf_result.get('parser') == 'pypdf2':
    print("Warning: Limited table support")
```

## 📈 Performance Tips

### For Large Datasets
```python
# Don't load all PDFs at once
# Process in batches

# For Apify dataset:
from apify_client import ApifyClient

client = ApifyClient(token)
dataset = client.dataset('your-dataset-id')

# Iterate with offset
offset = 0
batch_size = 100

while True:
    items = dataset.list_items(offset=offset, limit=batch_size)
    if not items.items:
        break
    
    for item in items.items:
        # Process tables
        for table in item.get('tables', []):
            # Your processing here
            pass
    
    offset += batch_size
```

## 🎯 Cheat Sheet

| Task | Code |
|------|------|
| Get all tables | `pdf_result['tables']` |
| Count tables | `pdf_result['total_tables']` |
| Get headers | `table['headers']` |
| Get data rows | `table['body']` |
| Get column index | `table['headers'].index('Budget')` |
| Row as dict | `dict(zip(table['headers'], row))` |
| Find column | `[i for i, h in enumerate(headers) if 'budget' in h.lower()]` |
| Sum column | `sum(float(row[idx].replace('$','').replace(',','')) for row in body)` |
| Export CSV | `csv.writer(f).writerow(headers); writer.writerows(body)` |
| Check parser | `pdf_result.get('parser') == 'pdfplumber'` |

## 🔗 More Resources

- **TABLE_GUIDE.md** - Detailed guide with before/after examples
- **table_extraction_examples.py** - Sample output structures
- **table_processing_examples.py** - Ready-to-use helper functions
- **README.md** - Full documentation

## 💡 Pro Tips

1. **Always check if tables exist** before processing
2. **Use helpers** from table_processing_examples.py
3. **Export to CSV** for quick viewing in Excel
4. **Combine tables** across pages for continuations
5. **Check parser field** to verify pdfplumber was used
6. **Clean numeric data** before calculations (remove $, commas)
7. **Use dict conversion** for cleaner code with named columns
