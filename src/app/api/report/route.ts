import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'PDF report generation not yet implemented' },
    { status: 501 }
  )
}