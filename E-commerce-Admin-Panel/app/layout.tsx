// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

export const metadata: Metadata = {
  title: 'Janta Traders',
  // You can also add description, themeColor, icons, etc. here
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA Support */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ToastContainer position="top-right" autoClose={3000} />
        {children}
      </body>
    </html>
  );
}
