import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function ActionSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 md:px-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
            Ready to maximize your crypto assets?
          </h2>
          <p className="text-primary-foreground/80 md:text-xl/relaxed">
            Join thousands of users already earning and borrowing on YieldFi.
          </p>
        </div>
        <div className="mt-4 flex flex-row gap-2 items-center justify-center">
          <Button size="lg" variant="secondary" className="gap-1">
            Launch App <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
          >
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}