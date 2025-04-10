import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import { Wallet } from 'lucide-react'
import { MenuIcon } from '@/icons/MenuIcon'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 ml-4">
          <Wallet className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">YieldFi</span>
        </div>
        <nav className="hidden md:flex gap-6">
          <Link to="/home" className="text-sm font-medium transition-colors hover:text-primary">
            Link
          </Link>
          <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
            Link
          </Link>
          <Link to="/home" className="text-sm font-medium transition-colors hover:text-primary">
            Link
          </Link>
          <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
            Link
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="hidden md:flex">
            Connect Wallet
          </Button>
          <Button size="sm">Launch App</Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}