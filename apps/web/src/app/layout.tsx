import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Speaking Coach",
  description: "用 AI 伙伴练习真实英语对话",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable}`}>
        <nav className="top-nav">
          <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-[var(--color-ink)]">AI Speaking Coach</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[var(--text-nav-link)] text-[var(--color-muted)]">场景</span>
              <span className="text-[var(--text-nav-link)] text-[var(--color-muted)]">练习</span>
              <span className="text-[var(--text-nav-link)] text-[var(--color-muted)]">关于</span>
            </div>
          </div>
        </nav>
        {children}
        <footer className="footer">
          <div className="max-w-6xl mx-auto text-center">
            <p>AI Speaking Coach - 用 AI 伙伴练习真实英语对话</p>
          </div>
        </footer>
      </body>
    </html>
  );
}