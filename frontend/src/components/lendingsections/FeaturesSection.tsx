import { Percent, CreditCard, BarChart3, Shield, DollarSign, Wallet } from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-black">
      <div className="w-full max-w-none px-[5%] lg:px-[8%] xl:px-[12%]">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-blue-600 px-3 py-1 text-sm text-white">
              Features
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-white">
              Everything You Need for DeFi Success
            </h2>
            <p className="max-w-[900px] text-gray-300 md:text-xl/relaxed">
              Our platform offers a comprehensive suite of tools for lending and borrowing in the decentralized finance ecosystem.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl gap-8 py-12 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <div className="rounded-full bg-blue-600/20 p-3">
              <Percent className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">High Yield Lending</h3>
            <p className="text-center text-gray-300">
              Earn competitive interest rates by lending your crypto assets to the platform.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <div className="rounded-full bg-blue-600/20 p-3">
              <CreditCard className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Flexible Borrowing</h3>
            <p className="text-center text-gray-300">
              Borrow against your crypto collateral with flexible terms and competitive rates.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <div className="rounded-full bg-blue-600/20 p-3">
              <BarChart3 className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Real-time Analytics</h3>
            <p className="text-center text-gray-300">
              Track your positions, earnings, and market conditions with advanced analytics.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <div className="rounded-full bg-blue-600/20 p-3">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Multi-layer Security</h3>
            <p className="text-center text-gray-300">
              Your assets are protected by industry-leading security protocols and regular audits.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <div className="rounded-full bg-blue-600/20 p-3">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Multi-asset Support</h3>
            <p className="text-center text-gray-300">
              Support for a wide range of cryptocurrencies and tokens across multiple blockchains.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2 rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <div className="rounded-full bg-blue-600/20 p-3">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Non-custodial</h3>
            <p className="text-center text-gray-300">
              Maintain full control of your assets with our non-custodial smart contract architecture.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}