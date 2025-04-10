// src/components/Footer.tsx
import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import { GithubIcon } from '@/icons/GithubIcon'

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background py-6 md:py-12">
      <div className="container flex flex-col gap-4 px-4 md:flex-row md:px-6">
        <div className="flex flex-col gap-2 ml-30">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">YieldFi</span>
          </div>
          <p className="text-sm text-muted-foreground">
            The most secure and efficient DEX platform for lending and borrowing.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 sm:grid-cols-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Platform</h3>
            <ul>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Link
                </Link>
              </li>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Link
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Company</h3>
            <ul>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Lonk
                </Link>
              </li>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Lonk
                </Link>
              </li>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Lonk
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Resources</h3>
            <ul>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Lank
                </Link>
              </li>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Lank
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Legal</h3>
            <ul>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Lunk
                </Link>
              </li>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Lunk
                </Link>
              </li>
              <li>
                <Link to="/explore/home" className="text-sm font-medium transition-colors hover:text-primary">
                  Lunk
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="container mt-6 flex flex-col items-center justify-between gap-4 border-t py-6 md:h-24 md:flex-row md:py-0 ml-4">
        <p className="text-center text-sm text-muted-foreground ml-32">
          &copy; {new Date().getFullYear()} YieldFi. All rights reserved.
        </p>
        <div className="flex items-center gap-4 mr-40">
          <Link
            to="https://github.com/MTthoas/DexYield"
            className="text-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}