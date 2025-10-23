import { NextRequest, NextResponse } from 'next/server'
import { scrapeRealNantucketData } from '@/lib/realScraper'

export async function GET(req: NextRequest) {
  try {
    console.log('Starting Nantucket data scrape...')
    const projects = await scrapeRealNantucketData()
    console.log(`Successfully scraped ${projects.length} projects from Nantucket`)
    
    return NextResponse.json({
      success: true,
      data: projects,
      message: `Found ${projects.length} projects from Nantucket`
    })
  } catch (error: any) {
    console.error('Error during Nantucket data scrape:', error)
    return NextResponse.json({
      success: false,
      data: [],
      message: 'Failed to scrape data',
      error: error.message
    }, { status: 500 })
  }
}