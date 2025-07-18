import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { MenuIcon } from "@/icons/MenuIcon";
import { GithubIcon } from "@/icons/GithubIcon";
import { WalletButton } from "./WalletButton";
import { HiOutlineCube } from "react-icons/hi";
import { useAdminAccess } from "../hooks/useAdminAccess";

export default function Header() {
  const { isAdmin } = useAdminAccess();

  // Classes forcées pour le mode sombre
  const textColorClass = "text-white";
  const textColorSecondaryClass = "text-white/80";
  const hoverTextColorClass = "hover:text-white";
  const borderColorClass = "border-white/10";
  const bgClass = "bg-black/10";
  const iconColorClass = "text-white/70 hover:text-white";
  const buttonHoverClass = "hover:bg-slate-800/50";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full ${bgClass} backdrop-blur-xl border-b ${borderColorClass} transition-all duration-300`}
    >
      <div className="w-full max-w-none flex h-16 items-center justify-between px-[5%] lg:px-[8%] xl:px-[12%]">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl`}>
            <HiOutlineCube
              className={`inline-block align-text ${textColorClass} transition-colors duration-300`}
              size={20}
            />
          </div>
          <span
            className={`text-xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent transition-all duration-300 pt-[0.3rem]`}
          >
            YieldFi
          </span>
        </div>
        <nav className="hidden md:flex gap-6">
          <Link
            to="/explore/home"
            className={`text-sm font-medium ${textColorSecondaryClass} ${hoverTextColorClass} transition-colors relative group`}
          >
            Home
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/lending"
            className={`text-sm font-medium ${textColorSecondaryClass} ${hoverTextColorClass} transition-colors relative group`}
          >
            Lending
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/dashboard"
            className={`text-sm font-medium ${textColorSecondaryClass} ${hoverTextColorClass} transition-colors relative group`}
          >
            Dashboard
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-sm font-medium ${textColorSecondaryClass} ${hoverTextColorClass} transition-colors relative group`}
            >
              Admin
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/MTthoas/DexYield"
            className={`p-2 rounded-lg ${bgClass} ${buttonHoverClass} ${iconColorClass} transition-all duration-300 backdrop-blur-sm border ${borderColorClass}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </a>
          <div
            className={`${bgClass} backdrop-blur-sm border ${borderColorClass} rounded-lg overflow-hidden transition-all duration-300`}
          >
            <WalletButton />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`md:hidden ${textColorClass} ${buttonHoverClass} transition-all duration-300`}
          >
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
