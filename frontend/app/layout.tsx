import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/web3-provider";
import { MainLayout } from "@/components/layout/main-layout";
import { MiniAppProvider } from "@/components/miniapp/miniapp-provider";
import { MiniAppMetadata } from "@/components/miniapp/miniapp-metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creator DAO Platform",
  description:
    "The new way to create, scale and engage creator communities with NFTs, DAOs and automated Discord",
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
        <MiniAppMetadata />
        <Web3Provider>
          <MiniAppProvider>
            <MainLayout>{children}</MainLayout>
          </MiniAppProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
