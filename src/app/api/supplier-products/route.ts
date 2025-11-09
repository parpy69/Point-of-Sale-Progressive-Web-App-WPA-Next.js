import { NextResponse } from 'next/server'
import { PrismaClient } from '../../../generated/prisma/client'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

function getPrismaClient() {
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
  const dbDir = path.dirname(dbPath)
  
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  
  const dbUrl = `file:${dbPath}`
  process.env.DATABASE_URL = dbUrl
  
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

// Get supplier prices for a specific supplier
export async function GET(request: Request) {
  try {
    const prisma = getPrismaClient()
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const productId = searchParams.get('productId')

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    const where: any = { supplierId: parseInt(supplierId) }
    if (productId) {
      where.productId = parseInt(productId)
    }

    const supplierProducts = await prisma.supplierProduct.findMany({
      where,
      include: { product: true }
    })

    return NextResponse.json(supplierProducts || [])
  } catch (error) {
    console.error('Error fetching supplier products:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// Delete supplier product price
export async function DELETE(request: Request) {
  try {
    const prisma = getPrismaClient()
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')
    const productId = searchParams.get('productId')

    if (!supplierId || !productId) {
      return NextResponse.json({ error: 'Supplier ID and Product ID are required' }, { status: 400 })
    }

    await prisma.supplierProduct.delete({
      where: {
        supplierId_productId: {
          supplierId: parseInt(supplierId),
          productId: parseInt(productId)
        }
      }
    })

    return NextResponse.json({ message: 'Supplier product price deleted' })
  } catch (error) {
    console.error('Error deleting supplier product:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to delete supplier product price', 
      details: errorMessage
    }, { status: 500 })
  }
}

// Create or update supplier product price
export async function POST(request: Request) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    
    // Verify supplierProduct model exists
    if (!prisma.supplierProduct) {
      console.error('SupplierProduct model not found in Prisma client')
      return NextResponse.json({ 
        error: 'Database model not available. Please restart the server.',
        details: 'SupplierProduct model not found'
      }, { status: 500 })
    }
    
    body = await request.json()
    const { supplierId, productId, price } = body

    if (!supplierId || !productId || price === undefined || price === null) {
      return NextResponse.json({ error: 'Supplier ID, Product ID, and price are required' }, { status: 400 })
    }

    if (parseFloat(price) <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 })
    }

    const supplierProduct = await prisma.supplierProduct.upsert({
      where: {
        supplierId_productId: {
          supplierId: parseInt(supplierId),
          productId: parseInt(productId)
        }
      },
      update: {
        price: parseFloat(price)
      },
      create: {
        supplierId: parseInt(supplierId),
        productId: parseInt(productId),
        price: parseFloat(price)
      },
      include: { product: true, supplier: true }
    })

    return NextResponse.json(supplierProduct, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating supplier product:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Full error details:', { errorMessage, errorStack, body })
    return NextResponse.json({ 
      error: 'Failed to save supplier product', 
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}

