import './globals.css';

export const metadata = {
  title: 'Wine Tracker - Seu registro de vinhos',
  description: 'Fotografe vinhos e descubra quais você já provou',
  appleWebApp: { capable: true, statusBarStyle: 'default' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#5C1A28',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
