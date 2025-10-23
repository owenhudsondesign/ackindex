import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const municipality = formData.get('municipality') as string
    const year = parseInt(formData.get('year') as string)

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}`)
    console.log(`Municipality: ${municipality}`)
    console.log(`Year: ${year}`)

    // For now, create mock budget data based on the file name
    // This allows us to test the database integration
    const budgetData = createMockBudgetData(file.name, municipality, year)

    // Save to database
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .insert({
        name: budgetData.name,
        year: budgetData.year,
        municipality: budgetData.municipality,
        total_budget: budgetData.totalBudget,
        file_path: file.name
      })
      .select()
      .single()

    if (budgetError) {
      console.error('Budget error:', budgetError)
      throw new Error(`Database error: ${budgetError.message}`)
    }

    console.log('Budget saved:', budget.id)

    // Save categories
    if (budgetData.categories.length > 0) {
      const categories = budgetData.categories.map(cat => ({
        budget_id: budget.id,
        category_name: cat.name,
        amount: cat.amount,
        percentage: cat.percentage
      }))

      const { error: categoriesError } = await supabaseAdmin
        .from('budget_categories')
        .insert(categories)

      if (categoriesError) {
        console.error('Categories error:', categoriesError)
      } else {
        console.log('Categories saved successfully')
      }
    }

    return NextResponse.json({ 
      success: true, 
      budgetId: budget.id,
      message: `Budget "${budgetData.name}" parsed and saved successfully`,
      categories: budgetData.categories.length
    })

  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to parse budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createMockBudgetData(fileName: string, municipality: string, year: number) {
  // Create realistic budget data based on the file name and parameters
  const baseAmount = 50000000 + Math.random() * 100000000 // Random between 50M and 150M
  
  const categories = [
    {
      name: 'General Government',
      amount: baseAmount * 0.25,
      percentage: 25.00
    },
    {
      name: 'Public Safety',
      amount: baseAmount * 0.30,
      percentage: 30.00
    },
    {
      name: 'Education',
      amount: baseAmount * 0.35,
      percentage: 35.00
    },
    {
      name: 'Public Works',
      amount: baseAmount * 0.10,
      percentage: 10.00
    }
  ]

  const totalBudget = categories.reduce((sum, cat) => sum + cat.amount, 0)

  return {
    name: fileName.replace('.pdf', ''),
    year,
    municipality,
    totalBudget,
    categories
  }
}