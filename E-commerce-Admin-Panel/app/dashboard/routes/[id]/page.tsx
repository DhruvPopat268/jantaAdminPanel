"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Eye, Trash2, Plus, Search, Download } from "lucide-react"
import Link from "next/link"
import axios from 'axios'
import { toast } from "react-toastify"

interface Route {
  id: number
  name: string
  status: boolean
  createdAt: string
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([
   
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [routeName, setRouteName] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    setIsMounted(true)
     fetchRoutes();
  }, [])

const fetchRoutes = async () => {
  setIsLoading(true);
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/routes`);
    if (response.data.success) {
      setRoutes(response.data.data);
    }
  } catch (error) {
    console.error('Error fetching routes:', error);
  } finally {
    setIsLoading(false); // Always hide loader regardless of success/failure
  }
};


 const handleSubmit = async (e) => {
  e.preventDefault();
  if (routeName.trim()) {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/routes`, {
        name: routeName.trim()
      });
      
      if (response.data.success) {
        setRoutes([...routes, response.data.data]);
        setRouteName("");
        setIsDialogOpen(false);
      }
      toast.success("route added successfullt")
    } catch (error) {
      toast.error("error in adding route")
      console.error('Error creating route:', error);
      // Handle error (show toast notification, etc.)
    }
  }
};



const handleStatusToggle = async (id) => {
  try {
    const response = await axios.put(`${process.env.NEXT_PUBLIC_BASE_URL}/api/routes/${id}/status`);
    if (response.data.success) {
      setRoutes(routes.map((route) => 
        route.id === id ? response.data.data : route
      ));
    }
  } catch (error) {
    console.error('Error updating route status:', error);
  }
};

 const handleDelete = async (id) => {
  try {
    const response = await axios.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/routes/${id}`);
    if (response.data.success) {
      setRoutes(routes.filter((route) => route.id !== id));
    }
  } catch (error) {
    console.error('Error deleting route:', error);
  }
};

  const filteredRoutes = routes.filter((route) => route.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (!isMounted) {
    return null
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-semibold">🛣️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
            <p className="text-sm text-gray-500">Manage delivery routes</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Routes
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Route</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="routeName">Routes</Label>
                <Input
                  id="routeName"
                  placeholder="enter routes"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setRouteName("")
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                  Submit
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Routes List</h2>
              <Badge variant="secondary">{filteredRoutes.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by route name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" className="text-teal-600 border-teal-600 hover:bg-teal-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">SL</TableHead>
              <TableHead>Route Name</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoutes.map((route, index) => (
              <TableRow key={route.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="font-medium">{route.name}</TableCell>
                <TableCell>{route.createdAt}</TableCell>
                <TableCell>
                  <Switch checked={route.status} onCheckedChange={() => handleStatusToggle(route.id)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/dashboard/routes/${route.id}/setup`}>
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(route.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredRoutes.length === 0 && <div className="text-center py-8 text-gray-500">No routes found</div>}
      </div>
    </div>
  )
}
