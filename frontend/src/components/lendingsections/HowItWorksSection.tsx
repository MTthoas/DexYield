export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-black">
      <div className="w-full max-w-none px-[5%] lg:px-[8%] xl:px-[12%]">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-blue-600 px-3 py-1 text-sm text-white">
              How It Works
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-white">
              Simple Steps to Start Earning
            </h2>
            <p className="max-w-[900px] text-gray-300 md:text-xl/relaxed">
              Get started with DexYield in just a few simple steps
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl gap-8 py-12 md:grid-cols-3">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
              1
            </div>
            <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
            <p className="text-center text-gray-300">
              Connect your crypto wallet to our platform securely with just a
              few clicks.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
              2
            </div>
            <h3 className="text-xl font-bold text-white">Deposit Assets</h3>
            <p className="text-center text-gray-300">
              Deposit your crypto assets to start earning interest or use as
              collateral for borrowing.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
              3
            </div>
            <h3 className="text-xl font-bold text-white">Start Earning</h3>
            <p className="text-center text-gray-300">
              Your assets immediately start earning interest or you can borrow
              against your collateral.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}