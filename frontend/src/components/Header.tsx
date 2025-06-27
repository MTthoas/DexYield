import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { MenuIcon } from "@/icons/MenuIcon";
import { GithubIcon } from "@/icons/GithubIcon";
import { WalletButton } from "./WalletButton";
import { HiOutlineCube } from "react-icons/hi";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-slate-900/10 backdrop-blur-xl border-b border-white/10 supports-[backdrop-filter]:bg-slate-900/10">
      <div className="w-full max-w-none flex h-16 items-center justify-between px-[5%] lg:px-[8%] xl:px-[12%]">
        <div className="flex items-center gap-2">
          <HiOutlineCube
            className="inline-block  align-text text-white animate-x"
            size={25}
          />
          <span className="text-xl font-bold text-white">YieldFi</span>
        </div>
        <nav className="hidden md:flex gap-6">
          <Link
            to="/explore/home"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors relative group"
          >
            Home
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors relative group"
          >
            Markets
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/explore/home"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors relative group"
          >
            Portfolio
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors relative group"
          >
            Docs
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/MTthoas/DexYield"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all duration-300 backdrop-blur-sm border border-white/10"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </a>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
            <WalletButton />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
          >
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
