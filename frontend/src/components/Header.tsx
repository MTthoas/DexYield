import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import { Wallet } from 'lucide-react'

export default function Header() {
  return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 ml-4">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">YieldFi</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
              Link
            </Link>
            <Link to={"/"} className="text-sm font-medium transition-colors hover:text-primary">
              Link
            </Link>
            <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
              Link
            </Link>
            <Link to={"/"} className="text-sm font-medium transition-colors hover:text-primary">
              Link
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden md:flex">
              Connect Wallet
            </Button>
            <Button size="sm">Launch App</Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
      </header>
  )
}
