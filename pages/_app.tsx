import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { EchoProvider } from '@merit-systems/echo-react-sdk'

export default function App({ Component, pageProps }: AppProps) {
  const echoConfig = {
    apiUrl: process.env.NEXT_PUBLIC_ECHO_API_URL || 'https://echo.merit.systems/api',
    appId: process.env.NEXT_PUBLIC_ECHO_APP_ID || '',
  };

  return (
    <EchoProvider config={echoConfig}>
      <Component {...pageProps} />
    </EchoProvider>
  )
}
