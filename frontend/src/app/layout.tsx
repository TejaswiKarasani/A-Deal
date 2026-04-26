import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "A-Deal — AI Agent Marketplace",
  description: "Open-source AI-agent marketplace inspired by Anthropic's Project Deal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
