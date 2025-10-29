"""
Practical Table Processing Examples
Use these functions to work with extracted PDF tables from government documents
"""

import csv
import json
from typing import List, Dict, Any


class TableProcessor:
    """Helper class for processing extracted PDF tables"""
    
    @staticmethod
    def find_tables_by_keyword(pdf_data: Dict, keywords: List[str]) -> List[Dict]:
        """
        Find tables that contain specific keywords in headers or data
        
        Example:
            budget_tables = TableProcessor.find_tables_by_keyword(
                pdf_data, 
                ['budget', 'revenue', 'expense']
            )
        """
        matching_tables = []
        
        for table in pdf_data.get('tables', []):
            # Check headers
            headers_text = ' '.join(table.get('headers', [])).lower()
            
            # Check all data
            data_text = ' '.join([
                ' '.join(str(cell) for cell in row) 
                for row in table.get('body', [])
            ]).lower()
            
            # See if any keyword matches
            for keyword in keywords:
                if keyword.lower() in headers_text or keyword.lower() in data_text:
                    matching_tables.append(table)
                    break
        
        return matching_tables
    
    @staticmethod
    def search_table_column(table: Dict, column_name: str, search_value: str) -> List[List]:
        """
        Search for a value in a specific column
        
        Example:
            # Find all rows where Department is "Public Safety"
            rows = TableProcessor.search_table_column(
                table, 
                'Department', 
                'Public Safety'
            )
        """
        headers = table.get('headers', [])
        
        # Find column index
        try:
            col_index = headers.index(column_name)
        except ValueError:
            # Try case-insensitive match
            headers_lower = [h.lower() for h in headers]
            column_name_lower = column_name.lower()
            if column_name_lower in headers_lower:
                col_index = headers_lower.index(column_name_lower)
            else:
                return []
        
        # Find matching rows
        matching_rows = []
        for row in table.get('body', []):
            if col_index < len(row) and search_value.lower() in str(row[col_index]).lower():
                matching_rows.append(row)
        
        return matching_rows
    
    @staticmethod
    def table_to_csv(table: Dict, filename: str):
        """
        Export a table to CSV file
        
        Example:
            TableProcessor.table_to_csv(table, 'budget_2024.csv')
        """
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Write headers
            headers = table.get('headers', [])
            writer.writerow(headers)
            
            # Write body
            for row in table.get('body', []):
                writer.writerow(row)
        
        return filename
    
    @staticmethod
    def table_to_dict_list(table: Dict) -> List[Dict[str, Any]]:
        """
        Convert table to list of dictionaries (one per row)
        
        Example:
            records = TableProcessor.table_to_dict_list(table)
            for record in records:
                print(f"{record['Department']}: {record['Budget']}")
        """
        headers = table.get('headers', [])
        body = table.get('body', [])
        
        dict_list = []
        for row in body:
            row_dict = {}
            for i, header in enumerate(headers):
                if i < len(row):
                    row_dict[header] = row[i]
                else:
                    row_dict[header] = None
            dict_list.append(row_dict)
        
        return dict_list
    
    @staticmethod
    def extract_numeric_column(table: Dict, column_name: str) -> List[float]:
        """
        Extract numeric values from a column (useful for budgets, counts, etc.)
        
        Example:
            budgets = TableProcessor.extract_numeric_column(table, 'Budget')
            total = sum(budgets)
        """
        headers = table.get('headers', [])
        
        # Find column index
        try:
            col_index = headers.index(column_name)
        except ValueError:
            headers_lower = [h.lower() for h in headers]
            try:
                col_index = headers_lower.index(column_name.lower())
            except ValueError:
                return []
        
        # Extract and convert to numbers
        numbers = []
        for row in table.get('body', []):
            if col_index < len(row):
                value = str(row[col_index])
                # Remove common formatting
                value = value.replace('$', '').replace(',', '').replace('%', '')
                value = value.strip()
                
                try:
                    numbers.append(float(value))
                except ValueError:
                    # Skip non-numeric values
                    pass
        
        return numbers
    
    @staticmethod
    def combine_tables_by_headers(pdf_data: Dict, required_headers: List[str]) -> List[Dict]:
        """
        Find and combine all tables that have specific headers
        Useful for multi-page reports where the same table continues across pages
        
        Example:
            # Combine all budget tables across pages
            all_budget_rows = TableProcessor.combine_tables_by_headers(
                pdf_data,
                ['Department', 'Budget', 'FTEs']
            )
        """
        combined_rows = []
        headers = None
        
        for table in pdf_data.get('tables', []):
            table_headers = table.get('headers', [])
            
            # Check if this table has the required headers
            if all(any(req.lower() in h.lower() for h in table_headers) for req in required_headers):
                if headers is None:
                    headers = table_headers
                
                # Add all rows from this table
                for row in table.get('body', []):
                    combined_rows.append(row)
        
        return {
            'headers': headers or required_headers,
            'body': combined_rows,
            'total_rows': len(combined_rows)
        }


# Example Usage Functions

def example_budget_analysis(pdf_data: Dict):
    """
    Example: Analyze budget data from a PDF
    """
    print("\n=== BUDGET ANALYSIS ===\n")
    
    # Find all budget-related tables
    budget_tables = TableProcessor.find_tables_by_keyword(
        pdf_data, 
        ['budget', 'revenue', 'department']
    )
    
    print(f"Found {len(budget_tables)} budget-related tables")
    
    for table in budget_tables:
        print(f"\nTable on page {table['page']}:")
        print(f"  Columns: {', '.join(table['headers'])}")
        
        # Try to extract and sum budget column
        for header in table['headers']:
            if 'budget' in header.lower() or 'amount' in header.lower():
                amounts = TableProcessor.extract_numeric_column(table, header)
                if amounts:
                    total = sum(amounts)
                    print(f"  Total {header}: ${total:,.2f}")
                    print(f"  Average: ${total/len(amounts):,.2f}")
                    print(f"  Range: ${min(amounts):,.2f} - ${max(amounts):,.2f}")


