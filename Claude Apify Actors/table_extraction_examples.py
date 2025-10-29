"""
Table Extraction Example - Understanding PDF Table Output

This file demonstrates how the PDF scraper handles tables in government documents
"""

import json

# Example output for a PDF with tables (like a budget document or meeting agenda)

sample_output_with_tables = {
    "url": "https://ackindex.com/documents/budget-2024.pdf",
    "filename": "budget-2024.pdf",
    "source_page": "https://ackindex.com/finance",
    "link_text": "2024 Annual Budget",
    "status": "success",
    "parser": "pdfplumber",  # Indicates table extraction is working
    
    # Basic info
    "num_pages": 25,
    "total_tables": 8,  # Total tables found across all pages
    
    # Metadata
    "metadata": {
        "title": "Town of Nantucket - 2024 Budget",
        "author": "Finance Department",
        "creation_date": "D:20240101120000"
    },
    
    # Page-by-page data
    "pages": [
        {
            "page_number": 1,
            "text": "TOWN OF NANTUCKET\n2024 ANNUAL BUDGET\n\nExecutive Summary...",
            "tables": [],  # No tables on this page
            "table_count": 0
        },
        {
            "page_number": 5,
            "text": "REVENUE SUMMARY\n\nThe following table shows projected revenues...",
            "tables": [
                {
                    "page": 5,
                    "table_index": 1,
                    "rows": 12,
                    "cols": 4,
                    "headers": ["Revenue Source", "FY 2023", "FY 2024", "Change %"],
                    "body": [
                        ["Property Tax", "$45,000,000", "$47,250,000", "5.0%"],
                        ["Sales Tax", "$8,500,000", "$9,000,000", "5.9%"],
                        ["Parking Fees", "$2,100,000", "$2,300,000", "9.5%"],
                        ["Harbor Fees", "$1,800,000", "$1,950,000", "8.3%"],
                        ["Building Permits", "$950,000", "$1,100,000", "15.8%"],
                        ["License Fees", "$450,000", "$475,000", "5.6%"],
                        ["State Aid", "$12,000,000", "$12,500,000", "4.2%"],
                        ["Federal Grants", "$3,200,000", "$3,500,000", "9.4%"],
                        ["Investment Income", "$800,000", "$1,000,000", "25.0%"],
                        ["Misc Revenue", "$1,200,000", "$1,300,000", "8.3%"],
                        ["TOTAL", "$76,000,000", "$80,375,000", "5.8%"]
                    ],
                    # Full data array includes headers + body
                    "data": [
                        ["Revenue Source", "FY 2023", "FY 2024", "Change %"],
                        ["Property Tax", "$45,000,000", "$47,250,000", "5.0%"],
                        ["Sales Tax", "$8,500,000", "$9,000,000", "5.9%"],
                        # ... etc
                    ]
                }
            ],
            "table_count": 1
        },
        {
            "page_number": 8,
            "text": "DEPARTMENT BUDGETS\n\nThe following tables show departmental allocations...",
            "tables": [
                {
                    "page": 8,
                    "table_index": 1,
                    "rows": 8,
                    "cols": 3,
                    "headers": ["Department", "Budget", "FTEs"],
                    "body": [
                        ["Public Safety", "$15,000,000", "85"],
                        ["Public Works", "$12,500,000", "62"],
                        ["Education", "$25,000,000", "180"],
                        ["Parks & Recreation", "$3,200,000", "28"],
                        ["Planning", "$1,800,000", "12"],
                        ["Administration", "$4,500,000", "35"],
                        ["TOTAL", "$62,000,000", "402"]
                    ],
                    "data": [
                        ["Department", "Budget", "FTEs"],
                        ["Public Safety", "$15,000,000", "85"],
                        # ... etc
                    ]
                }
            ],
            "table_count": 1
        }
    ],
    
    # All tables consolidated
    "tables": [
        # Table 1 from page 5
        {
            "page": 5,
            "table_index": 1,
            "rows": 12,
            "cols": 4,
            "headers": ["Revenue Source", "FY 2023", "FY 2024", "Change %"],
            "body": [
                ["Property Tax", "$45,000,000", "$47,250,000", "5.0%"],
                # ... all rows
            ],
            "data": [
                ["Revenue Source", "FY 2023", "FY 2024", "Change %"],
                ["Property Tax", "$45,000,000", "$47,250,000", "5.0%"],
                # ... all rows
            ]
        },
        # Table 2 from page 8
        {
            "page": 8,
            "table_index": 1,
            "rows": 8,
            "cols": 3,
            "headers": ["Department", "Budget", "FTEs"],
            "body": [
                ["Public Safety", "$15,000,000", "85"],
                # ... all rows
            ],
            "data": [
                ["Department", "Budget", "FTEs"],
                ["Public Safety", "$15,000,000", "85"],
                # ... all rows
            ]
        }
        # ... 6 more tables
    ],
    
    "full_text": "Complete text from all pages including narrative content..."
}


