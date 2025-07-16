"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Eye, Printer, Download, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react"

interface Order {
  _id: string
  userId: string
  user: {
    name: string
    mobile: string
  }
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
  salesAgentName?: string
  salesAgentMobile?: string
  villageName?: string
  routeName?: string
  __v: number
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalOrders: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startIndex: number
  endIndex: number
}

const statusCards = [
  { label: "Pending", key: "pending", icon: "📋", color: "text-orange-600" },
  { label: "Confirmed", key: "confirmed", icon: "✅", color: "text-green-600" },
  { label: "Out For Delivery", key: "out for delivery", icon: "🚚", color: "text-purple-600" },
  { label: "Delivered", key: "delivered", icon: "✅", color: "text-green-700" },
  { label: "Canceled", key: "canceled", icon: "❌", color: "text-red-600" },
]

const recordsPerPageOptions = [5, 10, 25, 50, 100]

export default function AllOrdersPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false,
    startIndex: 1,
    endIndex: 10
  })
  const [recordsPerPage, setRecordsPerPage] = useState(10)

  useEffect(() => {
    setIsMounted(true)
    fetchOrders()
  }, [pagination.currentPage, recordsPerPage])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, startDate, endDate])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/all?page=${pagination.currentPage}&limit=${recordsPerPage}`
      )
      const data = await response.json()
      console.log(data.orders)

      if (data.orders) {
        setOrders(data.orders)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(order => 
        order._id.toLowerCase().includes(searchLower) ||
        order.status.toLowerCase().includes(searchLower) ||
        order.salesAgentName?.toLowerCase().includes(searchLower) ||
        order.villageName?.toLowerCase().includes(searchLower) ||
        order.routeName?.toLowerCase().includes(searchLower)
      )
    }

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate)
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate) : null

        if (start && end) {
          return orderDate >= start && orderDate <= end
        } else if (start) {
          return orderDate >= start
        } else if (end) {
          return orderDate <= end
        }
        return true
      })
    }

    setFilteredOrders(filtered)
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  const handleRecordsPerPageChange = (value: string) => {
    const newLimit = parseInt(value)
    setRecordsPerPage(newLimit)
    setPagination(prev => ({ ...prev, currentPage: 1, limit: newLimit }))
  }

  const handleViewOrder = (orderId: string) => {
    router.push(`/dashboard/order-details/${orderId}`)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-orange-100 text-orange-800"
      case "canceled":
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "out for delivery":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const calculateCartTotal = (orderItems: Order['orders']) => {
    return orderItems.reduce((total, item) => total + item.attributes.total, 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusCounts = () => {
    const counts: Record<string, number> = {}
    
    // Initialize all status counts to 0
    statusCards.forEach(card => {
      counts[card.key] = 0
    })

    // Count orders by status (use filteredOrders for dynamic counting)
    filteredOrders.forEach(order => {
      const status = order.status.toLowerCase().trim()
      
      // Handle different possible status variations
      if (status === 'pending') counts['pending']++
      else if (status === 'confirmed') counts['confirmed']++
      else if (status === 'out for delivery' || status === 'out_for_delivery' || status === 'outfordelivery') counts['out for delivery']++
      else if (status === 'delivered') counts['delivered']++
      else if (status === 'canceled' || status === 'cancelled') counts['canceled']++
      else {
        // If status doesn't match predefined ones, still count it
        if (!counts[status]) counts[status] = 0
        counts[status]++
      }
    })

    return counts
  }

  const handleClearFilters = () => {
    setStartDate("")
    setEndDate("")
    setSearchTerm("")
  }

  const handleShowData = () => {
    filterOrders()
  }

  const handleSearch = () => {
    filterOrders()
  }

  const generatePageNumbers = () => {
    const pages = []
    const { currentPage, totalPages } = pagination
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (!isMounted) {
    return null
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          {pagination.totalOrders} Total
        </Badge>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Select Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="yy-mm-dd"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="yy-mm-dd"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
              <Button 
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleShowData}
              >
                Show Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusCards.map((card, index) => {
          const count = statusCounts[card.key] || 0
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{card.icon}</span>
                    <span className="font-medium text-gray-700">{card.label}</span>
                  </div>
                  <span className={`text-2xl font-bold ${card.color}`}>{count}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search, Records Per Page, and Export */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Input
            placeholder="Ex : Search by ID, order or payment status"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80"
          />
          <Button 
            className="bg-teal-600 hover:bg-teal-700"
            onClick={handleSearch}
          >
            Search
          </Button>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="recordsPerPage" className="whitespace-nowrap">Show:</Label>
            <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recordsPerPageOptions.map(option => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">entries</span>
          </div>
          
          <Button variant="outline" className="text-teal-600 border-teal-600 hover:bg-teal-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading orders...</div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">SL</TableHead>
                    <TableHead className="font-semibold">Order ID</TableHead>
                    <TableHead className="font-semibold">Order Date</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Total Amount</TableHead>
                    <TableHead className="font-semibold">Order Status</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {orders.length === 0 ? "No orders found" : "No orders match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order, index) => (
                      <TableRow key={order._id} className="hover:bg-gray-50">
                        <TableCell>{pagination.startIndex + index}</TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {order._id.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell>{formatDate(order.orderDate)}</TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-800">{order.salesAgentName || "N/A"}</div>
                          <div className="text-sm text-gray-500">{order.salesAgentMobile || "-"}</div>
                          <div className="font-medium text-gray-800">{order.villageName || "N/A"}</div>
                          <div className="text-sm text-gray-500">{order.routeName || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ₹{calculateCartTotal(order.orders).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(order.status)}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewOrder(order._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Showing {pagination.startIndex} to {pagination.endIndex} of {pagination.totalOrders} entries
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPreviousPage}
                        className="h-8 px-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex gap-1">
                        {generatePageNumbers().map((page, index) => (
                          <Button
                            key={index}
                            variant={page === pagination.currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => typeof page === 'number' && handlePageChange(page)}
                            disabled={page === '...'}
                            className="h-8 min-w-8 px-2"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className="h-8 px-2"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}