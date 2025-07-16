"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingBag, Users } from "lucide-react"
import Link from 'next/link';


export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalProducts: 0,
    totalCustomers: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        categoriesRes,
        productsRes,
        customersRes,
        pendingOrdersRes,
        cancelledOrdersRes
      ] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`),
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products`),
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/salesAgents`),
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/pending`),
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/cancelled`)
      ]);

      const [
        categoriesData,
        productsData,
        customersData,
        pendingOrdersData,
        cancelledOrdersData
      ] = await Promise.all([
        categoriesRes.json(),
        productsRes.json(),
        customersRes.json(),
        pendingOrdersRes.json(),
        cancelledOrdersRes.json()
      ]);

      console.log(categoriesData)

      // Update stats
      setStats({
        totalCategories: categoriesData.pagination?.totalRecords || 0,
        totalProducts: productsData?.pagination?.totalRecords || 0,
        totalCustomers: customersData?.pagination?.totalRecords || 0
      });

      // Set recent categories from pending orders (as requested)
      setRecentOrders(pendingOrdersData?.pendingOrders?.slice(0, 4) || []);

      // Set cancelled orders for recent items
      setCancelledOrders(cancelledOrdersData?.cancelledOrders?.slice(0, 4) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return 'Added 1 day ago';
      if (diffDays <= 7) return `Added ${diffDays} days ago`;
      if (diffDays <= 30) return `Added ${Math.ceil(diffDays / 7)} weeks ago`;
      return `Added ${Math.ceil(diffDays / 30)} months ago`;
    } catch {
      return 'Added recently';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your inventory management system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalCategories}
            </div>
            <p className="text-xs text-muted-foreground">Categories in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground">Products in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground">Registered customers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
    <Link
      href="/dashboard/orders/pending"
      className="text-sm font-medium text-blue-600 hover:underline"
    >
      View All Orders
    </Link>
  </div>
  <CardDescription>Recent pending orders</CardDescription>
</CardHeader>


          <CardContent>
            <div className="space-y-4">
              {loading ? (
                // Loading skeleton
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-lg bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order, index) => (
                  <div key={order._id || order.id || index} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Order #{order._id?.slice(-8) || order.id?.slice(-8) || `${index + 1}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.itemCount || 0} items • {formatDate(order.orderDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.salesAgentName} • {order.villageName} • {order.mobileNumber}
                      </p>

                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent orders</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="text-lg font-semibold">Recent Cancelled Orders</CardTitle>
    <Link
      href="/dashboard/orders/cancel"
      className="text-sm font-medium text-blue-600 hover:underline"
    >
      View All Orders
    </Link>
  </div>
  <CardDescription>Recently cancelled orders</CardDescription>
</CardHeader>


          <CardContent>
            <div className="space-y-4">
              {loading ? (
                // Loading skeleton
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-lg bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))
              ) : cancelledOrders.length > 0 ? (
                cancelledOrders.map((order, index) => (
                  <div key={order._id || order.id || index} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        Order #{order._id?.slice(-8) || order.id?.slice(-8) || `${index + 1}`}
                      </p>
                     <p className="text-sm text-muted-foreground">
  Cancelled • {formatDate(order.orderDate)}
</p>
<p className="text-xs text-muted-foreground">
  {order.salesAgentName} • {order.villageName} • {order.mobileNumber}
</p>

                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md">
                        {order.itemCount || 0} Items
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No cancelled orders</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}