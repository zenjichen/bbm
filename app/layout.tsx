import type { Metadata, Viewport } from "next";
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

// Khoá zoom trên mobile — không cho phép kéo dãn giao diện
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

const MusicLogoIcon = () => (
    <div className="logo-icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
            <path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17C6 19.21 7.79 21 10 21C12.21 21 14 19.21 14 17V7H18V3H12Z" fill="currentColor" />
        </svg>
        <div className="logo-sparkle"></div>
    </div>
);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="vi">
            <body>
                {/* Global Background Layer for Now Playing blur */}
                <div className="global-player-bg" aria-hidden="true" />
                <div className="bg-mesh" aria-hidden="true" />

                <div className="app-layout">
                    {/* Navbar */}
                    <nav className="navbar">
                        <div className="navbar-inner">
                            <Link href="/" className="logo">
                                <MusicLogoIcon />
                                <div className="logo-text-wrapper">
                                    <span className="logo-text">BBM Music</span>
                                    <div className="logo-glimmer"></div>
                                </div>
                            </Link>
                        </div>
                    </nav>

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
