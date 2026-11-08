import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CNC Tool Manager | Brother Speedio S700xd1 & Fusion 360 Sync',
  description: 'Shop floor CNC tool management, magazine slotting, and Autodesk Fusion 360 verification system.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f3f4f6] text-[#1f2937] antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
