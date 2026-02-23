import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Link from "next/link";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
    title: "zenjichen music box",
    description: "Stream your personal music collection from Google Drive",
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
        <img
            src={`${basePath}/icon.jpg`}
            alt="zenjichen music box"
            className="logo-img"
        />
        <div className="logo-sparkle"></div>
    </div>
);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="vi">
            <head>
                {/* Favicon với đúng basePath — tránh lỗi path trên GitHub Pages /bbm */}
                <link rel="icon" href={`${basePath}/icon.jpg`} type="image/jpeg" />
                <link rel="shortcut icon" href={`${basePath}/icon.jpg`} type="image/jpeg" />
                <link rel="apple-touch-icon" href={`${basePath}/icon.jpg`} />
            </head>
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
                                    <span className="logo-text">zenjichen music box</span>
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
