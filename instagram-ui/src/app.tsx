// import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { AppRoutes } from '@/app-routes.tsx'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import '@solana/wallet-adapter-react-ui/styles.css'

// Endpoint Devnet de Solana
const endpoint = 'https://api.devnet.solana.com'

// Lista de wallets disponibles
const wallets = [new PhantomWalletAdapter()]

const links: { label: string; path: string }[] = [
  { label: 'Home', path: '/' },
  { label: 'Account', path: '/account' },
]

export function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppLayout links={links}>
            {/* Botón para conectar/desconectar wallet */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
              <WalletMultiButton />
            </div>

            {/* Rutas de la app */}
            <AppRoutes />
          </AppLayout>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}