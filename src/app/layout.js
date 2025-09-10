"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar, Sidebar } from "@/components/molecules";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  console.log(pathname);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setOpenSidebar(false);
      } else {
        setOpenSidebar(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex justify-end`}
      >
        {pathname !== "/login" && (
          <>
            <NavBar openSidebar={openSidebar} setOpenSidebar={setOpenSidebar} />
            <Sidebar
              openSidebar={openSidebar}
              setOpenSidebar={setOpenSidebar}
            />
          </>
        )}
        <main
          className={`transition-all duration-500 right-0 ${
            pathname !== "/login"
              ? openSidebar
                ? "xl:w-[80%] w-full ml-auto mt-20"
                : "w-full ml-0 mt-20"
              : "w-full"
          }`}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
