import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A-Deal — AI Agent Marketplace",
  description: "Open-source AI-agent marketplace inspired by Anthropic's Project Deal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
