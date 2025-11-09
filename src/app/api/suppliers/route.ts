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
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(suppliers || [])
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    
    // Verify supplier model exists
    if (!prisma.supplier) {
      console.error('Supplier model not found in Prisma client')
      return NextResponse.json({ 
        error: 'Database model not available. Please restart the server.',
        details: 'Supplier model not found'
      }, { status: 500 })
    }
    
    body = await request.json()
    const { name, email, phone, address, contactName } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        contactName: contactName?.trim() || null,
      }
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Full error details:', { errorMessage, errorStack, body })
    return NextResponse.json({ 
      error: 'Failed to create supplier', 
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}

