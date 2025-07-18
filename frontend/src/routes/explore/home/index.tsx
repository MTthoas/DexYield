import { HomeSection } from "@/components/lendingsections/HomeSection";
import { FeaturesSection } from "@/components/lendingsections/FeaturesSection";
import { HowItWorksSection } from "@/components/lendingsections/HowItWorksSection";
import { FAQSection } from "@/components/lendingsections/FAQSection";
import { ActionSection } from "@/components/lendingsections/ActionSection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/explore/home/")({
  component: HomePage,
});

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col pt-16 bg-black">
      {/* pt-16 pour compenser le header fixed */}
      <HomeSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FAQSection />
      <ActionSection />
    </main>
  );
}
