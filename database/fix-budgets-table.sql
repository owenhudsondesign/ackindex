-- First, let's check if the budgets table exists and has the right structure
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  municipality VARCHAR(255) NOT NULL,
  total_budget DECIMAL(15,2),
  file_path VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'budgets' AND column_name = 'id') THEN
        ALTER TABLE budgets ADD COLUMN id UUID DEFAULT uuid_generate_v4() PRIMARY KEY;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
DROP POLICY IF EXISTS "Allow public read access to budgets" ON budgets;
CREATE POLICY "Allow public read access to budgets" ON budgets
  FOR SELECT USING (true);

-- Insert some sample data if the table is empty
INSERT INTO budgets (name, year, municipality, total_budget) VALUES
('2025 Annual Town Meeting Warrant', 2025, 'Nantucket, MA', 117300000.00),
('Forecast FY23-FY33', 2023, 'Nantucket, MA', 123200000.00)
ON CONFLICT DO NOTHING;
