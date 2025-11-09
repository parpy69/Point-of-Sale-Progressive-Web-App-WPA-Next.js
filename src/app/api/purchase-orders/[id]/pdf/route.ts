import { NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../generated/prisma/client'
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const prisma = getPrismaClient()
    const resolvedParams = await Promise.resolve(params)
    const orderId = parseInt(resolvedParams.id)

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { supplier: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const items = JSON.parse(order.items)
    
    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin: 0; }
            .order-info { margin-bottom: 30px; }
            .order-info table { width: 100%; border-collapse: collapse; }
            .order-info td { padding: 8px 0; }
            .order-info td:first-child { font-weight: bold; width: 150px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .items-table th { background-color: #2563eb; color: white; }
            .items-table tr:nth-child(even) { background-color: #f9fafb; }
            .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
            .notes { margin-top: 30px; padding: 15px; background-color: #f3f4f6; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PURCHASE ORDER</h1>
            <p style="color: #6b7280; margin: 5px 0;">Order Number: ${order.orderNumber}</p>
          </div>
          
          <div class="order-info">
            <table>
              <tr>
                <td>Supplier:</td>
                <td>${order.supplier.name}</td>
              </tr>
              <tr>
                <td>Email:</td>
                <td>${order.supplier.email}</td>
              </tr>
              ${order.supplier.phone ? `<tr><td>Phone:</td><td>${order.supplier.phone}</td></tr>` : ''}
              ${order.supplier.address ? `<tr><td>Address:</td><td>${order.supplier.address}</td></tr>` : ''}
              <tr>
                <td>Order Date:</td>
                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
              </tr>
              ${order.expectedArrivalDate ? `<tr>
                <td>Expected Arrival:</td>
                <td>${new Date(order.expectedArrivalDate).toLocaleDateString()}</td>
              </tr>` : ''}
            </table>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td>${item.productName || 'N/A'}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice?.toFixed(2) || '0.00'}</td>
                  <td>$${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            Total Amount: $${order.totalAmount.toFixed(2)}
          </div>

          ${order.notes ? `<div class="notes"><strong>Notes:</strong><br>${order.notes}</div>` : ''}
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating PDF HTML:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF', 
      details: errorMessage
    }, { status: 500 })
  }
}

