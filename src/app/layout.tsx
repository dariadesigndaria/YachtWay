import type { Metadata } from 'next';
import { Figtree, Poppins, Red_Hat_Display } from 'next/font/google';

import './globals.css';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-poppins',
});
const redHatDisplay = Red_Hat_Display({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-red-hat-display',
});

export const metadata: Metadata = {
  title: 'Upload Photos',
  description: 'Figma implementation with Yachtway design system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function (m, a, z, e) {
  var s, t, u, v;
  try {
    t = m.sessionStorage.getItem('maze-us');
  } catch (err) {}

  if (!t) {
    t = new Date().getTime();
    try {
      m.sessionStorage.setItem('maze-us', t);
    } catch (err) {}
  }

  u = document.currentScript || (function () {
    var w = document.getElementsByTagName('script');
    return w[w.length - 1];
  })();
  v = u && u.nonce;

  s = a.createElement('script');
  s.src = z + '?apiKey=' + e;
  s.async = true;
  if (v) s.setAttribute('nonce', v);
  a.getElementsByTagName('head')[0].appendChild(s);
  m.mazeUniversalSnippetApiKey = e;
})(window, document, 'https://snippet.maze.co/maze-universal-loader.js', '825db70f-46ee-4312-8128-cc061a22b3aa');`,
          }}
        />
      </head>
      <body
        className={`${figtree.variable} ${poppins.variable} ${redHatDisplay.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
