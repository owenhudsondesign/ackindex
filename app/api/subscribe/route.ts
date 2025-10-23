import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 })
    }

    // For now, just return success - in a real implementation, you'd store this in a database
    console.log(`New subscription: ${email}`)

    return NextResponse.json({ 
      message: 'Subscription successful! You will receive weekly updates about Nantucket projects.' 
    }, { status: 200 })

  } catch (error) {
    console.error('API Subscribe Error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}