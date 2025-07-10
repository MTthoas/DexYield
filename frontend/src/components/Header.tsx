import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { MenuIcon } from "@/icons/MenuIcon";
import { GithubIcon } from "@/icons/GithubIcon";
import { WalletButton } from "./WalletButton";
import { HiOutlineCube } from "react-icons/hi";
import { useEffect, useState } from "react";

export default function Header() {
  const [isDarkBackground, setIsDarkBackground] = useState(true);

  useEffect(() => {
    // Fonction pour détecter la couleur de fond en temps réel
    const checkBackgroundColor = () => {
      const headerHeight = 64; // hauteur réelle du header en px

      // Prendre plusieurs points sous le header pour une meilleure détection
      const points = [
        { x: window.innerWidth / 4, y: headerHeight + 10 },
        { x: window.innerWidth / 2, y: headerHeight + 10 },
        { x: (window.innerWidth * 3) / 4, y: headerHeight + 10 },
      ];

      let darkCount = 0;
      let validCount = 0;

      for (const point of points) {
        const elementBelow = document.elementFromPoint(point.x, point.y);

        if (elementBelow) {
          let currentElement = elementBelow;
          let backgroundColor = "transparent";

          // Remonter dans l'arbre DOM pour trouver un élément avec une couleur de fond
          while (currentElement && currentElement !== document.body) {
            const computedStyle = window.getComputedStyle(currentElement);
            const bgColor = computedStyle.backgroundColor;

            if (
              bgColor &&
              bgColor !== "rgba(0, 0, 0, 0)" &&
              bgColor !== "transparent"
            ) {
              backgroundColor = bgColor;
              break;
            }
            currentElement = currentElement.parentElement as Element | null;
            if (!currentElement) break;
          }

          // Si aucune couleur trouvée, utiliser celle du body
          if (backgroundColor === "transparent") {
            backgroundColor = window.getComputedStyle(
              document.body
            ).backgroundColor;
          }

          // Parse RGB values
          const rgb = backgroundColor.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);

            // Calculate luminance
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            if (luminance < 0.5) darkCount++;
            validCount++;
          }
        }
      }

      // Décision basée sur la majorité des points testés
      if (validCount > 0) {
        setIsDarkBackground(darkCount >= validCount / 2);
      }
    };

    const handleScrollAndCheck = () => {
      checkBackgroundColor();
    };

    // Écouter les événements de scroll et de resize
    window.addEventListener("scroll", handleScrollAndCheck);
    window.addEventListener("resize", handleScrollAndCheck);

    // Check initial state
    handleScrollAndCheck();

    // Re-vérifier périodiquement pour s'assurer que les changements dynamiques sont détectés
    const interval = setInterval(checkBackgroundColor, 100);

    return () => {
      window.removeEventListener("scroll", handleScrollAndCheck);
      window.removeEventListener("resize", handleScrollAndCheck);
      clearInterval(interval);
    };
  }, []);

  // Dynamic classes based on background
  const textColorClass = isDarkBackground ? "text-white" : "text-black";
  const textColorSecondaryClass = isDarkBackground
    ? "text-white/80"
    : "text-black/80";
  const hoverTextColorClass = isDarkBackground
    ? "hover:text-white"
    : "hover:text-black";
  const borderColorClass = isDarkBackground
    ? "border-white/10"
    : "border-black/10";
  const bgClass = isDarkBackground ? "bg-black/10" : "bg-white/10";
  const iconColorClass = isDarkBackground
    ? "text-white/70 hover:text-white"
    : "text-black/70 hover:text-black";
  const buttonHoverClass = isDarkBackground
    ? "hover:bg-slate-800/50"
    : "hover:bg-black/10";

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
            className={`text-xl font-bold ${
              isDarkBackground
                ? "bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent"
                : textColorClass
            } transition-all duration-300 pt-[0.3rem]`}
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
            <span className="absolute -bottom-1 left-0 w-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/explore/home"
            className={`text-sm font-medium ${textColorSecondaryClass} ${hoverTextColorClass} transition-colors relative group`}
          >
            Portfolio
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
          <Link
            to="/"
            className={`text-sm font-medium ${textColorSecondaryClass} ${hoverTextColorClass} transition-colors relative group`}
          >
            Docs
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
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
