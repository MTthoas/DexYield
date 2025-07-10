// src/components/Footer.tsx
import { Link } from "@tanstack/react-router";
import { HiOutlineCube } from "react-icons/hi";
import { GithubIcon } from "@/icons/GithubIcon";

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white border-t border-white/10 py-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900/30 to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.05),transparent_50%)]"></div>

      <div className="relative z-10 w-full max-w-none px-[5%] lg:px-[8%] xl:px-[12%]">
        {/* Main Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-1.5">
              <HiOutlineCube className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
              YieldFi
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-8 text-sm">
            <Link
              to="/explore/home"
              className="text-white/70 hover:text-cyan-400 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/lending"
              className="text-white/70 hover:text-cyan-400 transition-colors"
            >
              Lending
            </Link>
            <Link
              to="/"
              className="text-white/70 hover:text-cyan-400 transition-colors"
            >
              Docs
            </Link>
            <a
              href="https://github.com/MTthoas/DexYield"
              className="p-2 rounded-lg bg-white/5 hover:bg-slate-800/50 text-white/70 hover:text-white transition-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-white/50">
            &copy; {new Date().getFullYear()} YieldFi Protocol. All rights
            reserved.
          </p>
          <div className="flex items-center gap-2 text-white/50">
            <span>Built on</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-400/20">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
              <span className="text-purple-300 text-xs font-medium">
                Solana
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
