import type { Metadata } from "next";
import { LocaleProvider } from "@/components/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClimaVex | Climate Risk Intelligence",
  description:
    "AI-ready climate risk intelligence dashboard for agricultural finance institutions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
