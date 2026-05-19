import './globals.css';

export const metadata = {
  title: 'Wine Tracker - Seu registro de vinhos',
  description: 'Fotografe vinhos e descubra quais você já provou',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
