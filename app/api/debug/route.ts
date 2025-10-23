import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Check what tables exist and what data is in them
    const { data: budgets, error: budgetsError } = await supabase
      .from('budgets')
      .select('*')
      .limit(10)

    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select('*')
      .limit(10)

    return NextResponse.json({
      budgets: budgets || [],
      categories: categories || [],
      budgetsError: budgetsError?.message,
      categoriesError: categoriesError?.message,
      message: 'Debug data fetched successfully'
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch debug data'
    }, { status: 500 })
  }
}
