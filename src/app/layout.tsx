import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ניהול הבית המשפחתי",
  description: "אפליקציה משפחתית לניהול לו״ז, משימות, הסעות וניקוד",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
