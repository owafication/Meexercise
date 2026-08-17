import type { Metadata } from "next";
import Link from "next/link";

import { PrimaryNav } from "@/components/primary-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MeExercise",
    template: "%s · MeExercise",
  },
  description:
    "Self-directed general-wellness exercise and mobility planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>

        <header className="site-header">
          <div className="shell header-inner">
            <Link className="brand" href="/" aria-label="MeExercise home">
              <span className="brand-mark" aria-hidden="true">
                M
              </span>
              <span>MeExercise</span>
            </Link>

            <PrimaryNav />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="shell main-content">
          {children}
        </main>

        <footer className="site-footer">
          <div className="shell footer-inner">
            <p>MeExercise supports self-directed general wellness.</p>
            <p>It does not diagnose, treat, or rehabilitate medical conditions.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
