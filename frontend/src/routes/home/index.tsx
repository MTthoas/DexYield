import { HomeSection } from "@/components/lendingsections/HomeSection";
import { FeaturesSection } from "@/components/lendingsections/FeaturesSection";
import { HowItWorksSection } from "@/components/lendingsections/HowItWorksSection";
import { FAQSection } from "@/components/lendingsections/FAQSection";
import { ActionSection } from "@/components/lendingsections/ActionSection";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/")({
  component: HomePage,
});

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <HomeSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FAQSection />
        <ActionSection />
      </main>
    </div>
  );
}