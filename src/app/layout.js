"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar, Sidebar } from "@/components/molecules";
import { useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const [openSidebar, setOpenSidebar] = useState(true);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex justify-end`}
      >
        <NavBar openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />
        <Sidebar openSidebar={openSidebar} />
        <main
          className={`transition-all duration-500 right-0 ${
            openSidebar ? "w-[80%] ml-auto mt-20" : "w-full ml-0 mt-20"
          }`}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
