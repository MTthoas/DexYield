// Mock version of the HomePage with mock data
import { HomeSection } from "@/components/lendingsections/HomeSection";
import { FeaturesSection } from "@/components/lendingsections/FeaturesSection";
import { HowItWorksSection } from "@/components/lendingsections/HowItWorksSection";
import { FAQSection } from "@/components/lendingsections/FAQSection";
import { ActionSection } from "@/components/lendingsections/ActionSection";
import { createFileRoute } from "@tanstack/react-router";
import { useMock } from "@/mock/context";
import { MockBadge } from "@/components/ui/MockBadge";

export const Route = createFileRoute("/explore/home/index/mock")({
  component: MockHomePage,
});

export default function MockHomePage() {
  const { globalStats, notifications } = useMock();

  return (
    <main className="flex min-h-screen flex-col pt-16">{/* pt-16 pour compenser le header fixed */}
      {/* Mock Badge */}
      <MockBadge />
      
      {/* Notification banner for mock mode */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 text-center">
        <p className="text-sm">
          🚀 <strong>MODE MOCK ACTIVÉ</strong> - Données de démonstration | 
          TVL: ${globalStats.totalValueLocked.toLocaleString()} | 
          Utilisateurs: {globalStats.totalUsers.toLocaleString()} | 
          Rendement moyen: {globalStats.averageApy}%
        </p>
      </div>

      <HomeSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FAQSection />
      <ActionSection />
    </main>
  );
}
