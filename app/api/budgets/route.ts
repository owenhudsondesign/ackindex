import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching budgets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch budgets' },
        { status: 500 }
      )
    }

    return NextResponse.json({ budgets: data || [] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
