import type { Metadata } from 'next';
import './globals.css'; // <-- THIS IS THE MISSING MAGIC LINE!

export const metadata: Metadata = {
  title: 'Spendly',
  description: 'Your local-first money tracker',
  manifest: '/manifest.json', 
  appleWebApp: {
    capable: true,
    title: 'Spendly',
    statusBarStyle: 'black-translucent', 
  },
  icons: {
    apple: '/apple-icon.png', 
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#070D08] text-white selection:bg-[#82F87A]/30">
        {children}
      </body>
    </html>
  );
}