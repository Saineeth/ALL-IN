import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from '../hooks/useGame';

export const metadata: Metadata = {
  title: "ALL IN — The Ultimate Number 11 Card Game",
  description: "A multiplayer betting card game where players compete to finish with a score as close to 11 as possible using strategy, chips, and community cards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
