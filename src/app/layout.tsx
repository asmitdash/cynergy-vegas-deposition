import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vegas: The Deposition — Multi-Agent Memory Consistency",
  description: "Four AI witnesses. One shared knowledge graph. Contradictions surface visually. Retractions dissolve on click. Powered by Cognee and Bedrock Opus 4.7.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
