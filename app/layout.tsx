import type { Metadata } from "next";
import "../jarvis-business-os/app/globals.css";

export const metadata: Metadata = {
  title: "J.A.R.V.I.S. — Core Intelligence",
  description: "Private AI operating system powered by OpenAI and Vercel.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
