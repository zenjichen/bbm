import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
    title: "BBM Music — Personal Music Stream",
    description: "Stream your personal music collection from Telegram",
    icons: {
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎵</text></svg>',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi">
            <body>
                {/* Background mesh gradient */}
                <div className="bg-mesh" aria-hidden="true" />

                <div className="app-layout">
                    {/* Navbar */}
                    <nav className="navbar">
                        <div className="app-container">
                            <div className="navbar-inner">
                                <a href="/" className="logo">
                                    <div className="logo-icon">🎵</div>
                                    <span className="logo-text">BBM Music</span>
                                </a>
                                <div className="nav-links">
                                    <a href="/" className="nav-link active">Library</a>
                                </div>
                            </div>
                        </div>
                    </nav>

                    {/* Main Content */}
                    <main className="main-content">
                        <div className="app-container">
                            <Providers>
                                {children}
                            </Providers>
                        </div>
                    </main>
                </div>
            </body>
        </html>
    );
}
