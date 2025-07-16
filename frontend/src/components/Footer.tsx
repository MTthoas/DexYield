// src/components/Footer.tsx
import { Link } from "@tanstack/react-router";
import { HiOutlineCube } from "react-icons/hi";
import { GithubIcon } from "@/icons/GithubIcon";

export default function Footer() {
  return (
    <footer className="w-full bg-background text-foreground border-t border-border py-4 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-none px-[5%] lg:px-[8%] xl:px-[12%]">
        {/* Main Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-1.5">
              <HiOutlineCube className="h-5 w-5 text-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">YieldFi</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-8 text-sm">
            <Link
              to="/explore/home"
              className="text-foreground/70 hover:text-accent transition-colors"
            >
              Home
            </Link>
            <Link
              to="/lending"
              className="text-foreground/70 hover:text-accent transition-colors"
            >
              Lending
            </Link>
            <Link
              to="/"
              className="text-foreground/70 hover:text-accent transition-colors"
            >
              Docs
            </Link>
            <a
              href="https://github.com/MTthoas/DexYield"
              className="p-2 rounded-lg bg-accent/5 hover:bg-accent/10 text-foreground/70 hover:text-foreground transition-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-4 pt-6 mb-2 border-t border-border flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
          <p className="text-foreground/50">
            &copy; {new Date().getFullYear()} YieldFi Protocol. All rights
            reserved.
          </p>
          <div className="flex items-center gap-2">
            <span>Built on</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 border border-white/40">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              <span className="text-xs font-medium">Solana</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
