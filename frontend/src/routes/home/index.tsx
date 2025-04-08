import { createFileRoute, Link } from "@tanstack/react-router";

import { ArrowRight, BarChart3, CreditCard, DollarSign, Lock, Percent, Shield, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/home/")({
  component: App,
});

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_500px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    Unlock the Power of DeFi Lending & Borrowing
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Earn high yields on your assets and access liquidity without selling. The most secure and efficient
                    DEX platform for lending and borrowing.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" className="gap-1">
                    Start Earning <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="lg">
                    Learn More
                  </Button>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Audited & Secure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="h-4 w-4 text-primary" />
                    <span>Non-custodial</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[350px] w-[350px] sm:h-[400px] sm:w-[400px] lg:h-[450px] lg:w-[450px]">
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/10 blur-[100px]"></div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/20 blur-[100px]"></div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/30 blur-[100px]"></div>
                  <div className="relative flex items-center justify-center rounded-full bg-primary/40">
                    <img
                      src="/images/yield.jpg"
                      alt="YieldFi"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                  Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Everything You Need for DeFi Success
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  Our platform offers a comprehensive suite of tools for lending and borrowing in the decentralized
                  finance ecosystem.
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

        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                  How It Works
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Simple Steps to Start Earning</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  Get started with YieldFi in just a few simple steps
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl gap-8 py-12 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  1
                </div>
                <div className="hidden md:block absolute top-6 left-full h-0.5 w-full -translate-x-6 bg-muted-foreground/30"></div>
                <h3 className="text-xl font-bold">Connect Wallet</h3>
                <p className="text-center text-muted-foreground">
                  Connect your crypto wallet to our platform securely with just a few clicks.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  2
                </div>
                <div className="hidden md:block absolute top-6 left-full h-0.5 w-full -translate-x-6 bg-muted-foreground/30"></div>
                <h3 className="text-xl font-bold">Deposit Assets</h3>
                <p className="text-center text-muted-foreground">
                  Deposit your crypto assets to start earning interest or use as collateral for borrowing.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="text-xl font-bold">Start Earning</h3>
                <p className="text-center text-muted-foreground">
                  Your assets immediately start earning interest or you can borrow against your collateral.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">FAQ</div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Frequently Asked Questions</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  Find answers to common questions about our platform
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl gap-8 py-12">
              <div className="rounded-lg border p-6 shadow-sm">
                <h3 className="text-xl font-bold">How does lending work on YieldFi?</h3>
                <p className="mt-2 text-muted-foreground">
                  When you lend your assets on YieldFi, they are added to a liquidity pool that borrowers can access.
                  You earn interest based on the utilization rate of the pool and current market conditions. Interest
                  accrues in real-time and can be withdrawn at any time.
                </p>
              </div>
              <div className="rounded-lg border p-6 shadow-sm">
                <h3 className="text-xl font-bold">What collateral ratio is required for borrowing?</h3>
                <p className="mt-2 text-muted-foreground">
                  YieldFi requires a minimum collateral ratio of 150%, meaning you can borrow up to 66% of your
                  collateral's value. Different assets may have different collateral requirements based on their
                  volatility and liquidity.
                </p>
              </div>
              <div className="rounded-lg border p-6 shadow-sm">
                <h3 className="text-xl font-bold">Is YieldFi secure?</h3>
                <p className="mt-2 text-muted-foreground">
                  YieldFi prioritizes security with multiple layers of protection. Our smart contracts have been audited
                  by leading security firms, we implement strict access controls, and maintain significant insurance
                  funds to protect against unexpected events.
                </p>
              </div>
              <div className="rounded-lg border p-6 shadow-sm">
                <h3 className="text-xl font-bold">What happens if my collateral value drops?</h3>
                <p className="mt-2 text-muted-foreground">
                  If your collateral value drops below the required ratio, you'll receive notifications to add more
                  collateral or repay part of your loan. If the ratio reaches a critical threshold, a portion of your
                  collateral may be liquidated to maintain the health of the protocol.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Ready to maximize your crypto assets?
              </h2>
              <p className="text-primary-foreground/80 md:text-xl/relaxed">
                Join thousands of users already earning and borrowing on YieldFi.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row lg:justify-end">
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
      </main>
      <footer className="w-full border-t bg-background py-6 md:py-12">
        <div className="container flex flex-col gap-6 px-4 md:flex-row md:px-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">YieldFi</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The most secure and efficient DEX platform for lending and borrowing.
            </p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-10 sm:grid-cols-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Link
                  </Link>
                </li>
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Link
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Lonk
                  </Link>
                </li>
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Lonk
                  </Link>
                </li>
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Lonk
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Lank
                  </Link>
                </li>
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Lank
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Lunk
                  </Link>
                </li>
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Lunk
                  </Link>
                </li>
                <li>
                  <Link to={"/home"} className="text-sm font-medium transition-colors hover:text-primary">
                    Lunk
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container mt-6 flex flex-col items-center justify-between gap-4 border-t py-6 md:h-24 md:flex-row md:py-0">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} YieldFi. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="https://github.com/MTthoas/DexYield" 
                  className="text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
            >  
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span className="sr-only">GitHub</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
