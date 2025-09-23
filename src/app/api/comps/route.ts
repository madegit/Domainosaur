import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const domain = searchParams.get('domain')

  return NextResponse.json({
    domain,
    comps: [],
    message: "Comparable sales data coming soon"
  })
}