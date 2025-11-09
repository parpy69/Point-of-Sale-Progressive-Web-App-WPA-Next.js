import { NextResponse } from 'next/server'
import { PrismaClient } from '../../../../generated/prisma/client'
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    body = await request.json()
    const { name, email, phone, address, contactName } = body
    const resolvedParams = await Promise.resolve(params)
    const supplierId = parseInt(resolvedParams.id)

    if (isNaN(supplierId)) {
      return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 })
    }

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        contactName: contactName?.trim() || null,
      }
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error updating supplier:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to update supplier', 
      details: errorMessage
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
    const supplierId = parseInt(resolvedParams.id)

    if (isNaN(supplierId)) {
      return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 })
    }

    await prisma.supplier.delete({
      where: { id: supplierId }
    })

    return NextResponse.json({ message: 'Supplier deleted' })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}

