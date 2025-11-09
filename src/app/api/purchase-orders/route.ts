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

export async function GET() {
  try {
    const prisma = getPrismaClient()
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(orders || [])
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    body = await request.json()
    const { supplierId, items, totalAmount, notes, expectedArrivalDate } = body

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Supplier ID and items are required' }, { status: 400 })
    }

    // Generate unique order number
    const timestamp = Date.now()
    const orderNumber = `PO-${timestamp}`

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId: parseInt(supplierId),
        orderNumber,
        items: JSON.stringify(items),
        totalAmount: parseFloat(totalAmount) || 0,
        notes: notes?.trim() || null,
        expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : null,
        status: 'pending'
      },
      include: { supplier: true }
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to create purchase order', 
      details: errorMessage
    }, { status: 500 })
  }
}

