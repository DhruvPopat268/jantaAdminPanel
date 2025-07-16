"use client"

import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import Image from "next/image"
import { Search, Plus, Pencil, Trash2, Download, UserCheck, Loader2, ChevronDown, Route, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'react-toastify';

interface SalesAgent {
    _id: string
    name: string
    businessName: string
    mobileNumber: string
    address: string
    village: string
    photo: {
        public_id?: string
        url?: string
    }
    status: boolean
    routeStatus: boolean
    createdAt: string
    updatedAt: string
}

interface Village {
    _id: string
    name: string
    // Add other village properties if needed
}

interface ApiResponse {
    success: boolean
    data: SalesAgent[]
    message?: string
    pagination?: {
        current: number
        total: number
        count: number
        totalRecords: number
    }
}

interface VillageApiResponse {
    success: boolean
    data: Village[]
    message?: string
}

export default function SalesAgentPage() {
    const [salesAgents, setSalesAgents] = useState<SalesAgent[]>([])
    const [villages, setVillages] = useState<Village[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(100)
    const [pagination, setPagination] = useState({
        current: 1,
        total: 1,
        count: 0,
        totalRecords: 0
    })
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)
    const [villagesLoading, setVillagesLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
   

    const [newAgent, setNewAgent] = useState({
        name: "",
        businessName: "",
        mobileNumber: "",
        address: "",
        village: "",
    })
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)

    const fetchVillages = async () => {
        try {
            setVillagesLoading(true)
            const { data } = await axios.get<VillageApiResponse>(`${process.env.NEXT_PUBLIC_BASE_URL}/api/villages`)

            if (data.success) {
                console.log(data.data)
                setVillages(data.data)
            } else {
                toast.error(data.message || 'Failed to fetch villages')
            }
        } catch (error) {
            toast.error("Failed to fetch villages")
        } finally {
            setVillagesLoading(false)
        }
    }

    const fetchSalesAgents = async (page: number = currentPage, limit: number = itemsPerPage) => {
        try {
            setLoading(true)
            setError(null)

            const queryParams = new URLSearchParams()
            if (searchTerm) queryParams.append('search', searchTerm)
            queryParams.append('page', page.toString())
            queryParams.append('limit', limit.toString())

            const { data } = await axios.get<ApiResponse>(`${process.env.NEXT_PUBLIC_BASE_URL}/api/salesAgents?${queryParams}`)

            if (data.success) {
                setSalesAgents(data.data)
                if (data.pagination) {
                    setPagination(data.pagination)
                }
            } else {
                setError(data.message || 'Failed to fetch sales agents')
                toast.error(data.message || 'Failed to fetch sales agents')
            }
        } catch (error) {
            setError('Network error occurred')
            toast.error("Network error occurred")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVillages()
    }, [])

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            setCurrentPage(1) // Reset to first page when searching
            fetchSalesAgents(1, itemsPerPage)
        }, 300)
        return () => clearTimeout(debounceTimer)
    }, [searchTerm])

    useEffect(() => {
        fetchSalesAgents(currentPage, itemsPerPage)
    }, [currentPage, itemsPerPage])

    // Pagination handlers
    const handleNextPage = () => {
        if (currentPage < pagination.total) {
            setCurrentPage(currentPage + 1)
        }
    }

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1)
        }
    }

    const handlePageSizeChange = (newSize: string) => {
        setItemsPerPage(parseInt(newSize))
        setCurrentPage(1) // Reset to first page when changing page size
    }

    const handleAddAgent = async () => {
        if (!newAgent.name || !newAgent.businessName || !newAgent.mobileNumber || !newAgent.address || !newAgent.village) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            setSubmitLoading(true)
            const formData = new FormData()
            Object.entries(newAgent).forEach(([key, value]) => formData.append(key, value))
            if (photoFile) formData.append('photo', photoFile)

            const { data } = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/salesAgents`, formData)

            if (data.success) {
                toast.success('Sales agent created successfully')
                resetForm()
                setIsDialogOpen(false)
                fetchSalesAgents(currentPage, itemsPerPage)
                
            } else {
               toast.error('Failed to create sales agent')
            }
        } catch {
            toast.error("Network error occurred")
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleEditAgent = async () => {
        if (!editingAgentId) return

        try {
            setSubmitLoading(true)
            const formData = new FormData()
            Object.entries(newAgent).forEach(([key, value]) => formData.append(key, value))
            if (photoFile) formData.append('photo', photoFile)

            const { data } = await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}/api/salesAgents/${editingAgentId}`, formData)

            if (data.success) {
                toast.success("Sales agent updated successfully")
                resetForm()
                setIsDialogOpen(false)
                fetchSalesAgents(currentPage, itemsPerPage)
            } else {
                toast.error("Failed to update sales agent")
            }
        } catch {
            toast.error("Network error occurred")
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { data } = await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}/api/salesAgents/${id}/status`, {
                status: !currentStatus
            })

            if (data.success) {
                toast.success(`Sales agent status ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
                fetchSalesAgents(currentPage, itemsPerPage)
            } else {
                toast.error("Failed to update status")
            }
        } catch {
            toast.error("Network error occurred")
        }
    }

    const handleToggleRouteStatus = async (id: string, currentRouteStatus: boolean) => {
        try {
            const { data } = await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}/api/salesAgents/${id}/route-status`, {
                routeStatus: !currentRouteStatus
            })

            if (data.success) {
                toast.success(`Route status ${!currentRouteStatus ? 'activated' : 'deactivated'} successfully`)
                fetchSalesAgents(currentPage, itemsPerPage)
            } else {
                toast.error("Failed to update route status")
            }
        } catch {
            toast.error("Network error occurred")
        }
    }

    const handleDeleteAgent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this sales agent?')) return

        try {
            const { data } = await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/salesAgents/${id}`)

            if (data.success) {
                toast.success("Sales agent deleted successfully")
                fetchSalesAgents(currentPage, itemsPerPage)
            } else {
                toast.error("Failed to delete sales agent")
            }
        } catch {
            toast.error("Network error occurred")
        }
    }

    const handleExport = async () => {
        try {
            const { data } = await axios.get<ApiResponse>(`${process.env.NEXT_PUBLIC_BASE_URL}/api/salesAgents`)
            if (data.success) {
                const csvContent = [
                    ['Name', 'Business Name', 'Mobile Number', 'Address', 'Village', 'Status', 'Route Status', 'Created At'].join(','),
                    ...data.data.map(agent => [
                        agent.name,
                        agent.businessName,
                        agent.mobileNumber,
                        agent.address,
                        agent.village,
                        agent.status ? 'Active' : 'Inactive',
                        agent.routeStatus ? 'Active' : 'Inactive',
                        new Date(agent.createdAt).toLocaleDateString()
                    ].join(','))
                ].join('\n')

                const blob = new Blob([csvContent], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `sales-agents-${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)

                toast.success("Sales agents data exported successfully")
            }
        } catch {
            toast.error("Failed to export data")
        }
    }

    const resetForm = () => {
        setNewAgent({
            name: "",
            businessName: "",
            mobileNumber: "",
            address: "",
            village: "",
        })
        setPhotoFile(null)
        setPhotoPreview(null)
        setIsEditMode(false)
        setEditingAgentId(null)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setNewAgent({ ...newAgent, [name]: value })
    }

    const handleVillageChange = (value: string) => {
        setNewAgent({ ...newAgent, village: value })
        console.log(value)
    }

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setPhotoFile(file)
            const reader = new FileReader()
            reader.onload = (event) => {
                if (event.target?.result) {
                    setPhotoPreview(event.target.result as string)
                }
            }
            reader.readAsDataURL(file)
        }
    }

    const handleEditClick = (agent: SalesAgent) => {
        setIsEditMode(true)
        setEditingAgentId(agent._id)
        
        // Handle village ID extraction properly
        let villageId = '';
        if (typeof agent.village === 'string') {
            // If village is stored as string, find the matching village ID
            const matchingVillage = villages.find(v => v.name === agent.village);
            villageId = matchingVillage?._id || '';
        } else if (agent.village && typeof agent.village === 'object') {
            // If village is stored as object, use its _id
            villageId = agent.village._id || '';
        }
        
        setNewAgent({
            name: agent.name,
            businessName: agent.businessName,
            mobileNumber: agent.mobileNumber,
            address: agent.address,
            village: villageId, // Use the extracted village ID
        })
        
        if (agent.photo?.url) setPhotoPreview(agent.photo.url)
        setIsDialogOpen(true)
    }

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            resetForm()
        }
        setIsDialogOpen(open)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <UserCheck className="h-8 w-8" />
                    Customer List
                    <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm text-blue-800">
                        {pagination.totalRecords}
                    </span>
                </h2>
                <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>
                                {isEditMode ? 'Edit Sales Agent' : 'Add New Sales Agent'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative h-24 w-24 overflow-hidden rounded-full border">
                                    {photoPreview ? (
                                        <Image
                                            src={photoPreview}
                                            alt="Agent photo preview"
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                                            No Photo
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="photo" className="cursor-pointer text-sm font-medium text-blue-600">
                                        Upload Photo
                                    </Label>
                                    <Input
                                        id="photo"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Enter name"
                                        value={newAgent.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="businessName">Business Name *</Label>
                                    <Input
                                        id="businessName"
                                        name="businessName"
                                        placeholder="Enter business name"
                                        value={newAgent.businessName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                                    <Input
                                        id="mobileNumber"
                                        name="mobileNumber"
                                        placeholder="Enter mobile number"
                                        value={newAgent.mobileNumber}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="village">Village *</Label>
                                    <Select value={newAgent.village} onValueChange={handleVillageChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={villagesLoading ? "Loading villages..." : "Select village"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {villagesLoading ? (
                                                <SelectItem value="" disabled>
                                                    <div className="flex items-center">
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Loading villages...
                                                    </div>
                                                </SelectItem>
                                            ) : villages.length === 0 ? (
                                                <SelectItem value="" disabled>
                                                    No villages found
                                                </SelectItem>
                                            ) : (
                                                villages.map((village) => (
                                                    <SelectItem key={village.id} value={village.id} >
                                                        {village.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="address">Address *</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        placeholder="Enter address"
                                        value={newAgent.address}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={submitLoading}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={isEditMode ? handleEditAgent : handleAddAgent}
                                    disabled={submitLoading}
                                >
                                    {submitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isEditMode ? 'Update' : 'Submit'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by Name, Phone, Business or Village"
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={itemsPerPage.toString()} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">SL</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Business Info</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Route Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    <p className="mt-2 text-muted-foreground">Loading sales agents...</p>
                                </TableCell>
                            </TableRow>
                        ) : salesAgents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No sales agents found
                                </TableCell>
                            </TableRow>
                        ) : (
                            salesAgents.map((agent, index) => (
                                <TableRow key={agent._id}>
                                    <TableCell>{((currentPage - 1) * itemsPerPage) + index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 relative overflow-hidden rounded-full">
                                                <Image
                                                    src={agent.photo?.url || '/default-avatar.png'}
                                                    alt={agent.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="font-medium">{agent.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="text-sm">{agent.mobileNumber}</div>
                                            <div className="text-xs text-muted-foreground">{agent.address}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="text-sm">{agent.businessName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Village: {typeof agent.village === 'string' ? agent.village : agent.village?.name || 'N/A'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={agent.status}
                                                onCheckedChange={() => handleToggleStatus(agent._id, agent.status)}
                                            />
                                            <span className={`text-xs px-2 py-1 rounded-full ${agent.status
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {agent.status ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={agent.routeStatus}
                                                onCheckedChange={() => handleToggleRouteStatus(agent._id, agent.routeStatus)}
                                            />
                                            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${agent.routeStatus
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                <Route className="h-3 w-3" />
                                                {agent.routeStatus ? 'On Route' : 'Off Route'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleEditClick(agent)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700"
                                                onClick={() => handleDeleteAgent(agent._id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.totalRecords)} of {pagination.totalRecords} entries
                    </span>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1 || loading}
                        className="flex items-center gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {pagination.total}
                        </span>
                    </div>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === pagination.total || loading}
                        className="flex items-center gap-1"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}