// src/components/Footer.tsx
import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import { GithubIcon } from '@/icons/GithubIcon'

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background py-6 md:py-12">
      <div className="w-full max-w-none flex flex-col gap-4 px-[5%] lg:px-[8%] xl:px-[12%] md:flex-row">
        <div className="flex flex-col gap-2">
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
      <div className="w-full max-w-none mt-6 flex flex-col items-center justify-between gap-4 border-t py-6 px-[5%] lg:px-[8%] xl:px-[12%] md:h-24 md:flex-row md:py-0">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} YieldFi. All rights reserved.
        </p>
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
        </div>
      </div>
    </footer>
  );
}