import { Providers } from "./providers"
import "./globals.css"

export const metadata = {
  title: "Análisis de Crédito",
  description: "Panel con roles y autenticación",
}

/**
 * Blocking script: apply theme class before paint to avoid flash.
 * Priority: localStorage → system preference → dark.
 */
const themeInitScript = `(function(){try{var k='gn-theme';var s=localStorage.getItem(k);var t=s;if(!t||t==='system'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t==='light'?'light':'dark');r.style.colorScheme=t==='light'?'light':'dark';}catch(e){document.documentElement.classList.add('dark');}})();`

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
