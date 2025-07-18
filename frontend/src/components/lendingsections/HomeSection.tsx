import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, Zap } from "lucide-react";

export function HomeSection() {
  return (
    <section className="min-h-screen w-screen relative overflow-hidden bg-black pt-16">
      {/* Dynamic background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/5 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-purple-500/15 to-pink-400/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-400/10 rounded-full blur-2xl"></div>
      </div>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:80px_80px]"></div>

      <div className="relative z-10 w-full h-screen flex items-center px-[5%] lg:px-[8%] xl:px-[12%]">
        {/* Hero Content */}
        <div className="w-full max-w-6xl space-y-12">
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Protocol Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                DeFi Yield Protocol
              </div>

              {/* Main Title */}
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none">
                  <span className="text-white">Maximize Your</span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                    Crypto Yields
                  </span>
                </h1>
              </div>

              {/* Description */}
              <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
                Advanced lending and borrowing protocol with optimized yield
                strategies. Earn competitive returns while maintaining full
                control of your assets.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="lg"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold border-0 transition-all duration-300"
                >
                  Start Lending
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 border-gray-600 text-white hover:bg-gray-800 hover:text-white transition-all duration-300"
                >
                  Explore Markets
                </Button>
              </div>
            </div>

            {/* Right Content - Stats & Features */}
            <div className="space-y-8">
              {/* Live Stats */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <span className="text-gray-400 text-sm">
                      Total Value Locked
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-white">$2.8B</div>
                  <div className="text-green-400 text-sm">
                    +12.5% this month
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <span className="text-gray-400 text-sm">Active Users</span>
                  </div>
                  <div className="text-3xl font-bold text-white">47.2K</div>
                  <div className="text-blue-400 text-sm">+1.2K today</div>
                </div>
              </div>

              {/* Key Features */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">
                  Why Choose DexYield?
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/30 border border-gray-800/50">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <span className="text-gray-300">
                      Audited smart contracts
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/30 border border-gray-800/50">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <span className="text-gray-300">
                      Optimized yield strategies
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/30 border border-gray-800/50">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <span className="text-gray-300">
                      Lightning-fast transactions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Yield Rates Preview */}
          <div className="pt-8 border-t border-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-8">
              <div className="text-gray-400">
                <span className="text-sm">Current top yields:</span>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">8.5%</div>
                  <div className="text-gray-500 text-sm">USDC</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">12.3%</div>
                  <div className="text-gray-500 text-sm">ETH</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">15.7%</div>
                  <div className="text-gray-500 text-sm">SOL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}