def example_voting_record(pdf_data: Dict):
    """
    Example: Extract voting records from meeting minutes
    """
    print("\n=== VOTING RECORD ===\n")
    
    # Find voting tables
    voting_tables = TableProcessor.find_tables_by_keyword(
        pdf_data,
        ['vote', 'for', 'against', 'motion']
    )
    
    for table in voting_tables:
        records = TableProcessor.table_to_dict_list(table)
        
        print(f"\nVoting on page {table['page']}:")
        for record in records:
            # Try to find the item and vote counts
            item = record.get('Item') or record.get('Motion') or 'Unknown'
            for_votes = record.get('For') or record.get('Yes') or '0'
            against = record.get('Against') or record.get('No') or '0'
            
            print(f"  {item}: {for_votes} for, {against} against")


def example_permit_search(pdf_data: Dict, address: str):
    """
    Example: Search for permits at a specific address
    """
    print(f"\n=== PERMIT SEARCH: {address} ===\n")
    
    # Find tables with address column
    permit_tables = TableProcessor.find_tables_by_keyword(
        pdf_data,
        ['permit', 'applicant', 'address', 'property']
    )
    
    found = False
    for table in permit_tables:
        # Try to find address column
        headers = table.get('headers', [])
        address_col = None
        
        for header in headers:
            if 'address' in header.lower() or 'property' in header.lower():
                # Search this column
                matches = TableProcessor.search_table_column(table, header, address)
                
                if matches:
                    found = True
                    print(f"Found on page {table['page']}:")
                    
                    # Convert to dict for easier display
                    for match in matches:
                        row_dict = dict(zip(headers, match))
                        for key, value in row_dict.items():
                            print(f"  {key}: {value}")
                        print()
    
    if not found:
        print(f"No permits found for address: {address}")


def example_export_all_tables(pdf_data: Dict, output_dir: str = '.'):
    """
    Example: Export all tables to CSV files
    """
    print(f"\n=== EXPORTING TABLES ===\n")
    
    tables = pdf_data.get('tables', [])
    
    for i, table in enumerate(tables):
        filename = f"{output_dir}/table_page{table['page']}_#{table['table_index']}.csv"
        TableProcessor.table_to_csv(table, filename)
        print(f"Exported: {filename}")
        print(f"  Rows: {len(table.get('body', []))}, Columns: {len(table.get('headers', []))}")
    
    print(f"\nTotal tables exported: {len(tables)}")


def example_department_budget_summary(pdf_data: Dict):
    """
    Example: Create summary of all department budgets
    """
    print("\n=== DEPARTMENT BUDGET SUMMARY ===\n")
    
    # Combine all department budget tables
    combined = TableProcessor.combine_tables_by_headers(
        pdf_data,
        ['Department', 'Budget']
    )
    
    if combined['body']:
        print(f"Found {combined['total_rows']} department entries\n")
        
        # Convert to dict for analysis
        dept_budgets = {}
        dept_col = 0
        budget_col = 1
        
        for row in combined['body']:
            if len(row) > budget_col:
                dept = row[dept_col]
                budget_str = str(row[budget_col]).replace('$', '').replace(',', '')
                
                try:
                    budget = float(budget_str)
                    if dept not in dept_budgets:
                        dept_budgets[dept] = 0
                    dept_budgets[dept] += budget
                except:
                    pass
        
        # Sort by budget
        sorted_depts = sorted(dept_budgets.items(), key=lambda x: x[1], reverse=True)
        
        total = sum(dept_budgets.values())
        
        print("Departments by Budget:")
        for dept, budget in sorted_depts:
            percentage = (budget / total * 100) if total > 0 else 0
            print(f"  {dept:30s} ${budget:>12,.2f} ({percentage:>5.1f}%)")
        
        print(f"\n  {'TOTAL':30s} ${total:>12,.2f}")


# Example test data generator
def create_sample_pdf_data():
    """Create sample PDF data for testing"""
    return {
        "url": "https://example.com/budget.pdf",
        "filename": "budget-2024.pdf",
        "num_pages": 10,
        "tables": [
            {
                "page": 5,
                "table_index": 1,
                "headers": ["Department", "Budget", "FTEs"],
                "body": [
                    ["Public Safety", "$15,000,000", "85"],
                    ["Public Works", "$12,500,000", "62"],
                    ["Education", "$25,000,000", "180"],
                    ["Parks & Recreation", "$3,200,000", "28"],
                ]
            },
            {
                "page": 8,
                "table_index": 1,
                "headers": ["Item", "For", "Against", "Abstain"],
                "body": [
                    ["Budget Amendment", "4", "1", "0"],
                    ["Zoning Change", "3", "2", "0"],
                    ["Park Funding", "5", "0", "0"],
                ]
            }
        ]
    }


if __name__ == '__main__':
    # Run examples with sample data
    sample_data = create_sample_pdf_data()
    
    print("=" * 70)
    print("TABLE PROCESSING EXAMPLES")
    print("=" * 70)
    
    # Run example analyses
    example_budget_analysis(sample_data)
    example_voting_record(sample_data)
    example_department_budget_summary(sample_data)
    
    print("\n" + "=" * 70)
    print("Use these functions with your actual PDF data from the scraper!")
    print("=" * 70 + "\n")
