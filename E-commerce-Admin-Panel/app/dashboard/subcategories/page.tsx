"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import Image from "next/image"
import { Pencil, Plus, Search, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export default function SubCategoriesPage() {
  const [subCategories, setSubCategories] = useState([])
  const [categories, setCategories] = useState([]) // Initialize as empty array
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newSubCategory, setNewSubCategory] = useState({ 
    categoryId: "", 
    name: "", 
    status: true 
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loadingSubCategories, setLoadingSubCategories] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [limit, setLimit] = useState(10) // Items per page - now changeable
  const [isSearching, setIsSearching] = useState(false)

  // Status filter
  const [statusFilter, setStatusFilter] = useState("")

  // Records per page options
  const recordsPerPageOptions = [5, 10, 25, 50, 100]

  // Fetch categories from backend
  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`)
      // Ensure data is an array
      if (Array.isArray(data)) {
        setCategories(data)
      } else if (data && Array.isArray(data.data)) {
        setCategories(data.data)
      } else {
        console.warn("Categories data is not an array:", data)
        setCategories([]) // Fallback to empty array
      }
    } catch (err) {
      console.error("Failed to fetch categories", err)
      setCategories([]) // Fallback to empty array on error
    }
  }

  // Fetch subcategories with search and pagination
  const fetchSubCategories = async (page = currentPage, search = searchQuery, status = statusFilter, pageLimit = limit) => {
    try {
      setLoadingSubCategories(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageLimit.toString()
      })
      
      if (search.trim()) {
        params.append('search', search.trim())
      }
      
      if (status !== "" && status !== "all") {
        params.append('status', status)
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcategories?${params.toString()}`
      )
      
      if (response.status === 200) {
        const responseData = response.data
        console.log("SubCategories Response:", responseData)
        
        // Handle the API response structure
        if (Array.isArray(responseData) && responseData.length > 0) {
          const firstItem = responseData[0]
          if (firstItem.success && firstItem.data && Array.isArray(firstItem.data)) {
            setSubCategories(firstItem.data)
            setTotalCount(firstItem.totalCount || firstItem.count || firstItem.data.length)
            setTotalPages(Math.ceil((firstItem.totalCount || firstItem.count || firstItem.data.length) / pageLimit))
          } else {
            console.error("Expected success and data array but got:", firstItem)
            setSubCategories([])
            setTotalCount(0)
            setTotalPages(1)
          }
        } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
          setSubCategories(responseData.data)
          setTotalCount(responseData.totalCount || responseData.count || responseData.data.length)
          setTotalPages(Math.ceil((responseData.totalCount || responseData.count || responseData.data.length) / pageLimit))
        } else if (Array.isArray(responseData)) {
          setSubCategories(responseData)
          setTotalCount(responseData.length)
          setTotalPages(Math.ceil(responseData.length / pageLimit))
        } else {
          console.error("Unexpected response structure:", responseData)
          setSubCategories([])
          setTotalCount(0)
          setTotalPages(1)
        }
      }
    } catch (err) {
      console.error("Failed to fetch subcategories", err)
      setSubCategories([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoadingSubCategories(false)
      setIsSearching(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchSubCategories()
  }, [currentPage, limit])

  // Handle search
  const handleSearch = () => {
    setIsSearching(true)
    setCurrentPage(1) // Reset to first page
    fetchSubCategories(1, searchQuery, statusFilter, limit)
  }

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // Handle status filter change
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value)
    setCurrentPage(1) // Reset to first page
    fetchSubCategories(1, searchQuery, value, limit)
  }

  // Handle records per page change
  const handleLimitChange = (newLimit) => {
    setLimit(parseInt(newLimit))
    setCurrentPage(1) // Reset to first page
    fetchSubCategories(1, searchQuery, statusFilter, parseInt(newLimit))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)

      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Add new subcategory via API
  const handleSaveSubCategory = async () => {
    if (!newSubCategory.name.trim() || !newSubCategory.categoryId) return

    setIsUpdating(true)

    const formData = new FormData()
    formData.append("categoryId", newSubCategory.categoryId)
    formData.append("name", newSubCategory.name)
    formData.append("status", String(newSubCategory.status))
    if (imageFile) {
      formData.append("image", imageFile)
    }

    try {
      if (isEditMode) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcategories/${editingId}`, 
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        )
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcategories`, 
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        )
      }

      // Refresh the data
      await fetchSubCategories()

      setNewSubCategory({ categoryId: "", name: "", status: true })
      setImageFile(null)
      setPreviewImage(null)
      setIsAddDialogOpen(false)
      setIsEditMode(false)
      setEditingId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  // Toggle subcategory status via API PATCH
  const toggleStatus = async (id, currentStatus) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcategories/${id}`, {
        status: !currentStatus,
      })

      // Refresh the data
      await fetchSubCategories()
    } catch (err) {
      console.error(err)
    }
  }

  // Delete subcategory via API DELETE
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcategories/${id}`)
      // Refresh the data
      await fetchSubCategories()
    } catch (err) {
      console.error(err)
    }
  }

  // Reset form function
  const resetForm = () => {
    setNewSubCategory({ categoryId: "", name: "", status: true })
    setImageFile(null)
    setPreviewImage(null)
    setIsEditMode(false)
    setEditingId(null)
    setIsAddDialogOpen(false)
  }

  if (loadingSubCategories && currentPage === 1) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sub Categories</h2>
          <p className="text-muted-foreground">Manage your product sub categories</p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Sub Category
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              Sub Category Table <span className="text-sm text-gray-500 ml-2">({totalCount})</span>
            </h3>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search by Name"
                  className="pl-10 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleSearch}
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={isSearching}
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </div>

          {/* Records per page selector */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recordsPerPageOptions.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[80px]">SL</TableHead>
                  <TableHead className="w-[150px]">Image</TableHead>
                  <TableHead>Main Category</TableHead>
                  <TableHead>Sub Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSubCategories ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : subCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No subcategories found
                    </TableCell>
                  </TableRow>
                ) : (
                  subCategories.map((subCategory, index) => (
                    <TableRow key={subCategory._id}>
                      <TableCell>{((currentPage - 1) * limit) + index + 1}</TableCell>
                      <TableCell>
                        {subCategory.image && (
                          <div className="relative h-16 w-16 border rounded-md overflow-hidden">
                            <Image
                              src={subCategory.image || "/placeholder.svg"}
                              alt={subCategory.name || "Sub category"}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{subCategory.category?.name || "N/A"}</TableCell>
                      <TableCell>{subCategory.name || "N/A"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={subCategory.status}
                          onCheckedChange={() => toggleStatus(subCategory._id, subCategory.status)}
                          className="data-[state=checked]:bg-teal-500"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-blue-500 text-blue-500"
                            onClick={() => {
                              setNewSubCategory({
                                categoryId: subCategory.category?._id || "",
                                name: subCategory.name || "",
                                status: subCategory.status || true,
                              })
                              setPreviewImage(subCategory.image || null)
                              setEditingId(subCategory._id)
                              setIsEditMode(true)
                              setIsAddDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-red-500 text-red-500"
                            onClick={() => handleDelete(subCategory._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loadingSubCategories}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className={currentPage === pageNum ? "bg-teal-600 hover:bg-teal-700" : ""}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loadingSubCategories}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loadingSubCategories}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit" : "Add New"} Sub Category</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update" : "Create"} a sub category for your products.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Main Category</Label>
              <Select
                value={newSubCategory.categoryId}
                onValueChange={(value) => setNewSubCategory({ ...newSubCategory, categoryId: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(categories) && categories
                    .filter(category => {
                      // Filter out categories without valid IDs and ensure ID is not empty string
                      const categoryId = category?._id || category?.id;
                      return category && categoryId && categoryId.trim() !== '';
                    })
                    .map((category) => {
                      const categoryId = category._id || category.id;
                      return (
                        <SelectItem key={categoryId} value={categoryId}>
                          {category.name || 'Unnamed Category'}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Sub Category Name</Label>
              <Input
                id="name"
                value={newSubCategory.name}
                onChange={(e) => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                placeholder="e.g. Women's Care"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Sub Category Image</Label>
              <div className="flex items-center gap-4">
                <Input 
                  id="image" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="flex-1" 
                />
                {previewImage && (
                  <div className="relative h-16 w-16">
                    <Image
                      src={previewImage}
                      alt="Preview"
                      fill
                      className="rounded-md object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-background"
                      onClick={() => {
                        setPreviewImage(null)
                        setImageFile(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newSubCategory.status}
                  onCheckedChange={(checked) => setNewSubCategory({ ...newSubCategory, status: checked })}
                  className="data-[state=checked]:bg-teal-500"
                />
                <Label>{newSubCategory.status ? "Active" : "Inactive"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={isUpdating}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSubCategory} 
              className="bg-teal-600 hover:bg-teal-700"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {isEditMode ? "Updating..." : "Adding..."}
                </div>
              ) : (
                isEditMode ? "Update Sub Category" : "Add Sub Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}