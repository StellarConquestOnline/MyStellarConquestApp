
'use client';

import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// No metadata object here as this is a client component;
// metadata should be in page.tsx or a server layout component if used.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* For App Router with client RootLayout, static title/meta can be here */}
        {/* Dynamic title/meta best handled by Metadata object in page.tsx or server layout.tsx */}
        <title>Stellar Conquest</title>
        <meta name="description" content="A game of interstellar strategy and conquest." />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider defaultOpen={true}>
          {children}
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
