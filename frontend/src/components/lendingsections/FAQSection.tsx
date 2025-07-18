export function FAQSection() {
  return (
    <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-black">
      <div className="w-full max-w-none px-[5%] lg:px-[8%] xl:px-[12%]">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-blue-600 px-3 py-1 text-sm text-white">
              FAQ
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-white">
              Frequently Asked Questions
            </h2>
            <p className="max-w-[900px] text-gray-300 md:text-xl/relaxed">
              Find answers to common questions about our platform
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl gap-8 py-12">
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-white">How does lending work on DexYield?</h3>
            <p className="mt-2 text-gray-300">
              When you lend your assets on DexYield, they are added to a liquidity pool that borrowers can access.
              You earn interest based on the utilization rate of the pool and current market conditions. Interest accrues
              in real-time and can be withdrawn at any time.
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-white">What collateral ratio is required for borrowing?</h3>
            <p className="mt-2 text-gray-300">
              DexYield requires a minimum collateral ratio of 150%, meaning you can borrow up to 66% of your collateral's value.
              Different assets may have different collateral requirements based on their volatility and liquidity.
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-white">Is DexYield secure?</h3>
            <p className="mt-2 text-gray-300">
              DexYield prioritizes security with multiple layers of protection. Our smart contracts have been audited by
              leading security firms, we implement strict access controls, and maintain significant insurance funds to protect
              against unexpected events.
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-white">What happens if my collateral value drops?</h3>
            <p className="mt-2 text-gray-300">
              If your collateral value drops below the required ratio, you'll receive notifications to add more collateral or
              repay part of your loan. If the ratio reaches a critical threshold, a portion of your collateral may be liquidated
              to maintain the health of the protocol.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}