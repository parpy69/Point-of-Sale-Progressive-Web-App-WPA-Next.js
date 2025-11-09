import { NextResponse } from 'next/server'
import { PrismaClient } from '../../../../generated/prisma/client'
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
  
  // Set DATABASE_URL to absolute path
  process.env.DATABASE_URL = dbUrl
  
  // Singleton pattern for Prisma Client
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }

  return globalForPrisma.prisma
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    
    // Verify product model exists
    if (!prisma.product) {
      console.error('Product model not found in Prisma client')
      return NextResponse.json({ 
        error: 'Database model not available. Please restart the server.',
        details: 'Product model not found'
      }, { status: 500 })
    }
    
    body = await request.json()
    const { name, price, quantity, barcode } = body

    // Handle params (could be Promise in Next.js 15+)
    const resolvedParams = await Promise.resolve(params)
    const productId = parseInt(resolvedParams.id)

    // Validate product ID first
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    // Validate required fields
    if (!name || name.trim() === '' || price === undefined || price === '' || price === null) {
      return NextResponse.json({ error: 'Missing required fields: name and price are required' }, { status: 400 })
    }
    
    // Quantity can be 0, so we only check if it's undefined or null
    if (quantity === undefined || quantity === null || quantity === '') {
      return NextResponse.json({ error: 'Quantity is required' }, { status: 400 })
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity),
        barcode: barcode?.trim() || null
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const resolvedParams = await Promise.resolve(params)
    console.error('Error details:', { errorMessage, errorStack, body, id: resolvedParams?.id })
    return NextResponse.json({ 
      error: 'Failed to update product', 
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const prisma = getPrismaClient()
    const resolvedParams = await Promise.resolve(params)
    const productId = parseInt(resolvedParams.id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    await prisma.product.delete({
      where: { id: productId }
    })

    return NextResponse.json({ message: 'Product deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}

