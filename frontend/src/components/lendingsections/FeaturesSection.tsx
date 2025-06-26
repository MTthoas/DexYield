import { Percent, CreditCard, BarChart3, Shield, DollarSign, Wallet } from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
      <div className="w-full max-w-none px-[5%] lg:px-[8%] xl:px-[12%]">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
              Features
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Everything You Need for DeFi Success
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
              Our platform offers a comprehensive suite of tools for lending and borrowing in the decentralized finance ecosystem.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl gap-8 py-12 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
            <div className="rounded-full bg-primary/10 p-3">
              <Percent className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">High Yield Lending</h3>
            <p className="text-center text-muted-foreground">
              Earn competitive interest rates by lending your crypto assets to the platform.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
            <div className="rounded-full bg-primary/10 p-3">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Flexible Borrowing</h3>
            <p className="text-center text-muted-foreground">
              Borrow against your crypto collateral with flexible terms and competitive rates.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
            <div className="rounded-full bg-primary/10 p-3">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Real-time Analytics</h3>
            <p className="text-center text-muted-foreground">
              Track your positions, earnings, and market conditions with advanced analytics.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
            <div className="rounded-full bg-primary/10 p-3">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Multi-layer Security</h3>
            <p className="text-center text-muted-foreground">
              Your assets are protected by industry-leading security protocols and regular audits.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
            <div className="rounded-full bg-primary/10 p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Multi-asset Support</h3>
            <p className="text-center text-muted-foreground">
              Support for a wide range of cryptocurrencies and tokens across multiple blockchains.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
            <div className="rounded-full bg-primary/10 p-3">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Non-custodial</h3>
            <p className="text-center text-muted-foreground">
              Maintain full control of your assets with our non-custodial smart contract architecture.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}