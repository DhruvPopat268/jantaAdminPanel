// components/AuthWrapper.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthWrapper({ children, requireAuth = false }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('adminToken');
      
      if (requireAuth && !token) {
        // Redirect to login with return URL
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    // Add a small delay to ensure localStorage is available
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router, pathname, requireAuth]);

  if (requireAuth && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}