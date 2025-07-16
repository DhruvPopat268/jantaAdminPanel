"use client"

import { useState, useEffect } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { Calendar, Eye, Printer, Download, XCircle, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
// Mock toast function - replace with your actual toast implementation
const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.error('Error:', message)
}

interface Order {
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
  cancelledAt?: string
  __v: number
  cartTotal?: number
  salesAgentName?: string
  salesAgentMobile?: string
  villageName?: string
  routeName?: string
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

export default function CancelledOrdersPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [processingOrders, setProcessingOrders] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [totalCancelledOrders, setTotalCancelledOrders] = useState(0)

  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
    fetchCancelledOrders(currentPage, itemsPerPage)
  }, [currentPage, itemsPerPage])

  // Update selectAll state when selectedOrders changes
  useEffect(() => {
    if (cancelledOrders.length > 0) {
      setSelectAll(selectedOrders.size === cancelledOrders.length)
    }
  }, [selectedOrders, cancelledOrders])

  const fetchCancelledOrders = async (page: number = 1, limit: number = 10) => {
    try {
      setLoading(true)
      // Include pagination parameters in the API call
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/orders/all?status=cancelled&page=${page}&limit=${limit}`
      )

      const data = await response.json()

      if (data.orders) {
        // Filter only cancelled orders
        const cancelled = data.orders.filter((order: Order) => order.status.toLowerCase() === 'cancelled')
        console.log(cancelled)
        setCancelledOrders(cancelled)
        setTotalCancelledOrders(cancelled.length)

        // Update pagination info based on filtered results
        if (data.pagination) {
          // Calculate cancelled orders pagination
          const totalCancelledCount = Math.floor(data.pagination.totalOrders * (cancelled.length / data.orders.length))
          const cancelledPagination: PaginationInfo = {
            ...data.pagination,
            totalOrders: totalCancelledCount,
            totalPages: Math.ceil(totalCancelledCount / limit),
            endIndex: Math.min(data.pagination.startIndex + cancelled.length - 1, totalCancelledCount)
          }
          setPagination(cancelledPagination)
        }

        setSelectedOrders(new Set()) // Clear selections when data refreshes
      }
    } catch (error) {
      console.error('Error fetching cancelled orders:', error)
      toast.error('Failed to fetch cancelled orders')
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = (orderId: string) => {
    router.push(`/dashboard/order-details/${orderId}`)
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedOrders(new Set(cancelledOrders.map(order => order._id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelectedOrders = new Set(selectedOrders)
    if (checked) {
      newSelectedOrders.add(orderId)
    } else {
      newSelectedOrders.delete(orderId)
    }
    setSelectedOrders(newSelectedOrders)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit)
    setCurrentPage(1) // Reset to first page when changing items per page
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

  const handleClearFilters = () => {
    setStartDate("")
    setEndDate("")
  }

  const handleSearch = () => {
    // Reset to first page when searching
    setCurrentPage(1)
    fetchCancelledOrders(1, itemsPerPage)
    console.log('Searching for:', searchTerm)
  }

  const handleShowData = () => {
    // Reset to first page when filtering by date
    setCurrentPage(1)
    fetchCancelledOrders(1, itemsPerPage)
    console.log('Filtering from:', startDate, 'to:', endDate)
  }

  const exportToCSV = () => {
    // Implement CSV export functionality
    const csvContent = cancelledOrders.map((order, index) => {
      const globalIndex = pagination ? pagination.startIndex + index - 1 : index
      return [
        globalIndex + 1,
        order._id.slice(-6).toUpperCase(),
        formatDate(order.orderDate),
        order.cancelledAt ? formatDate(order.cancelledAt) : 'N/A',
        order.userId.slice(-8).toUpperCase(),
        calculateCartTotal(order.orders),
        order.status
      ].join(',')
    })

    const header = 'SL,Order ID,Order Date,Cancelled Date,Customer,Total Amount,Status\n'
    const csv = header + csvContent.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cancelled-orders.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!pagination) return []

    const pages = []
    const totalPages = pagination.totalPages
    const current = pagination.currentPage

    // Always show first page
    if (totalPages > 0) pages.push(1)

    // Add pages around current page
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
      if (!pages.includes(i)) pages.push(i)
    }

    // Always show last page if more than 1 page
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages)
    }

    return pages.sort((a, b) => a - b)
  }

  if (!isMounted) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <XCircle className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Cancelled Orders</h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {pagination?.totalOrders || cancelledOrders.length}
        </span>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Select Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                <div className="relative">
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="dd-mm-yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                <div className="relative">
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="dd-mm-yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                Clear
              </button>
              <button
                onClick={handleShowData}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Show Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Export */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <input
            placeholder="Ex : Search by ID, order or payment status"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Search
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 border border-red-600 text-red-600 rounded-md bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Download className="h-4 w-4 mr-2 inline" />
            Export
          </button>
        </div>
      </div>



      {/* Cancelled Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading cancelled orders...</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-4 font-semibold">SL</th>
                  <th className="text-left p-4 font-semibold">Order ID</th>
                  <th className="text-left p-4 font-semibold">Order Date</th>
                  <th className="text-left p-4 font-semibold">Cancelled Date</th>
                  <th className="text-left p-4 font-semibold">Customer</th>
                  <th className="text-left p-4 font-semibold">Total Amount</th>
                  <th className="text-left p-4 font-semibold">Order Status</th>
                  <th className="text-left p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {cancelledOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No cancelled orders found
                    </td>
                  </tr>
                ) : (
                  cancelledOrders.map((order, index) => {
                    const globalIndex = pagination ? pagination.startIndex + index - 1 : index
                    return (
                      <tr key={order._id} className="hover:bg-gray-50 border-b">
                        <td className="p-4">{globalIndex + 1}</td>
                        <td className="p-4 font-medium text-blue-600">
                          {order._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="p-4">{formatDate(order.orderDate)}</td>
                        <td className="p-4">
                          {order.cancellationDate ? formatDate(order.cancellationDate) : 'N/A'}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-800">{order.salesAgentName || "N/A"}</div>
                          <div className="text-sm text-gray-500">{order.salesAgentMobile || "-"}</div>
                          <div className="font-medium text-gray-800">{order.villageName || "N/A"}</div>
                          <div className="text-sm text-gray-500">{order.routeName || "-"}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            ₹{(order.cartTotal || calculateCartTotal(order.orders)).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancelled
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <button
                              className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination Info */}
      {pagination && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            Showing {pagination.startIndex} to {pagination.endIndex} of {pagination.totalOrders} cancelled orders
          </div>
          <div>
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
        </div>
      )}


      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-3 border rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{pagination.startIndex}</span> to{' '}
                <span className="font-medium">{pagination.endIndex}</span> of{' '}
                <span className="font-medium">{pagination.totalOrders}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>

                {getPageNumbers().map((pageNum, index, array) => {
                  const isCurrentPage = pageNum === currentPage
                  const showEllipsis = index > 0 && pageNum - array[index - 1] > 1

                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && (
                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${isCurrentPage
                            ? 'z-10 bg-red-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  )
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}