// src/routes/index.tsx
import React, { createContext, useEffect } from "react";
import { useLocation, useNavigate, createFileRoute } from "@tanstack/react-router";

// Création d'un contexte global (modifiable selon tes besoins)
export const AppContext = createContext({});

// Provider qui enveloppe l'application
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AppContext.Provider value={{}}>{children}</AppContext.Provider>;
};

// Composant principal qui enveloppe l'application et effectue la redirection
function App({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Si l'URL est exactement "/", redirige vers /explore/home
    if (location.pathname === "/") {
      navigate({ to: "/explore/home", replace: true });
    }
  }, [location, navigate]);

  return <AppProvider>{children}</AppProvider>;
}

export const Route = createFileRoute("/")({
  component: App,
});
