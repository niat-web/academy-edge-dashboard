import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Only initialize background worker if not on Vercel
// On Vercel, we use Vercel Cron Jobs instead
if (typeof window === 'undefined' && !process.env.VERCEL) {
  // Dynamic import to avoid loading on Vercel
  import('@/lib/init-worker').catch((err) => {
    console.warn('Failed to load background worker:', err);
  });
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Academy Edge Dashboard",
  description: "Student assessment and interview management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
