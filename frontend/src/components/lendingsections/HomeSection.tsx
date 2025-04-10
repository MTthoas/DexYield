import { ArrowRight, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeSection() {
  return (
    <section className="w-full min-h-screen flex flex-col mt-16 -pb-4 md:pb-24 lg:pb-32 xl:pb-24">
      <div className="container relative flex flex-col items-center flex-grow">
        <div className="relative w-full">
          <img
            src="/images/yield.jpg"
            alt="YieldFi"
            className="mx-auto rounded-full object-cover w-[350px] h-[350px] sm:w-[400px] sm:h-[400px] lg:w-[450px] lg:h-[450px] ml-60"
          />
          <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-[275px]">
            <h1 className="text-center text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              <span className="text-white">Unlock the P</span>
              <span className="text-black">ower of DeFi </span>
              <span className="text-white">Lending &amp;</span>
              <span className="text-black"> Borrowing</span>
            </h1>
          </div>
        </div>
        <div className="mt-8 text-center">
          <p className="max-w-[600px] text-muted-foreground md:text-xl">
            Earn high yields on your assets and access liquidity without selling. The most secure and efficient
            DEX platform for lending and borrowing.
          </p>
          <div className="mt-4 flex flex-row gap-2 items-center justify-center">
            <Button size="lg" className="gap-1">
              Start Earning <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
          <div className="mt-4 flex justify-center space-x-4 text-sm">
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-primary" />
              <span>Audited &amp; Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-4 w-4 text-primary" />
              <span>Non-custodial</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}