import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroSense — Cold Chain Monitoring",
  description:
    "Real-time perishable cold-chain monitoring: ingest telemetry, compute shelf life, publish dynamic discounts before produce spoils.",
  icons: { icon: "/favicon.ico" },
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
