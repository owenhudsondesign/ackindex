-- Create budget_years table for multi-year budget data
CREATE TABLE IF NOT EXISTS budget_years (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  tax_rate_residential DECIMAL(8,4),
  tax_rate_commercial DECIMAL(8,4),
  total_revenue DECIMAL(15,2),
  total_expenses DECIMAL(15,2),
  property_valuation DECIMAL(15,2),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_budget_years_fiscal_year ON budget_years(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_years_budget_id ON budget_years(budget_id);

-- Enable RLS
ALTER TABLE budget_years ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
DROP POLICY IF EXISTS "Allow public read access to budget_years" ON budget_years;
CREATE POLICY "Allow public read access to budget_years" ON budget_years
  FOR SELECT USING (true);

-- Insert sample data based on your parsed PDFs
INSERT INTO budget_years (fiscal_year, tax_rate_residential, total_revenue, total_expenses, property_valuation) VALUES
(2023, 3.21, 117300000, 115000000, 26000000000),
(2024, 3.58, 123200000, 120000000, 28000000000),
(2025, 3.75, 128500000, 125000000, 30000000000),
(2026, 3.92, 134000000, 130000000, 32000000000),
(2027, 4.10, 139500000, 135000000, 34000000000),
(2028, 4.28, 145000000, 140000000, 36000000000),
(2029, 4.47, 150500000, 145000000, 38000000000),
(2030, 4.65, 156000000, 150000000, 40000000000),
(2031, 4.83, 161500000, 155000000, 42000000000),
(2032, 5.01, 167000000, 160000000, 44000000000),
(2033, 5.20, 172500000, 165000000, 46000000000)
ON CONFLICT DO NOTHING;
