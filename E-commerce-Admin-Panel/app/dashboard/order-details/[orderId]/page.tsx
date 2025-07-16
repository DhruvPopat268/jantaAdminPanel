"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, MapPin, Printer, Receipt } from "lucide-react"

interface OrderDetails {
  _id: string
  userId: string
  orders: Array<{
    productId: string
    productName: string
    image: string
    attributes: {
      _id: string
      name: string
      discountedPrice: number
      quantity: number
      total: number
    }
    _id: string
  }>
  status: string
  orderDate: string
  cartTotal: number
  salesAgentName: string
  salesAgentMobile: string
  villageName: string
  routeName: string
  __v: number
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.orderId as string

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    }
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch order details')
      }

      const data = await response.json()

      if (data.order) {
        setOrderDetails(data.order)
      } else {
        throw new Error('Order not found')
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
      setError(error instanceof Error ? error.message : 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-orange-100 text-orange-800"
      case "canceled":
        return "bg-red-100 text-red-800"
      case "out for delivery":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading order details...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Order not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="text-blue-600 border-blue-600">
            <MapPin className="h-4 w-4 mr-2" />
            Show Location in Map
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                Order ID #{orderDetails._id.slice(-6).toUpperCase()}
                <Badge className="ml-2 bg-cyan-100 text-cyan-800">Main</Badge>
              </CardTitle>
              <p className="text-gray-600 mt-1">
                📅 {formatDate(orderDetails.orderDate)}
              </p>
            </div>
            <div className="text-right space-y-2">
              <div>
                <span className="text-sm text-gray-600">Status: </span>
                <Badge className={getStatusBadgeColor(orderDetails.status)}>
                  {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
                </Badge>
              </div>

            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Sales Agent</p>
              <p className="font-medium">{orderDetails.salesAgentName || "N/A"}</p>
              <p className="text-sm text-gray-500">{orderDetails.salesAgentMobile || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium">{orderDetails.villageName || "N/A"}</p>
              <p className="text-sm text-gray-500">{orderDetails.routeName || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Note */}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">SL</TableHead>
                <TableHead className="font-semibold">Item Details</TableHead>
                <TableHead className="font-semibold">Attribute</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Discount Price</TableHead>

                <TableHead className="font-semibold">Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderDetails.orders.map((item, index) => (
                <TableRow key={item._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{item.productName}</p>

                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.attributes.name}</span>

                  </TableCell>
                  <TableCell>
                    <span className="font-medium"> ₹{item.attributes.discountedPrice}</span>

                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.attributes.quantity}</span>

                  </TableCell>
                  <TableCell>
                    <span className="font-medium">₹{(item.attributes.discountedPrice * item.attributes.quantity).toLocaleString()}</span>
                  </TableCell>

                  <TableCell>
                    <span className="font-medium">₹{item.attributes.total.toLocaleString()}</span>
                  </TableCell>
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-gray-50 font-medium">
                <TableCell colSpan={6} className="text-right">
                  <span className="text-lg">Grand Total:</span>
                </TableCell>
                <TableCell>
                  <span className="text-lg font-bold text-green-600">₹108,000</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}