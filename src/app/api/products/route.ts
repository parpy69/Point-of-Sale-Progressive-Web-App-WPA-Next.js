import { NextResponse } from 'next/server'
import { PrismaClient } from '../../../generated/prisma/client'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

// Helper function to get Prisma client with proper DATABASE_URL
function getPrismaClient() {
  // Get absolute path to database
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
  const dbDir = path.dirname(dbPath)
  
  // Ensure directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  
  // Use absolute path - Prisma needs absolute path in Next.js API routes
  // SQLite format: file:/absolute/path (with leading slash)
  const dbUrl = `file:${dbPath}`
  
  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('DATABASE_URL:', dbUrl)
    console.log('Absolute DB path:', dbPath)
    console.log('DB exists:', existsSync(dbPath))
    console.log('CWD:', process.cwd())
  }
  
  // Set DATABASE_URL to absolute path
  process.env.DATABASE_URL = dbUrl
  
  // Singleton pattern for Prisma Client
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }

  return globalForPrisma.prisma
}

export async function GET() {
  try {
    const prisma = getPrismaClient()
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(products || [])
  } catch (error) {
    console.error('Prisma error:', error)
    return NextResponse.json([], { status: 200 }) // Return empty array instead of error
  }
}

export async function POST(request: Request) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    body = await request.json()
    const { name, price, quantity, barcode } = body

    if (!name || name.trim() === '' || price === undefined || price === '' || quantity === undefined || quantity === '') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity),
        barcode: barcode?.trim() || null
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack, body })
    return NextResponse.json({ 
      error: 'Failed to create product', 
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}

