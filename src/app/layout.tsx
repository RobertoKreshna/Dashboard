import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "V-PRO", template: "%s · V-PRO" },
  description: "V-PRO property listings for sale and rent.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
