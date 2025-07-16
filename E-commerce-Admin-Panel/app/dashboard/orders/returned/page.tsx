"use client"

import { useState, useEffect } from "react"
import React from "react"
import { Calendar, Eye, Printer, Download, Clock, Check, Loader2, X ,  Truck, Package, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation" 
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

export default function returnOrdersPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [returnOrders, setReturnOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [confirmingOrders, setConfirmingOrders] = useState(false)
  const [cancellingOrders, setCancellingOrders] = useState(false)
   const [allOrders, setAllOrders] = useState<Order[]>([]) 
    // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
    fetchreturnOrders()
  }, [])

  useEffect(() => {
  paginateOrders()
}, [currentPage, itemsPerPage, allOrders])
  

  // Update selectAll state when selectedOrders changes
  useEffect(() => {
    if (returnOrders.length > 0) {
      setSelectAll(selectedOrders.size === returnOrders.length)
    }
  }, [selectedOrders, returnOrders])

  const fetchreturnOrders = async () => {
    try {
      setLoading(true)
      // Replace with your actual API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/orders/all?page=1&limit=1000`)
      const data = await response.json()

      if (data.orders) {
        // Filter only returno orders
        const returno = data.orders.filter((order: Order) => order.status.toLowerCase() === 'returned')
        setReturnOrders(returno)
        setAllOrders(returno)
        setSelectedOrders(new Set())
        setCurrentPage(1) 
      }
    } catch (error) {
      console.error('Error fetching returno orders:', error)
      toast.error('Failed to fetch returno orders')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedOrders(new Set(returnOrders.map(order => order._id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  const paginateOrders = () => {
    const totalOrders = allOrders.length
    const totalPages = Math.ceil(totalOrders / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage + 1
    const endIndex = Math.min(currentPage * itemsPerPage, totalOrders)
    
    // Get current page orders
    const currentPageOrders = allOrders.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )
    
    setReturnOrders(currentPageOrders)
    
    setPaginationInfo({
      currentPage,
      totalPages,
      totalOrders,
      limit: itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      startIndex: totalOrders > 0 ? startIndex : 0,
      endIndex: totalOrders > 0 ? endIndex : 0
    })
  }

  const handleViewOrder = (orderId: string) => {
    router.push(`/dashboard/order-details/${orderId}`)
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

  const confirmSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order to confirm')
      return
    }

    try {
      setConfirmingOrders(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/confirm-bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      })

      const data = await response.json()

      if (response.ok) {
        // Remove confirmed orders from returno orders list
        setReturnOrders(prev => prev.filter(order => !selectedOrders.has(order._id)))
        setSelectedOrders(new Set())
        setSelectAll(false)
        toast.success(`${selectedOrders.size} order(s) confirmed successfully!`)
      } else {
        toast.error(data.message || 'Failed to confirm orders')
      }
    } catch (error) {
      console.error('Error confirming orders:', error)
      toast.error('Failed to confirm orders')
    } finally {
      setConfirmingOrders(false)
    }
  }

  const cancelSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order to cancel')
      return
    }

    try {
      setCancellingOrders(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/cancel-bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      })

      const data = await response.json()

      if (response.ok) {
        // Remove cancelled orders from returno orders list
        setReturnOrders(prev => prev.filter(order => !selectedOrders.has(order._id)))
        setSelectedOrders(new Set())
        setSelectAll(false)
        toast.success(`${selectedOrders.size} order(s) cancelled successfully!`)
      } else {
        toast.error(data.message || 'Failed to cancel orders')
      }
    } catch (error) {
      console.error('Error cancelling orders:', error)
      toast.error('Failed to cancel orders')
    } finally {
      setCancellingOrders(false)
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

  const handleClearFilters = () => {
    setStartDate("")
    setEndDate("")
  }

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      // If search is empty, show all out for delivery orders
      fetchreturnOrders()
      return
    }

    // Filter orders based on search term
    const filteredOrders = allOrders.filter(order => {
      const orderId = order._id.slice(-6).toUpperCase()
      const customerName = (order.salesAgentName || "").toLowerCase()
      const status = order.status.toLowerCase()
      const searchLower = searchTerm.toLowerCase()

      return (
        orderId.includes(searchLower.toUpperCase()) ||
        customerName.includes(searchLower) ||
        status.includes(searchLower)
      )
    })

    setAllOrders(filteredOrders)
    setCurrentPage(1)
  }

  const handleShowData = () => {
     if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    // Filter orders by date range
    const filteredOrders = allOrders.filter(order => {
      const orderDate = new Date(order.orderDate).toISOString().split('T')[0]
      return orderDate >= startDate && orderDate <= endDate
    })

    setAllOrders(filteredOrders)
    setCurrentPage(1)
  }

  const exportToCSV = () => {
    // Implement CSV export functionality
    const csvContent = returnOrders.map((order, index) => {
      return [
        index + 1,
        order._id.slice(-6).toUpperCase(),
        formatDate(order.orderDate),
        order.userId.slice(-8).toUpperCase(),
        calculateCartTotal(order.orders),
        order.status
      ].join(',')
    })

    const header = 'SL,Order ID,Order Date,Customer,Total Amount,Status\n'
    const csv = header + csvContent.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'returno-orders.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Pagination handlers
  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePreviousPage = () => {
    if (paginationInfo?.hasPreviousPage) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (paginationInfo?.hasNextPage) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!paginationInfo) return []
    
    const { totalPages, currentPage } = paginationInfo
    const pages = []
    
    if (totalPages <= 5) {
      // Show all pages if total pages <= 5
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page, current page context, and last page
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    
    return pages
  }

  if (!isMounted) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">return Orders</h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          {paginationInfo?.totalOrders || allOrders.length}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                Clear
              </button>
              <button
                onClick={handleShowData}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
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
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Search
          </button>
        </div>
        <button 
          onClick={exportToCSV}
          className="px-4 py-2 border border-teal-600 text-teal-600 rounded-md bg-white hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <Download className="h-4 w-4 mr-2 inline" />
          Export
        </button>
      </div>

       {/* Items per page selector - Above table */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">entries</span>
        </div>
        
        {paginationInfo && (
          <div className="text-sm text-gray-700">
            Showing {paginationInfo.startIndex} to {paginationInfo.endIndex} of {paginationInfo.totalOrders} entries
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {returnOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({returnOrders.length} orders)
                  </label>
                </div>
                {selectedOrders.size > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedOrders.size} selected
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cancelSelectedOrders}
                  disabled={selectedOrders.size === 0 || cancellingOrders}
                  className={`px-4 py-2 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${selectedOrders.size === 0 || cancellingOrders
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  {cancellingOrders ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2 inline" />
                      Cancel Selected ({selectedOrders.size})
                    </>
                  )}
                </button>
                <button
                  onClick={confirmSelectedOrders}
                  disabled={selectedOrders.size === 0 || confirmingOrders}
                  className={`px-4 py-2 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${selectedOrders.size === 0 || confirmingOrders
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                  {confirmingOrders ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2 inline" />
                      Confirm Selected ({selectedOrders.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* returno Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading returno orders...</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-4 font-semibold w-12">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="text-left p-4 font-semibold">SL</th>
                  <th className="text-left p-4 font-semibold">Order ID</th>
                  <th className="text-left p-4 font-semibold">Order Date</th>
                  <th className="text-left p-4 font-semibold">Customer</th>
                  <th className="text-left p-4 font-semibold">Total Amount</th>
                  <th className="text-left p-4 font-semibold">Order Status</th>
                  <th className="text-left p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {returnOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No return orders found
                    </td>
                  </tr>
                ) : (
                  returnOrders.map((order, index) => (
                    <tr key={order._id} className="hover:bg-gray-50 border-b">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order._id)}
                          onChange={(e) =>
                            handleSelectOrder(order._id, e.target.checked)
                          }
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                      </td>
                     <td className="p-4">{paginationInfo ? paginationInfo.startIndex + index : index + 1}</td>
                      <td className="p-4 font-medium text-blue-600">
                        {order._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="p-4">{formatDate(order.orderDate)}</td>
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-orange-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Returned
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
                            className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                      
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
       {/* Pagination Controls - Below table */}
            {paginationInfo && paginationInfo.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Showing {paginationInfo.startIndex} to {paginationInfo.endIndex} of {paginationInfo.totalOrders} entries
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={handlePreviousPage}
                    disabled={!paginationInfo.hasPreviousPage}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      !paginationInfo.hasPreviousPage
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
      
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      <React.Fragment key={index}>
                        {page === '...' ? (
                          <span className="px-3 py-2 text-sm text-gray-500">...</span>
                        ) : (
                          <button
                            onClick={() => handlePageChange(page as number)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              page === paginationInfo.currentPage
                                ? 'bg-orange-600 text-white'
                                : 'text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                          >
                            {page}
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
      
                  {/* Next Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={!paginationInfo.hasNextPage}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      !paginationInfo.hasNextPage
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
    </div>
  )
}