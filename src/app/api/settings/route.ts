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

// Get settings
export async function GET() {
  try {
    const prisma = getPrismaClient()
    
    // Get or create default settings
    let settings = await prisma.settings.findFirst()
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          lowStockThreshold: 5,
          moderateStockThreshold: 10,
          highStockThreshold: 20,
          loyaltyPointsEnabled: false,
          loyaltyPointsPerDollar: 1.0
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error getting settings:', error)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

// Update settings
export async function PUT(request: Request) {
  let body: any = null
  try {
    const prisma = getPrismaClient()
    
    // Verify settings model exists
    if (!prisma.settings) {
      console.error('Settings model not found in Prisma client')
      return NextResponse.json({ 
        error: 'Database model not available. Please restart the server.',
        details: 'Settings model not found'
      }, { status: 500 })
    }
    
    body = await request.json()
    const { 
      lowStockThreshold, 
      moderateStockThreshold, 
      highStockThreshold,
      loyaltyPointsEnabled,
      loyaltyPointsPerDollar
    } = body

    // Validate thresholds
    if (lowStockThreshold === undefined || moderateStockThreshold === undefined || highStockThreshold === undefined) {
      return NextResponse.json({ error: 'All thresholds are required' }, { status: 400 })
    }

    if (lowStockThreshold >= moderateStockThreshold || moderateStockThreshold >= highStockThreshold) {
      return NextResponse.json({ 
        error: 'Thresholds must be in ascending order: low < moderate < high' 
      }, { status: 400 })
    }

    // Validate loyalty points settings
    if (loyaltyPointsPerDollar !== undefined && loyaltyPointsPerDollar !== null && (isNaN(loyaltyPointsPerDollar) || loyaltyPointsPerDollar < 0.1)) {
      return NextResponse.json({ 
        error: 'Loyalty points per dollar must be at least 0.1' 
      }, { status: 400 })
    }

    // Get or create settings
    let settings = await prisma.settings.findFirst()
    
    const updateData: any = {
      lowStockThreshold: parseInt(lowStockThreshold),
      moderateStockThreshold: parseInt(moderateStockThreshold),
      highStockThreshold: parseInt(highStockThreshold)
    }

    // Only update loyalty points fields if they're provided
    if (loyaltyPointsEnabled !== undefined && loyaltyPointsEnabled !== null) {
      updateData.loyaltyPointsEnabled = Boolean(loyaltyPointsEnabled)
    } else if (settings) {
      // Keep existing value if not provided
      updateData.loyaltyPointsEnabled = settings.loyaltyPointsEnabled ?? false
    } else {
      updateData.loyaltyPointsEnabled = false
    }

    if (loyaltyPointsPerDollar !== undefined && loyaltyPointsPerDollar !== null) {
      const parsedValue = parseFloat(loyaltyPointsPerDollar);
      if (!isNaN(parsedValue) && parsedValue >= 0.1) {
        updateData.loyaltyPointsPerDollar = parsedValue;
      } else if (settings) {
        // If invalid, keep existing value
        updateData.loyaltyPointsPerDollar = settings.loyaltyPointsPerDollar ?? 1.0;
      } else {
        updateData.loyaltyPointsPerDollar = 1.0;
      }
    } else if (settings) {
      // Keep existing value if not provided
      updateData.loyaltyPointsPerDollar = settings.loyaltyPointsPerDollar ?? 1.0;
    } else {
      updateData.loyaltyPointsPerDollar = 1.0;
    }
    
    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: updateData
      })
    } else {
      settings = await prisma.settings.create({
        data: updateData
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack, body })
    return NextResponse.json({ 
      error: 'Failed to update settings', 
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 })
  }
}

