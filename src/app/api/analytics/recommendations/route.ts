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

// Get recommended thresholds based on sales analytics
export async function GET() {
  try {
    const prisma = getPrismaClient()
    const now = new Date()

    // Get sales data for different periods
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    // Get all products
    const products = await prisma.product.findMany({
      include: {
        sales: {
          where: {
            createdAt: {
              gte: yearAgo
            }
          }
        }
      }
    })

    // Calculate recommendations
    const recommendations = products.map(product => {
      // Calculate average daily sales for different periods
      const weekSales = product.sales.filter(s => s.createdAt >= weekAgo)
      const monthSales = product.sales.filter(s => s.createdAt >= monthAgo)
      const yearSales = product.sales.filter(s => s.createdAt >= yearAgo)

      const weekAvgDaily = weekSales.reduce((sum, s) => sum + s.quantity, 0) / 7
      const monthAvgDaily = monthSales.reduce((sum, s) => sum + s.quantity, 0) / 30
      const yearAvgDaily = yearSales.reduce((sum, s) => sum + s.quantity, 0) / 365

      // Use the most recent period with data, or average
      let avgDailySales = weekAvgDaily || monthAvgDaily || yearAvgDaily || 0

      // Recommend thresholds based on average daily sales
      // Low threshold: 3 days of sales
      // Moderate threshold: 7 days of sales
      // High threshold: 14 days of sales
      const recommendedLow = Math.max(1, Math.ceil(avgDailySales * 3))
      const recommendedModerate = Math.max(5, Math.ceil(avgDailySales * 7))
      const recommendedHigh = Math.max(10, Math.ceil(avgDailySales * 14))

      return {
        productId: product.id,
        productName: product.name,
        currentQuantity: product.quantity,
        averageDailySales: avgDailySales,
        recommendedLow,
        recommendedModerate,
        recommendedHigh,
        salesData: {
          week: weekSales.length,
          month: monthSales.length,
          year: yearSales.length
        }
      }
    })

    // Calculate overall recommended thresholds (average across all products)
    const overallLow = Math.max(1, Math.ceil(
      recommendations.reduce((sum, r) => sum + r.recommendedLow, 0) / Math.max(1, recommendations.length)
    ))
    const overallModerate = Math.max(5, Math.ceil(
      recommendations.reduce((sum, r) => sum + r.recommendedModerate, 0) / Math.max(1, recommendations.length)
    ))
    const overallHigh = Math.max(10, Math.ceil(
      recommendations.reduce((sum, r) => sum + r.recommendedHigh, 0) / Math.max(1, recommendations.length)
    ))

    return NextResponse.json({
      overall: {
        recommendedLow: overallLow,
        recommendedModerate: overallModerate,
        recommendedHigh: overallHigh
      },
      byProduct: recommendations
    })
  } catch (error) {
    console.error('Error getting recommendations:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to get recommendations', 
      details: errorMessage
    }, { status: 500 })
  }
}

