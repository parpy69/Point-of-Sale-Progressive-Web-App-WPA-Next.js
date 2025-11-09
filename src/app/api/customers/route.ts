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

// Get all customers or search by name/card number
export async function GET(request: Request) {
  try {
    const prisma = getPrismaClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const cardNumber = searchParams.get('cardNumber')

    if (!prisma.customer) {
      return NextResponse.json({ error: 'Customer model not available' }, { status: 500 })
    }

    if (cardNumber) {
      // Search by card number
      const customer = await prisma.customer.findUnique({
        where: { cardNumber: cardNumber }
      })
      return NextResponse.json(customer || null)
    }

    if (search) {
      // Search by name (case-insensitive partial match)
      const customers = await prisma.customer.findMany({
        where: {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        orderBy: {
          name: 'asc'
        },
        take: 10 // Limit results
      })
      return NextResponse.json(customers)
    }

    // Get all customers
    const customers = await prisma.customer.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error getting customers:', error)
    return NextResponse.json({ error: 'Failed to get customers' }, { status: 500 })
  }
}

// Create a new customer
export async function POST(request: Request) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    body = await request.json()
    const { name, cardNumber } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    }

    if (!prisma.customer) {
      return NextResponse.json({ error: 'Customer model not available' }, { status: 500 })
    }

    // Check if customer with same card number exists
    if (cardNumber) {
      const existing = await prisma.customer.findUnique({
        where: { cardNumber: cardNumber.trim() }
      })
      if (existing) {
        return NextResponse.json({ error: 'Card number already exists' }, { status: 400 })
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        cardNumber: cardNumber?.trim() || null,
        loyaltyPoints: 0,
        totalSpent: 0
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to create customer', 
      details: errorMessage
    }, { status: 500 })
  }
}

