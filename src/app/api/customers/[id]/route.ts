import { NextResponse } from 'next/server'
import { PrismaClient } from '../../../../generated/prisma/client'
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

// Update customer
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    body = await request.json()
    const { name, cardNumber, loyaltyPoints, totalSpent } = body

    if (!prisma.customer) {
      return NextResponse.json({ error: 'Customer model not available' }, { status: 500 })
    }

    const resolvedParams = await Promise.resolve(params)
    const customerId = parseInt(resolvedParams.id)

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if card number is being changed and if it conflicts
    if (cardNumber && cardNumber !== existing.cardNumber) {
      const cardExists = await prisma.customer.findUnique({
        where: { cardNumber: cardNumber.trim() }
      })
      if (cardExists) {
        return NextResponse.json({ error: 'Card number already exists' }, { status: 400 })
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        cardNumber: cardNumber !== undefined ? (cardNumber?.trim() || null) : undefined,
        loyaltyPoints: loyaltyPoints !== undefined ? parseFloat(loyaltyPoints) : undefined,
        totalSpent: totalSpent !== undefined ? parseFloat(totalSpent) : undefined
      }
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to update customer', 
      details: errorMessage
    }, { status: 500 })
  }
}

// Delete customer
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const prisma = getPrismaClient()
    
    if (!prisma.customer) {
      return NextResponse.json({ error: 'Customer model not available' }, { status: 500 })
    }

    const resolvedParams = await Promise.resolve(params)
    const customerId = parseInt(resolvedParams.id)

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    await prisma.customer.delete({
      where: { id: customerId }
    })

    return NextResponse.json({ message: 'Customer deleted' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}