def process_table_for_display(table_data):
    """
    Helper function to convert table data into a more usable format
    
    Example usage:
        for table in pdf_result['tables']:
            display_table = process_table_for_display(table)
            # Now use display_table in your app
    """
    
    headers = table_data['headers']
    rows = table_data['body']
    
    # Convert to list of dictionaries (easier to work with)
    table_as_dicts = []
    for row in rows:
        row_dict = {}
        for i, header in enumerate(headers):
            if i < len(row):
                row_dict[header] = row[i]
        table_as_dicts.append(row_dict)
    
    return {
        'page': table_data['page'],
        'headers': headers,
        'rows': table_as_dicts,
        'row_count': len(rows)
    }


def example_search_tables():
    """
    Example: How to search through tables for specific data
    """
    # Load your PDF results
    pdf_result = sample_output_with_tables
    
    # Find all budget-related tables
    budget_tables = []
    for table in pdf_result['tables']:
        # Check if headers contain budget-related keywords
        headers_str = ' '.join(table['headers']).lower()
        if 'budget' in headers_str or 'revenue' in headers_str or 'department' in headers_str:
            budget_tables.append(table)
    
    print(f"Found {len(budget_tables)} budget-related tables")
    
    # Search for specific department
    target_dept = "Public Safety"
    for table in pdf_result['tables']:
        for row in table['body']:
            if target_dept in str(row):
                print(f"Found {target_dept} on page {table['page']}")
                print(f"Data: {row}")


def example_convert_to_csv():
    """
    Example: Convert extracted tables to CSV format
    """
    import csv
    
    pdf_result = sample_output_with_tables
    
    # Export first table to CSV
    if pdf_result['tables']:
        table = pdf_result['tables'][0]
        
        with open('budget_table.csv', 'w', newline='') as f:
            writer = csv.writer(f)
            # Write headers
            writer.writerow(table['headers'])
            # Write body rows
            writer.writerows(table['body'])
        
        print("Exported table to budget_table.csv")


def example_analyze_table_data():
    """
    Example: Perform analysis on extracted table data
    """
    pdf_result = sample_output_with_tables
    
    # Find revenue table and calculate total
    for table in pdf_result['tables']:
        if 'Revenue Source' in table['headers']:
            # Extract the FY 2024 column (index 2)
            total = 0
            for row in table['body'][:-1]:  # Exclude TOTAL row
                if len(row) > 2:
                    # Parse dollar amount
                    amount_str = row[2].replace('$', '').replace(',', '')
                    try:
                        amount = float(amount_str)
                        total += amount
                    except:
                        pass
            
            print(f"Calculated total revenue: ${total:,.2f}")


# What to expect from different types of PDFs:

examples_by_document_type = {
    "Meeting Minutes": {
        "typical_tables": [
            "Attendance roster",
            "Voting record",
            "Action items"
        ],
        "table_structure": "Usually 2-4 columns, simple format",
        "usefulness": "High - shows who attended, how they voted"
    },
    
    "Budget Documents": {
        "typical_tables": [
            "Revenue breakdown",
            "Department budgets",
            "Line-item details",
            "Multi-year comparisons"
        ],
        "table_structure": "3-6 columns, often nested headers, subtotals",
        "usefulness": "Very high - all key financial data is in tables"
    },
    
    "Zoning Decisions": {
        "typical_tables": [
            "Property details",
            "Variance requests",
            "Dimensional requirements"
        ],
        "table_structure": "2-4 columns, property specifications",
        "usefulness": "Medium-high - key property data in tables"
    },
    
    "Permits & Licenses": {
        "typical_tables": [
            "Applicant information",
            "Fees schedule",
            "Requirements checklist"
        ],
        "table_structure": "2-3 columns, forms-based",
        "usefulness": "Medium - structured data but may be form fields"
    },
    
    "Annual Reports": {
        "typical_tables": [
            "Statistics",
            "Performance metrics",
            "Year-over-year comparisons"
        ],
        "table_structure": "Variable, often complex multi-column",
        "usefulness": "Very high - metrics and KPIs in tables"
    }
}


if __name__ == '__main__':
    print("=" * 70)
    print("PDF TABLE EXTRACTION - CAPABILITIES & EXAMPLES")
    print("=" * 70)
    
    print("\n✅ What's Extracted:")
    print("  - Table structure (rows, columns)")
    print("  - Headers (first row)")
    print("  - Body (all data rows)")
    print("  - Page number where table appears")
    print("  - Full data array (headers + body combined)")
    
    print("\n📊 Sample Output Structure:")
    print(json.dumps({
        "page": 5,
        "table_index": 1,
        "rows": 12,
        "cols": 4,
        "headers": ["Column 1", "Column 2", "Column 3", "Column 4"],
        "body": [["Row 1 data..."], ["Row 2 data..."]],
    }, indent=2))
    
    print("\n🔍 Common Use Cases:")
    print("\n1. Budget Analysis:")
    print("   - Extract all revenue/expense tables")
    print("   - Calculate totals and changes")
    print("   - Compare year-over-year")
    
    print("\n2. Meeting Minutes:")
    print("   - Extract voting records")
    print("   - Track attendance")
    print("   - Identify action items")
    
    print("\n3. Search by Value:")
    print("   - Find all mentions of specific department")
    print("   - Look up budget for specific program")
    print("   - Search for property addresses")
    
    print("\n4. Data Export:")
    print("   - Convert to CSV for Excel analysis")
    print("   - Load into database")
    print("   - Create visualizations")
    
    print("\n" + "=" * 70)
    print("See the full sample_output_with_tables above for complete structure")
    print("=" * 70 + "\n")
