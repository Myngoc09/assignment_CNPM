import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from './context/CartContext'; // Import CartProvider

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Brewlite Menu',
  description: 'Thực đơn tinh tuyển',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {/* Bọc children bên trong CartProvider */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}