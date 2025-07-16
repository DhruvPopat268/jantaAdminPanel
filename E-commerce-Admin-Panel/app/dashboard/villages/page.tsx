"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import axios from "axios"
import { toast } from "react-toastify"


interface Village {
  id: string
  name: string
  status: boolean
  createdAt: string
}



export default function VillagePage() {
  const [villages, setVillages] = useState<Village[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [newVillage, setNewVillage] = useState("")
  const [editingVillage, setEditingVillage] = useState<Village | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [filteredVillages, setFilteredVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Fetch villages from API
  const fetchVillages = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/villages`)
      const result = response.data

      if (result.success) {
        setVillages(result.data)
        setError("")
      } else {
        setError(result.message || "Failed to fetch villages")
      }
    } catch (error) {
      console.error("Error fetching villages:", error)
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchVillages()
  }, [])

  useEffect(() => {
    setFilteredVillages(villages.filter((village) => village.name.toLowerCase().includes(searchTerm.toLowerCase())))
  }, [searchTerm, villages])

  const handleAddVillage = async () => {
    if (newVillage.trim() === "") return

    try {
      setLoading(true)
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/villages`, {
        name: newVillage.trim(),
      })

      const result = response.data

      if (result.success) {
        setVillages([result.data, ...villages])
        setNewVillage("")
        setIsAddDialogOpen(false)
        setError("")
        toast.success('village added successfully')
      } else {
        setError(result.message || "Failed to add village")
      }
    } catch (error) {
      toast.error("Error adding village:")
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }


const handleEditVillage = async () => {
  if (!editingVillage || editingVillage.name.trim() === "") return

  try {
    setLoading(true)
    
    // Extract English name from the display name (remove Gujarati part if present)
    const englishName = editingVillage.name.split('(')[0].trim()
    
    const response = await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}/api/villages/${editingVillage.id}`, {
      name: englishName, // Send only the English name
      status: editingVillage.status,
    })

    const result = response.data

    if (result.success) {
      setVillages(villages.map(village =>
        village.id === editingVillage.id ? result.data : village
      ))
      setEditingVillage(null)
      setIsEditDialogOpen(false)
      setError("")
    } else {
      setError(result.message || "Failed to update village")
    }
  } catch (error) {
    console.error("Error updating village:", error)
    
    // Enhanced error handling to show specific error messages
    if (error.response?.data?.message) {
      setError(error.response.data.message)
    } else {
      setError("Failed to connect to server")
    }
  } finally {
    setLoading(false)
  }
}


  const handleToggleStatus = async (id: string) => {
    const village = villages.find(v => v.id === id)
    if (!village) return

    try {
      const response = await axios.patch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/villages/${id}/status`, {
        status: !village.status,
      })

      const result = response.data

      if (result.success) {
        setVillages(villages.map(v =>
          v.id === id ? { ...v, status: !v.status } : v
        ))
        setError("")
      } else {
        setError(result.message || "Failed to update status")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      setError("Failed to connect to server")
    }
  }


  const handleDeleteVillage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this village?")) return

    try {
      setLoading(true)
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/villages/${id}`)
      const result = response.data

      if (result.success) {
        setVillages(villages.filter(village => village.id !== id))
        setError("")
      } else {
        setError(result.message || "Failed to delete village")
      }
    } catch (error) {
      console.error("Error deleting village:", error)
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }


  const openEditDialog = (village: Village) => {
    setEditingVillage({ ...village })
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Villages</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add Village
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Village</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="village">Village</Label>
                <Input
                  id="village"
                  placeholder="Enter village name"
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddVillage()}
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setNewVillage("")
                    setError("")
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddVillage} disabled={loading}>
                  {loading ? "Adding..." : "Submit"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Village</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-village">Village Name</Label>
              <Input
                id="edit-village"
                placeholder="Enter village name"
                value={editingVillage?.name || ""}
                onChange={(e) => setEditingVillage(prev =>
                  prev ? { ...prev, name: e.target.value } : null
                )}
                onKeyPress={(e) => e.key === 'Enter' && handleEditVillage()}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setEditingVillage(null)
                  setError("")
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleEditVillage} disabled={loading}>
                {loading ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search villages..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">SL</TableHead>
              <TableHead>Village Name</TableHead>
              {/* <TableHead>Village Code</TableHead> */}
              <TableHead>Created Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading villages...
                </TableCell>
              </TableRow>
            ) : filteredVillages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No villages found
                </TableCell>
              </TableRow>
            ) : (
              filteredVillages.map((village, index) => (
                <TableRow key={village.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{village.name}</TableCell>
                  {/* <TableCell>{village.villageCode}</TableCell> */}

                  <TableCell>{village.createdAt}</TableCell>

                  <TableCell>
                    <Switch
                      checked={village.status}
                      onCheckedChange={() => handleToggleStatus(village.id)}
                      disabled={loading}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(village)}
                        disabled={loading}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteVillage(village.id)}
                        disabled={loading}
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
    </div>
  )
}