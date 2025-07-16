"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Pencil, Plus, Search, Trash2, Check, X } from "lucide-react"
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
import { Settings } from "lucide-react"
import { toast } from 'react-toastify';


type Attribute = {
  _id: string
  name: string
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newAttribute, setNewAttribute] = useState({ name: "" })
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
 


  // For editing
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  useEffect(() => {
    fetchAttributes()
  }, [])

  const fetchAttributes = async (retries = 5, delay = 1000) => {
  setLoading(true)
  setError("")
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/attributes`)
    if (response.status === 200) {
      setAttributes(response.data)
      setLoading(false)
    } else {
      throw new Error("Non-200 status")
    }
  } catch (err: any) {
    console.error("Failed to fetch attributes:", err)
    if (retries > 0) {
      setTimeout(() => fetchAttributes(retries - 1, delay * 2), delay)
    } else {
      setError(err.message || "Failed to fetch attributes after retries")
      setLoading(false)
    }
  }
}


  const filteredAttributes = attributes.filter((attribute) =>
    attribute.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddAttribute = async () => {
    if (newAttribute.name.trim() === "") return
    setLoading(true)
    setError("")
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/attributes`, newAttribute)
      setAttributes((prev) => [...prev, response.data])
      setNewAttribute({ name: "" })
      setIsAddDialogOpen(false)
      toast.success('attribute added successfully')
    } catch (err: any) {
      setError(err.message || "Failed to add attribute")
      toast.error('Failed to add attribute')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (attribute: Attribute) => {
    setEditId(attribute._id)
    setEditName(attribute.name)
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditName("")
  }

  const saveEdit = async (id: string) => {
    if (editName.trim() === "") return
    setLoading(true)
    setError("")
    try {
      const response = await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}/api/attributes/${id}`, { name: editName })
      setAttributes((prev) =>
        prev.map((attr) => (attr._id === id ? response.data : attr)),
      )
      setEditId(null)
      setEditName("")
    } catch (err: any) {
      setError(err.message || "Failed to update attribute")
    } finally {
      setLoading(false)
    }
  }

  const deleteAttribute = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attribute?")) return
    setLoading(true)
    setError("")
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/attributes/${id}`)
      setAttributes((prev) => prev.filter((attr) => attr._id !== id))
    } catch (err: any) {
      setError(err.message || "Failed to delete attribute")
    } finally {
      setLoading(false)
    }
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
      <div className="flex items-center">
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <span className="bg-yellow-400 p-2 rounded-full">
              <Settings className="h-6 w-6 text-white" />
            </span>
            Attribute Setup
          </h2>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              Attribute Table <span className="text-sm text-gray-500 ml-2">{attributes.length}</span>
            </h3>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search"
                  className="pl-10 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={loading}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Attribute
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[100px]">SL</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttributes.map((attribute, index) => (
                  <TableRow key={attribute._id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {editId === attribute._id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={loading}
                        />
                      ) : (
                        attribute.name
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editId === attribute._id ? (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-green-500 text-green-500"
                              onClick={() => saveEdit(attribute._id)}
                              disabled={loading}
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Save</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-gray-500 text-gray-500"
                              onClick={cancelEdit}
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Cancel</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-blue-500 text-blue-500"
                              onClick={() => startEdit(attribute)}
                              disabled={loading}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-red-500 text-red-500"
                              onClick={() => deleteAttribute(attribute._id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Attribute</DialogTitle>
            <DialogDescription>Create a new attribute for inventory items.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Attribute Name</Label>
              <Input
                id="name"
                value={newAttribute.name}
                onChange={(e) => setNewAttribute({ name: e.target.value })}
                placeholder="e.g. BOX"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAddAttribute} className="bg-teal-600 hover:bg-teal-700" disabled={loading}>
              Add Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
