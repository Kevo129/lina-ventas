import './globals.css';

export const metadata = { title: 'Lina Health · Ventas', description: 'Sistema de ventas de Lina Health Providers' };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
