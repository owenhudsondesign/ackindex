-- Safe schema creation that handles existing tables
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create budgets table
CREATE TABLE budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  municipality VARCHAR(255) NOT NULL,
  total_budget DECIMAL(15,2),
  file_path VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_categories table
CREATE TABLE budget_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget_items table
CREATE TABLE budget_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  item_name VARCHAR(500) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  line_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analysis_results table
CREATE TABLE analysis_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  analysis_type VARCHAR(100) NOT NULL,
  result_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  municipality VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(year);
CREATE INDEX IF NOT EXISTS idx_budgets_municipality ON budgets(municipality);
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_category_id ON budget_items(category_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_budget_id ON analysis_results(budget_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_municipality ON subscriptions(municipality);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Add updated_at triggers
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO budgets (name, year, municipality, total_budget) VALUES
('Nantucket FY2024 Budget', 2024, 'Nantucket, MA', 125000000.00),
('Sample Budget 2023', 2023, 'Sample City, MA', 50000000.00)
ON CONFLICT DO NOTHING;

-- Insert sample categories
INSERT INTO budget_categories (budget_id, category_name, amount, percentage) 
SELECT 
  b.id,
  'General Government',
  25000000.00,
  20.00
FROM budgets b WHERE b.name = 'Nantucket FY2024 Budget'
ON CONFLICT DO NOTHING;

INSERT INTO budget_categories (budget_id, category_name, amount, percentage) 
SELECT 
  b.id,
  'Public Safety',
  30000000.00,
  24.00
FROM budgets b WHERE b.name = 'Nantucket FY2024 Budget'
ON CONFLICT DO NOTHING;

INSERT INTO budget_categories (budget_id, category_name, amount, percentage) 
SELECT 
  b.id,
  'Education',
  40000000.00,
  32.00
FROM budgets b WHERE b.name = 'Nantucket FY2024 Budget'
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to budgets" ON budgets;
DROP POLICY IF EXISTS "Allow public read access to budget_categories" ON budget_categories;
DROP POLICY IF EXISTS "Allow public read access to budget_items" ON budget_items;
DROP POLICY IF EXISTS "Allow public read access to analysis_results" ON analysis_results;
DROP POLICY IF EXISTS "Allow public insert on subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Allow public update on subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Allow public insert on users" ON users;
DROP POLICY IF EXISTS "Allow public read access to users" ON users;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access to budgets" ON budgets FOR SELECT USING (true);
CREATE POLICY "Allow public read access to budget_categories" ON budget_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to budget_items" ON budget_items FOR SELECT USING (true);
CREATE POLICY "Allow public read access to analysis_results" ON analysis_results FOR SELECT USING (true);

-- Allow public insert for subscriptions (for newsletter signup)
CREATE POLICY "Allow public insert on subscriptions" ON subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on subscriptions" ON subscriptions FOR UPDATE USING (true);

-- Allow public insert for users (for registration)
CREATE POLICY "Allow public insert on users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to users" ON users FOR SELECT USING (true);
