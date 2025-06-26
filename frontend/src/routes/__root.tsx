import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { WalletContextProvider } from '../contexts/WalletContext'
// import { WalletDebug } from '../components/WalletDebug'

export const Route = createRootRoute({
  component: () => (
    <WalletContextProvider>
      <Header />
      <Outlet />
      <TanStackRouterDevtools />
      <Footer />
      {/* <WalletDebug /> */}
    </WalletContextProvider>
  ),
})