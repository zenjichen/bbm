import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "My Music Stream",
    description: "Personal Telegram Music Streamer",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className + " bg-zinc-950 text-zinc-100 min-h-screen"}>
                <div className="container mx-auto px-4 py-8">
                    <header className="mb-8 flex justify-between items-center">
                        <a href="/" className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Streamify
                        </a>
                        <nav className="flex gap-4">
                            <a href="/" className="hover:text-cyan-400 transition-colors">Library</a>
                            <a href="/" className="hover:text-cyan-400 transition-colors">Search</a>
                        </nav>
                    </header>
                    <Providers>
                        {children}
                    </Providers>
                    <div className="h-24"></div> {/* Spacer for player */}
                </div>
            </body>
        </html>
    );
}
