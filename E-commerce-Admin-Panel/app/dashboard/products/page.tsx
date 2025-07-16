"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Pencil, Trash2, Download, Package, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  // const [selectedCategory, setSelectedCategory] = useState("")
  // const [selectedSubcategory, setSelectedSubcategory] = useState("")
  // const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSubcategory, setSelectedSubcategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  // Search states for dropdowns
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [subcategoryOpen, setSubcategoryOpen] = useState(false)
  const [categorySearchQuery, setCategorySearchQuery] = useState("")
  const [subcategorySearchQuery, setSubcategorySearchQuery] = useState("")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)

  // Bulk import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState(null)
  const fileInputRef = useRef(null)

  const router = useRouter()

  // Fetch categories and subcategories once
  useEffect(() => {
    async function fetchStaticData() {
      try {
        const [categoriesRes, subcategoriesRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`),
          axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcategories`)
        ])

        if (categoriesRes.status === 200) {
          const categoryData = categoriesRes.data.data || categoriesRes.data
          setCategories(Array.isArray(categoryData) ? categoryData : [])
        }
        if (subcategoriesRes.status === 200) {
          const subcategoryData = subcategoriesRes.data[0]?.data || subcategoriesRes.data
          setSubcategories(Array.isArray(subcategoryData) ? subcategoryData : [])
        }
      } catch (error) {
        console.error("Failed to fetch categories/subcategories:", error)
        setCategories([])
        setSubcategories([])
      }
    }

    fetchStaticData()
  }, [])

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  )

  // Filter subcategories based on selected category and search query
  // const filteredSubcategories = subcategories.filter(subcategory => {
  //   const matchesSearch = subcategory.name.toLowerCase().includes(subcategorySearchQuery.toLowerCase())

  //   // If no category is selected, show all subcategories
  //   if (!selectedCategory || selectedCategory === "") {
  //     return matchesSearch
  //   }

  //   // Show only subcategories that belong to the selected category
  //   return matchesSearch && subcategory.category?._id === selectedCategory
  // })

  const filteredSubcategories = subcategories.filter(subcategory => {
    const matchesSearch = subcategory.name.toLowerCase().includes(subcategorySearchQuery.toLowerCase())

    // If no category is selected, show all subcategories
    if (!selectedCategory || selectedCategory === "all") {
      return matchesSearch
    }

    // Show only subcategories that belong to the selected category
    return matchesSearch && subcategory.category?._id === selectedCategory
  })

  // Get selected category name
  // const getSelectedCategoryName = () => {
  //   if (!selectedCategory || selectedCategory === "") return "All Categories"
  //   const category = categories.find(cat => cat._id === selectedCategory)
  //   console.log(category ? category.name : "All Categories")
  //   return category ? category.name : "All Categories"

  // }

  const getSelectedCategoryName = () => {
    if (!selectedCategory || selectedCategory === "all") return "All Categories"
    const category = categories.find(cat => cat._id === selectedCategory)
    return category ? category.name : "All Categories"
  }

  // Get selected subcategory name
  // const getSelectedSubcategoryName = () => {
  //   if (!selectedSubcategory || selectedSubcategory === "") return "All Subcategories"
  //   const subcategory = subcategories.find(sub => sub._id === selectedSubcategory)
  //   console.log(subcategory ? subcategory.name : "All Subcategories")
  //   return subcategory ? subcategory.name : "All Subcategories"
  // }

  const getSelectedSubcategoryName = () => {
    if (!selectedSubcategory || selectedSubcategory === "all") return "All Subcategories"
    const subcategory = subcategories.find(sub => sub._id === selectedSubcategory)
    return subcategory ? subcategory.name : "All Subcategories"
  }

  const fetchProducts = async (page = 1, search = "", categoryId = "", subCategoryId = "", status = "") => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (search.trim()) params.append('search', search.trim());
      if (categoryId && categoryId !== "all") params.append('categoryId', categoryId);
      if (subCategoryId && subCategoryId !== "all") params.append('subCategoryId', subCategoryId);
      if (status && status !== "all") params.append('status', status);



      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products?${params.toString()}`);

      if (response.data.success) {
        const { data, pagination } = response.data;
        setProducts(Array.isArray(data) ? data : []);
        console.log(data)
        setCurrentPage(pagination.current);
        setTotalPages(pagination.total);
        setTotalRecords(pagination.totalRecords);
        setHasNext(pagination.hasNext);
        setHasPrev(pagination.hasPrev);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        // Handle invalid ID errors
        console.error("Invalid filter parameters:", error.response.data.message);
      } else {
        console.error("Failed to fetch products:", error);
      }
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to validate ObjectId
  // function isValidObjectId(id) {
  //   return id && id !== "all" && mongoose.Types.ObjectId.isValid(id);
  // }

  // Initial load and when filters change
  useEffect(() => {
    fetchProducts(1, searchQuery, selectedCategory, selectedSubcategory, selectedStatus)
    setCurrentPage(1) // Reset to first page when filters change
  }, [selectedCategory, selectedSubcategory, selectedStatus, pageSize])

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts(1, searchQuery, selectedCategory, selectedSubcategory, selectedStatus)
      setCurrentPage(1)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchProducts(newPage, searchQuery, selectedCategory, selectedSubcategory, selectedStatus)
    }
  }

  const toggleShowInDailyNeeds = async (id) => {
    const product = products.find(p => p._id === id)
    if (!product) return

    const updatedProducts = products.map(p =>
      p._id === id ? { ...p, showInDailyNeeds: !p.showInDailyNeeds } : p
    )
    setProducts(updatedProducts)

    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}/daily-needs`, {
        showInDailyNeeds: !product.showInDailyNeeds,
      })
    } catch (error) {
      console.error("Failed to update daily needs toggle:", error)
      // Revert on error
      setProducts(products)
    }
  }

  const toggleFeatured = async (id) => {
    const product = products.find(p => p._id === id)
    if (!product) return

    const updatedProducts = products.map(p =>
      p._id === id ? { ...p, featured: !p.featured } : p
    )
    setProducts(updatedProducts)

    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}/featured`, {
        featured: !product.featured,
      })
    } catch (error) {
      console.error("Failed to update featured toggle:", error)
      setProducts(products)
    }
  }

  const toggleStatus = async (id) => {
    const product = products.find(p => p._id === id)
    if (!product) return

    const updatedProducts = products.map(p =>
      p._id === id ? { ...p, status: !p.status } : p
    )
    setProducts(updatedProducts)

    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}/status`, {
        status: !product.status,
      })
    } catch (error) {
      console.error("Failed to update status:", error)
      setProducts(products)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`)
      // Refresh current page after deletion
      fetchProducts(currentPage, searchQuery, selectedCategory, selectedSubcategory, selectedStatus)
    } catch (error) {
      console.error("Failed to delete product:", error)
    }
  }

  const handleEdit = (productId) => {
    router.push(`/dashboard/products/add?productId=${productId}`)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedSubcategory("all")
    setSelectedStatus("all")
    setCategorySearchQuery("")
    setSubcategorySearchQuery("")
  }

  // Handle category selection
  // const handleCategorySelect = (categoryId) => {
  //   setSelectedCategory(categoryId === "all" ? "" : categoryId)
  //   // Reset subcategory when category changes
  //   setSelectedSubcategory("")
  //   setSubcategorySearchQuery("")

  //   setCategoryOpen(false)
  //   setCategorySearchQuery("")
  // }

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId)
    // Reset subcategory when category changes
    setSelectedSubcategory("all")
    setSubcategorySearchQuery("")

    setCategoryOpen(false)
    setCategorySearchQuery("")
  }

  // Handle subcategory selection
  // const handleSubcategorySelect = (subcategoryId) => {
  //   setSelectedSubcategory(subcategoryId === "all" ? "" : subcategoryId)
  //   setSubcategoryOpen(false)
  //   setSubcategorySearchQuery("")
  // }

  const handleSubcategorySelect = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId)
    setSubcategoryOpen(false)
    setSubcategorySearchQuery("")
  }

  // Bulk Import Functions
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ]

      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file)
        setImportResults(null)
      } else {
        alert('Please select a valid Excel (.xlsx, .xls) or CSV file')
        event.target.value = ''
      }
    }
  }

  const handleBulkImport = async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      const formData = new FormData()
      formData.append('excelFile', selectedFile)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/bulk-import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      clearInterval(progressInterval)
      setImportProgress(100)

      if (response.data.success) {
        setImportResults(response.data.results)
        // Refresh the products list
        fetchProducts(currentPage, searchQuery, selectedCategory, selectedSubcategory, selectedStatus)
      } else {
        throw new Error(response.data.message || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResults({
        total: 0,
        successful: 0,
        failed: 1,
        errors: [error.response?.data?.message || error.message || 'Import failed']
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/download-template`,
        {
          responseType: 'blob',
        }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'product-import-template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading template:', error)
      alert('Failed to download template')
    }
  }

  const resetImportDialog = () => {
    setSelectedFile(null)
    setImportResults(null)
    setImportProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-8 w-8 text-amber-600" />
        <h2 className="text-3xl font-bold tracking-tight">
          Product List <span className="text-sm text-gray-500 ml-2">({totalRecords})</span>
        </h2>
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative">
          <Input
            placeholder="Search by name, description, or SKU"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3"
          />
        </div>

        {/* Searchable Category Dropdown */}
        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={categoryOpen}
              className="justify-between"
            >
              {getSelectedCategoryName()}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput
                placeholder="Search categories..."
                onValueChange={setCategorySearchQuery}
              />
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                <CommandItem
                  value="all"
                  onSelect={() => handleCategorySelect("all")}
                >
                  All Categories
                </CommandItem>
                {filteredCategories.map((category) => (
                  <CommandItem
                    key={category._id}
                    value={category.name}
                    onSelect={() => handleCategorySelect(category._id)}
                  >
                    {category.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Searchable Subcategory Dropdown */}
        <Popover open={subcategoryOpen} onOpenChange={setSubcategoryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={subcategoryOpen}
              className="justify-between"
            >
              {getSelectedSubcategoryName()}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput
                placeholder="Search subcategories..."
                onValueChange={setSubcategorySearchQuery}
              />
              <CommandEmpty>No subcategory found.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                <CommandItem
                  value="all"
                  onSelect={() => handleSubcategorySelect("all")}
                >
                  All Subcategories
                </CommandItem>
                {filteredSubcategories.map((subcategory) => (
                  <CommandItem
                    key={subcategory._id}
                    value={subcategory.name}
                    onSelect={() => handleSubcategorySelect(subcategory._id)}
                  >
                    {subcategory.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>


          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>

        </Select>

        <Button
          variant="outline"
          onClick={clearFilters}
          className="border-gray-300"
        >
          Clear Filters
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show:</span>
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">per page</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="border-teal-500 text-teal-500">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>

          {/* Bulk Import Dialog */}
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-blue-500 text-blue-500"
                onClick={resetImportDialog}
              >
                <Upload className="mr-2 h-4 w-4" /> Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Bulk Import Products</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Upload an Excel file (.xlsx, .xls) or CSV file to import multiple products at once.
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="w-full"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Download Sample Template
                  </Button>

                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />

                  {selectedFile && (
                    <div className="text-sm text-green-600">
                      Selected: {selectedFile.name}
                    </div>
                  )}
                </div>

                {isImporting && (
                  <div className="space-y-2">
                    <div className="text-sm">Importing products...</div>
                    <Progress value={importProgress} className="w-full" />
                  </div>
                )}

                {importResults && (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <div>Import completed!</div>
                        <div>Total: {importResults.total}</div>
                        <div className="text-green-600">Successful: {importResults.successful}</div>
                        <div className="text-red-600">Failed: {importResults.failed}</div>
                        {importResults.errors.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium">Errors:</div>
                            <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                              {importResults.errors.map((error, index) => (
                                <div key={index} className="text-red-600">{error}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkImport}
                    disabled={!selectedFile || isImporting}
                    className="flex-1"
                  >
                    {isImporting ? 'Importing...' : 'Import Products'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsImportDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button className="bg-teal-500 hover:bg-teal-600 text-white">Limited Stocks</Button>
          <Button asChild className="bg-teal-700 hover:bg-teal-800 text-white">
            <Link href="/dashboard/products/add">+ Add new product</Link>
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[60px]">SL</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Subcategory</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Discounted Price</TableHead>
              <TableHead>Show In Daily Needs</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product, index) => (
                <TableRow key={product._id}>
                  <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 border rounded-md overflow-hidden">
                        <Image
                          src={product.images?.[0] || "/placeholder.svg"}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span>{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.categoryName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {product.subcategoryName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {product.attributes?.[0]?.price ?? "N/A"}
                  </TableCell>
                  <TableCell>
                    {product.attributes?.[0]?.discountedPrice ?? "N/A"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.showInDailyNeeds}
                      onCheckedChange={() => toggleShowInDailyNeeds(product._id)}
                      className="data-[state=checked]:bg-teal-500"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.featured}
                      onCheckedChange={() => toggleFeatured(product._id)}
                      className="data-[state=checked]:bg-teal-500"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.status}
                      onCheckedChange={() => toggleStatus(product._id)}
                      className="data-[state=checked]:bg-teal-500"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-blue-500 text-blue-500"
                        onClick={() => handleEdit(product._id)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-red-500 text-red-500"
                        onClick={() => handleDelete(product._id)}
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
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} results
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {getPageNumbers().map((pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className={pageNum === currentPage ? "bg-teal-600 hover:bg-teal-700" : ""}
              >
                {pageNum}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}