"use client"

import React, { useState, useEffect } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'react-toastify';

type Category = {
  _id: string
  name: string
  image: string
  status: boolean
}

type PaginationData = {
  current: number
  total: number
  count: number
  totalRecords: number
}

// Custom hook for debouncing search input
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current: 1,
    total: 0,
    count: 0,
    totalRecords: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: "", status: true })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  // Separate search states for better UX
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchInput, 500) // 500ms debounce
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)

  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)

  // Update search query when debounced input changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery.trim());
    setCurrentPage(1); // Reset to first page when search changes
  }, [debouncedSearchQuery]);

  // Fetch categories from backend on component mount and when dependencies change
  useEffect(() => {
    setIsMounted(true)
    fetchCategories()
  }, [currentPage, recordsPerPage, searchQuery])

  async function fetchCategories() {
    try {
      setIsLoading(true);
      const params: any = {
        page: currentPage,
        limit: recordsPerPage,
      };
      
      // Only add search param if there's actually a search query
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`, { 
        params,
        timeout: 10000 // 10 second timeout
      });
      
      if (res.data.success) {
        setCategories(res.data.data || []);
        setPagination(res.data.pagination);
      } else {
        // Fallback for old API response format
        setCategories(res.data || []);
        toast.warn("Using fallback data format");
      }
    } catch (error: any) {
      console.error("Failed to fetch categories", error);
      
      // More specific error handling
      if (error.code === 'ECONNABORTED') {
        toast.error("Request timeout. Please try again.");
      } else if (error.response?.status === 404) {
        toast.error("Categories endpoint not found");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("Failed to fetch categories");
      }
      
      // Set empty state on error
      setCategories([]);
      setPagination({
        current: 1,
        total: 0,
        count: 0,
        totalRecords: 0
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Manual search handler for search button
  const handleSearch = () => {
    if (searchInput.trim() !== searchQuery) {
      setSearchQuery(searchInput.trim());
      setCurrentPage(1);
    }
  }

  // Clear search function
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing records per page
  }

  const handleAddCategory = async () => {
    if (newCategory.name.trim() === "") {
      toast.error("Please enter a category name")
      return
    }

    if (!imageFile) {
      toast.error("Please select an image")
      return
    }

    const formData = new FormData()
    formData.append("name", newCategory.name.trim())
    formData.append("status", String(newCategory.status))
    formData.append("image", imageFile)

    try {
      setIsAddingCategory(true)
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000 // 30 second timeout for file upload
      })

      // Reset form
      setNewCategory({ name: "", status: true })
      setImageFile(null)
      setPreviewImage(null)
      setIsAddDialogOpen(false)
      
      // Refresh categories list
      fetchCategories()
      
      toast.success('Category added successfully')
    } catch (error: any) {
      console.error("Error adding category", error)
      if (error.code === 'ECONNABORTED') {
        toast.error("Upload timeout. Please try again with a smaller image.")
      } else {
        toast.error("Error adding category. Please try again.")
      }
    } finally {
      setIsAddingCategory(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB")
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file")
        return
      }

      setImageFile(file)

      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string)
      }
      reader.onerror = () => {
        toast.error("Error reading image file")
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleStatus = async (id: string) => {
    const category = categories.find((cat) => cat._id === id)
    if (!category) return

    const updatedStatus = !category.status

    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories/${id}`, {
        status: updatedStatus,
      })

      // Update local state immediately for better UX
      setCategories(prev => prev.map(cat => 
        cat._id === id ? { ...cat, status: updatedStatus } : cat
      ))
      
      toast.success(`Category ${updatedStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      console.error("Failed to update status", error)
      toast.error("Failed to update status")
    }
  }

  const handleEditClick = (category: Category) => {
    setEditCategory({ ...category }) // Create a copy
    setPreviewImage(category.image)
    setImageFile(null) // Reset image file
    setIsEditDialogOpen(true)
  }

  const handleUpdateCategory = async () => {
    if (!editCategory || !editCategory.name.trim()) {
      toast.error("Please enter a category name")
      return
    }

    const formData = new FormData()
    formData.append("name", editCategory.name.trim())
    formData.append("status", String(editCategory.status))
    if (imageFile) {
      formData.append("image", imageFile)
    }

    try {
      setIsUpdatingCategory(true)
      await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories/${editCategory._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000
      })

      setEditCategory(null)
      setPreviewImage(null)
      setImageFile(null)
      setIsEditDialogOpen(false)
      
      // Refresh categories list
      fetchCategories()
      
      toast.success("Category updated successfully!")
    } catch (error: any) {
      console.error("Failed to update category", error)
      if (error.code === 'ECONNABORTED') {
        toast.error("Upload timeout. Please try again with a smaller image.")
      } else {
        toast.error("Update failed. Please try again.")
      }
    } finally {
      setIsUpdatingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(cat => cat._id === id)
    const categoryName = category?.name || 'this category'
    
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) return

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories/${id}`)
      
      // Update local state immediately
      setCategories(prev => prev.filter(cat => cat._id !== id))
      
      // Update pagination if needed
      const newTotalRecords = pagination.totalRecords - 1
      const newTotalPages = Math.ceil(newTotalRecords / recordsPerPage)
      
      // If current page becomes empty, go to previous page
      if (categories.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      } else {
        fetchCategories() // Refresh to get accurate data
      }
      
      toast.success("Category deleted successfully!")
    } catch (error) {
      console.error("Failed to delete category", error)
      toast.error("Delete failed. Please try again.")
    }
  }

  const resetAddForm = () => {
    setNewCategory({ name: "", status: true })
    setImageFile(null)
    setPreviewImage(null)
    setIsAddDialogOpen(false)
  }

  const resetEditForm = () => {
    setEditCategory(null)
    setPreviewImage(null)
    setImageFile(null)
    setIsEditDialogOpen(false)
  }

  const renderPaginationButtons = () => {
    const buttons = []
    const totalPages = pagination.total
    const current = pagination.current

    if (totalPages <= 1) return buttons

    // Previous button
    buttons.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(current - 1)}
        disabled={current === 1}
        className="flex items-center gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
    )

    // Page numbers
    const getPageNumbers = () => {
      const pages = []
      const maxVisible = 5
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (current <= 3) {
          pages.push(1, 2, 3, 4, '...', totalPages)
        } else if (current >= totalPages - 2) {
          pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
        } else {
          pages.push(1, '...', current - 1, current, current + 1, '...', totalPages)
        }
      }
      
      return pages
    }

    getPageNumbers().forEach((page, index) => {
      if (page === '...') {
        buttons.push(
          <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
            ...
          </span>
        )
      } else {
        buttons.push(
          <Button
            key={page}
            variant={current === page ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page as number)}
            className={current === page ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            {page}
          </Button>
        )
      }
    })

    // Next button
    buttons.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(current + 1)}
        disabled={current === totalPages}
        className="flex items-center gap-2"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    )

    return buttons
  }

  if (isLoading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">Manage your product categories</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-semibold">
                Category Table 
                <span className="text-sm text-gray-500 ml-2">
                  ({pagination.totalRecords} {pagination.totalRecords === 1 ? 'entry' : 'entries'})
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="records-select" className="text-sm font-medium whitespace-nowrap">
                  Show
                </Label>
                <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
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
                <Label className="text-sm font-medium whitespace-nowrap">
                  entries
                </Label>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search by Name"
                  className="pl-10 w-[300px]"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button onClick={handleSearch} className="bg-teal-600 hover:bg-teal-700 text-white">
                Search
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Search className="h-12 w-12 text-gray-300" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">No categories found</h3>
                    <p className="text-gray-500">
                      {searchQuery ? `No categories match "${searchQuery}"` : "Get started by adding your first category"}
                    </p>
                  </div>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      onClick={handleClearSearch}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[80px]">SL</TableHead>
                    <TableHead className="w-[150px]">Category Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category, index) => (
                    <TableRow key={category._id}>
                      <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <div className="relative h-16 w-16 border rounded-md overflow-hidden">
                          <Image
                            src={category.image || '/placeholder-image.jpg'}
                            alt={category.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.jpg';
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <Switch
                          checked={category.status}
                          onCheckedChange={() => toggleStatus(category._id)}
                          className="data-[state=checked]:bg-teal-500"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-blue-500 text-blue-500 hover:bg-blue-50"
                            onClick={() => handleEditClick(category)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-red-500 text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteCategory(category._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination Controls */}
          {categories.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * recordsPerPage + 1} to {Math.min(currentPage * recordsPerPage, pagination.totalRecords)} of {pagination.totalRecords} entries
                {searchQuery && (
                  <span className="ml-2 text-gray-500">
                    (filtered from {pagination.totalRecords} total entries)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {renderPaginationButtons()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new product category with name and image.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g. Electronics"
                disabled={isAddingCategory}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Category Image</Label>
              <div className="flex items-center gap-4">
                <Input 
                  id="image" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="flex-1" 
                  disabled={isAddingCategory}
                />
                {isMounted && previewImage && (
                  <div className="relative h-16 w-16">
                    <Image
                      src={previewImage || "/placeholder.svg"}
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
                      disabled={isAddingCategory}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newCategory.status}
                  onCheckedChange={(checked) => setNewCategory({ ...newCategory, status: checked })}
                  className="data-[state=checked]:bg-teal-500"
                  disabled={isAddingCategory}
                />
                <Label>{newCategory.status ? "Active" : "Inactive"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={resetAddForm}
              disabled={isAddingCategory}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddCategory} 
              className="bg-teal-600 hover:bg-teal-700"
              disabled={isAddingCategory}
            >
              {isAddingCategory ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Adding...
                </>
              ) : (
                "Add Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Category Name</Label>
              <Input
                id="editName"
                value={editCategory?.name || ""}
                onChange={(e) =>
                  setEditCategory((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
                }
                disabled={isUpdatingCategory}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editImage">Category Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="editImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                  disabled={isUpdatingCategory}
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
                        setPreviewImage(editCategory?.image || null)
                        setImageFile(null)
                      }}
                      disabled={isUpdatingCategory}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">Leave empty to keep current image. Maximum file size: 5MB.</p>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editCategory?.status || false}
                  onCheckedChange={(checked) =>
                    setEditCategory((prev) =>
                      prev ? { ...prev, status: checked } : prev
                    )
                  }
                  className="data-[state=checked]:bg-teal-500"
                  disabled={isUpdatingCategory}
                />
                <Label>{editCategory?.status ? "Active" : "Inactive"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={resetEditForm}
              disabled={isUpdatingCategory}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCategory} 
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isUpdatingCategory}
            >
              {isUpdatingCategory ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Updating...
                </>
              ) : (
                "Update Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}