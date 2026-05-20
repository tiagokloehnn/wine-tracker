export default function manifest() {
  return {
    name: 'Wine Tracker',
    short_name: 'Wine Tracker',
    description: 'Fotografe vinhos e descubra quais você já provou',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0306',
    theme_color: '#5C1A28',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  };
}
