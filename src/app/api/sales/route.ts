import { NextResponse } from 'next/server'
import { PrismaClient } from '../../../generated/prisma/client'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

// Helper function to get Prisma client with proper DATABASE_URL
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

// Record a sale
export async function POST(request: Request) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    
    // Verify models exist
    if (!prisma.product) {
      return NextResponse.json({ 
        error: 'Database model not available. Please restart the server.',
        details: 'Product model not found'
      }, { status: 500 })
    }
    
    if (!prisma.sale) {
      return NextResponse.json({ 
        error: 'Database model not available. Please restart the server.',
        details: 'Sale model not found'
      }, { status: 500 })
    }
    
    body = await request.json()
    const { productId, quantity, customerId, customerName, customerCardNumber, totalAmount } = body

    if (!productId || quantity === undefined || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid sale data' }, { status: 400 })
    }

    // Get product to get current price
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    }

    const saleTotal = product.price * parseInt(quantity)
    let finalCustomerId = customerId ? parseInt(customerId) : null

    // Validate customerId if provided - if customer doesn't exist, set to null
    if (finalCustomerId !== null) {
      if (!prisma.customer) {
        // If customer model doesn't exist, just set customerId to null
        console.warn('Customer model not available, setting customerId to null')
        finalCustomerId = null
      } else {
        const existingCustomer = await prisma.customer.findUnique({
          where: { id: finalCustomerId }
        })
        
        if (!existingCustomer) {
          // If customer doesn't exist, set to null instead of failing
          console.warn(`Customer with ID ${finalCustomerId} does not exist, setting customerId to null`)
          finalCustomerId = null
        }
      }
    }

    // Handle customer creation/update for loyalty points
    if (customerName && prisma.customer) {
      // Get settings to check if loyalty points are enabled
      const settings = await prisma.settings.findFirst()
      const loyaltyEnabled = settings?.loyaltyPointsEnabled || false
      const pointsPerDollar = settings?.loyaltyPointsPerDollar || 1.0

      if (loyaltyEnabled) {
        // Try to find existing customer by card number or name
        let customer = null
        if (customerCardNumber) {
          customer = await prisma.customer.findUnique({
            where: { cardNumber: customerCardNumber.trim() }
          })
        }

        // If not found by card, try by name (exact match)
        if (!customer && customerName) {
          const customers = await prisma.customer.findMany({
            where: {
              name: {
                equals: customerName.trim(),
                mode: 'insensitive'
              }
            },
            take: 1
          })
          customer = customers[0] || null
        }

        // Create new customer if doesn't exist
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: customerName.trim(),
              cardNumber: customerCardNumber?.trim() || null,
              loyaltyPoints: 0,
              totalSpent: 0
            }
          })
        }

        finalCustomerId = customer.id

        // Award loyalty points based on purchase amount
        const pointsToAward = (totalAmount || saleTotal) * pointsPerDollar
        
        // Update customer's loyalty points and total spent
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            loyaltyPoints: {
              increment: pointsToAward
            },
            totalSpent: {
              increment: totalAmount || saleTotal
            }
          }
        })
      }
    }

    // Create sale record
    const sale = await prisma.sale.create({
      data: {
        productId: parseInt(productId),
        customerId: finalCustomerId,
        quantity: parseInt(quantity),
        price: product.price,
        total: saleTotal
      }
    })

    // Update product quantity
    await prisma.product.update({
      where: { id: parseInt(productId) },
      data: {
        quantity: product.quantity - parseInt(quantity)
      }
    })

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error recording sale:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack, body })
    return NextResponse.json({ 
      error: 'Failed to record sale', 
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}

// Get sales analytics
export async function GET(request: Request) {
  try {
    const prisma = getPrismaClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // week, month, year

    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get sales grouped by product
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        product: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate analytics per product
    const analytics = sales.reduce((acc: any, sale) => {
      const productId = sale.productId.toString()
      if (!acc[productId]) {
        acc[productId] = {
          productId: sale.productId,
          productName: sale.product.name,
          totalQuantity: 0,
          totalRevenue: 0,
          averageDailySales: 0,
          salesCount: 0
        }
      }
      acc[productId].totalQuantity += sale.quantity
      acc[productId].totalRevenue += sale.total
      acc[productId].salesCount += 1
      return acc
    }, {})

    // Calculate average daily sales
    const daysDiff = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))
    Object.values(analytics).forEach((product: any) => {
      product.averageDailySales = product.totalQuantity / daysDiff
    })

    return NextResponse.json({
      period,
      startDate,
      endDate: now,
      analytics: Object.values(analytics)
    })
  } catch (error) {
    console.error('Error getting analytics:', error)
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 })
  }
}

