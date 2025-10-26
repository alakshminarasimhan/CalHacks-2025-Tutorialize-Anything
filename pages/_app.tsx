import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '@/lib/AuthContext'

import { Rajdhani, Share_Tech_Mono } from 'next/font/google'

const rajdhani = Rajdhani({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
})
const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-share-tech',
})


export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <div className={`${rajdhani.variable} ${shareTechMono.variable} bg-black text-white antialiased`}>
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  )
}
