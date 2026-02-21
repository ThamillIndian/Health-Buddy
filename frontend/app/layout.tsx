import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronic Health Buddy",
  description: "Your multilingual daily health companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
