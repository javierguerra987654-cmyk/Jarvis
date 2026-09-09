import type { Metadata } from "next";
import "./globals.css";
import VoiceController from "./voice-controller";

export const metadata: Metadata = {
  title: "J.A.R.V.I.S. — Core Intelligence",
  description: "Private AI operating system powered by OpenAI and Vercel.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <VoiceController />
      </body>
    </html>
  );
}
