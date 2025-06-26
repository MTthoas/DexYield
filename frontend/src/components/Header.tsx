import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import { Wallet } from 'lucide-react'
import { MenuIcon } from '@/icons/MenuIcon'
import { GithubIcon } from '@/icons/GithubIcon'
import { WalletButton } from './WalletButton'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-none flex h-16 items-center justify-between px-[5%] lg:px-[8%] xl:px-[12%]">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">YieldFi</span>
        </div>
        <nav className="hidden md:flex gap-6">
          <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link to="/lending" className="text-sm font-medium transition-colors hover:text-primary">
            Lending
          </Link>
          <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
            Explore
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/MTthoas/DexYield"
            className="text-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </a>
          <WalletButton />
          <Button variant="ghost" size="icon" className="md:hidden">
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}