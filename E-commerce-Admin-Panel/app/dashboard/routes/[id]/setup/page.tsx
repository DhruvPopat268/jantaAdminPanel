"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Search, Download, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import axios from "axios"

interface Village {
  id: string
  name: string
  checked: boolean
}

interface Customer {
  id: number
  name: string
  villages: string[]
  status: boolean
  email?: string
  phone?: string
}

export default function RouteSetupPage() {
  const params = useParams()
  const routeId = params.id

  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customersError, setCustomersError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [hasExistingSetup, setHasExistingSetup] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    fetchRouteSetup()
  }, [])

const fetchRouteSetup = async () => {
  try {
    setLoading(true)
    setError(null)

    const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/routesSetup/${routeId}/setup`
    console.log("Fetching route setup:", url)

    const response = await axios.get(url)

    if (response.status === 200 && response.data.success) {
      const { villages: villagesData, customers: customersData, hasExistingSetup: hasSetup } = response.data.data

      setVillages(villagesData || [])
      setCustomers(customersData || [])
      setHasExistingSetup(hasSetup)

      const allChecked = villagesData?.every((village: Village) => village.checked) || false
      setSelectAll(allChecked)
    } else {
      console.error("Unexpected API response:", response)
      setError(response.data.message || "Failed to fetch route setup data.")
    }
  } catch (error) {
    console.error("Error fetching route setup:", error)
    if (axios.isAxiosError(error)) {
      console.error("Axios Error:", error.response)
      setError(`API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`)
    } else {
      setError("Failed to fetch route setup data. Please try again.")
    }
  } finally {
    setLoading(false)
  }
}


  const handleSelectAll = (checked: boolean) => {
    console.log('Select All clicked:', checked)
    setSelectAll(checked)
    const updatedVillages = villages.map((village) => ({ ...village, checked }))
    setVillages(updatedVillages)
    console.log('Updated villages after select all:', updatedVillages)
  }

  const handleVillageChange = (villageId: string, checked: boolean) => {
    console.log('Village change:', villageId, checked)
    const updatedVillages = villages.map((village) => 
      village.id === villageId ? { ...village, checked } : village
    )
    
    setVillages(updatedVillages)
    const allChecked = updatedVillages.every((village) => village.checked)
    setSelectAll(allChecked)
    console.log('Updated villages:', updatedVillages)
    console.log('All checked:', allChecked)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const selectedVillages = villages.filter((village) => village.checked)
    console.log('Selected villages for submission:', selectedVillages)
    
    // Extract village IDs and names for debugging
    const selectedVillageIds = selectedVillages.map(v => v.id)
    const selectedVillageNames = selectedVillages.map(v => v.name)
    
    console.log('Selected village IDs:', selectedVillageIds)
    console.log('Selected village names:', selectedVillageNames)
    
    if (selectedVillages.length === 0) {
      alert('Please select at least one village.')
      return
    }
    
    try {
      setSaving(true)
      setCustomersError(null)
      setCustomersLoading(true)
      
      // Try different payload formats to see which one works
      const payload = {
        selectedVillages: selectedVillages,
        villageIds: selectedVillageIds,
        routeId: routeId
      }
      
      console.log('Submitting route setup with payload:', payload)
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/routesSetup/${routeId}/setup`, payload)
      
      console.log('Save route setup response:', response.data)
      console.log('Response status:', response.status)
      console.log('Full response object:', response)
      
      if (response.data.success) {
        const customersData = response.data.data.customers || []
        console.log('Received customers data:', customersData)
        console.log('Customers count:', customersData.length)
        
        // Log each customer for debugging
        customersData.forEach((customer, index) => {
          console.log(`Customer ${index + 1}:`, customer)
        })
        
        setCustomers(customersData)
        setHasExistingSetup(true)
        
        // Show success message
        alert(`Route setup saved successfully! Found ${customersData.length} customers.`)
      } else {
        console.error('Save failed:', response.data)
        setCustomersError(response.data.message || 'Failed to save route setup')
      }
    } catch (error) {
      console.error('Error saving route setup:', error)
      if (axios.isAxiosError(error)) {
        console.error('Save Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          request: error.config
        })
        setCustomersError(`Save Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`)
      } else {
        setCustomersError('Failed to save route setup. Please try again.')
      }
    } finally {
      setSaving(false)
      setCustomersLoading(false)
    }
  }

  const handleReset = async () => {
    try {
      console.log('Resetting route setup')
      
      // Reset UI state
      setVillages(villages.map((village) => ({ ...village, checked: false })))
      setSelectAll(false)
      setCustomers([])
      setCustomersError(null)
      setHasExistingSetup(false)
      
      // Optional: Delete from backend
      if (hasExistingSetup) {
        const confirmDelete = window.confirm('This will delete the saved route setup. Are you sure?')
        if (confirmDelete) {
          console.log('Deleting route setup from backend')
          await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/routesSetup/${routeId}/setup`)
          console.log('Route setup deleted successfully')
        }
      }
    } catch (error) {
      console.error('Error resetting route setup:', error)
    }
  }

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isMounted) {
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
     
      <div className="flex items-center gap-4">
        <Link href="/dashboard/routes/setup">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-semibold">🛣️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Routes Setup</h1>
            {hasExistingSetup && (
              <p className="text-sm text-green-600">✓ Route setup saved</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Villages in Route :</label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectAll} 
                  onCheckedChange={handleSelectAll}
                  disabled={loading || villages.length === 0}
                />
                <label htmlFor="select-all" className="text-sm text-gray-600">
                  Select All ({villages.length} villages)
                </label>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading villages...</div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-700 text-sm font-semibold mb-2">Error Details:</div>
                <div className="text-red-700 text-sm">{error}</div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchRouteSetup}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && villages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No villages found for this route
              </div>
            )}

            {!loading && !error && villages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {villages.map((village) => (
                  <div key={village.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={village.id}
                      checked={village.checked}
                      onCheckedChange={(checked) => handleVillageChange(village.id, checked as boolean)}
                    />
                    <label htmlFor={village.id} className="text-sm text-gray-600">
                      {village.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              disabled={loading || villages.length === 0 || saving}
            >
              Reset
            </Button>
            <Button 
              type="submit" 
              className="bg-teal-600 hover:bg-teal-700"
              disabled={loading || villages.length === 0 || saving}
            >
              {saving ? 'Saving...' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Customers Table</h2>
              <Badge variant="secondary">{filteredCustomers.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Customer Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
                />
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" className="text-teal-600 border-teal-600 hover:bg-teal-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {customersLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading customers...</div>
            </div>
          )}

          {customersError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
              <div className="text-red-700 text-sm font-semibold mb-2">Customer Loading Error:</div>
              <div className="text-red-700 text-sm">{customersError}</div>
            </div>
          )}

          {!customersLoading && !customersError && customers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {villages.some(v => v.checked) || hasExistingSetup ? 
                'No customers found for selected villages' : 
                'Please select villages and click Submit to load customers'
              }
            </div>
          )}

          {!customersLoading && !customersError && customers.length > 0 && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Villages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer, index) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {customer.villages.map((village, idx) => (
                          <span key={idx} className="text-blue-600">
                            {village}
                            {idx < customer.villages.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Switch checked={customer.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}