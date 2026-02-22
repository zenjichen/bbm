import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Link from "next/link";

export const metadata: Metadata = {
    title: "BBM Music — Personal Music Stream",
    description: "Stream your personal music collection from Google Drive",
    icons: {
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎵</text></svg>',
    },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="vi">
            <body>
                <div className="bg-mesh" aria-hidden="true" />

                <div className="app-layout">
                    {/* Navbar */}
                    <nav className="navbar">
                        <div className="app-container">
                            <div className="navbar-inner">
                                <Link href="/" className="logo">
                                    <div className="logo-icon">🎵</div>
                                    <span className="logo-text">BBM Music</span>
                                </Link>
                            </div>
                        </div>
                    </nav>

                    {/* Main — no app-container wrapper so book-layout is full width */}
                    <main className="main-content">
                        <Providers>
                            {children}
                        </Providers>
                    </main>
                </div>
            </body>
        </html>
    );
}
