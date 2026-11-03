import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/article/logo";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://telepath.com"),
  title: { default: "Research · Telepath", template: "%s · Telepath Research" },
  description: "Intelligence that evolves. Papers and interactive explainers from the Telepath research team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <header className="site-header">
          <Link href="/research" className="brand" aria-label="Telepath Research">
            <Logo />
            Telepath
          </Link>
          <nav className="nav" aria-label="Main">
            <Link href="/research">Research</Link>
            <a href="https://telepath.com">Company</a>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <span>© {new Date().getFullYear()} Telepath</span>
          <span>Intelligence that evolves.</span>
        </footer>
      </body>
    </html>
  );
}
