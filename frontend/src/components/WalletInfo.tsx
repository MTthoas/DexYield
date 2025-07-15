import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Button } from "./ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";

export function WalletInfo() {
  const { connected, publicKey, disconnect } = useWallet();
  const { connection } = useConnection();
  const [copying, setCopying] = useState(false);
  const [solBalance, setSolBalance] = useState(0);
  const [splTokens, setSplTokens] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const getSolBalance = useCallback(async () => {
    if (!publicKey || !connection) return 0;
    try {
      const balance = await connection.getBalance(publicKey);
      return balance / 1e9;
    } catch {
      return 0;
    }
  }, [publicKey, connection]);

  useEffect(() => {
    const fetchSplTokens = async () => {
      if (!connected || !publicKey) {
        setSplTokens([]);
        setSolBalance(0);
        return;
      }
      setLoading(true);
      try {
        // SOL natif
        getSolBalance().then(setSolBalance);
        // SPL tokens
        const resp = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
        });
        const tokens = resp.value
          .map((acc) => {
            const info = acc.account.data.parsed.info;
            const mint = info.mint;
            const amount = parseFloat(info.tokenAmount.uiAmountString || "0");
            const decimals = info.tokenAmount.decimals;
            // Icône et nom dynamique : USDC, USDT, SOL liens PNG fournis, autres TrustWallet
            let icon = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/${mint}/logo.png`;
            let symbol = mint.slice(0, 4) + "...";
            if (mint === "So11111111111111111111111111111111111111112") {
              icon =
                "https://pngate.com/wp-content/uploads/2025/07/solana-sol-app-logo-icon-gradient-crypto-symbol-rounded-black-background-1.png";
              symbol = "SOL";
            }
            if (mint === "Es9vMFrzaCERbZ6t2kF9Q6U6TzQbY4xXHzkwgZ4k6A9E") {
              icon =
                "https://png.pngtree.com/png-vector/20220709/ourmid/pngtree-usd-coin-usdc-digital-stablecoin-icon-technology-pay-web-vector-png-image_37843734.png";
              symbol = "USDC";
            }
            if (mint === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") {
              icon =
                "https://png.pngtree.com/png-vector/20220709/ourmid/pngtree-usd-coin-usdc-digital-stablecoin-icon-technology-pay-web-vector-png-image_37843734.png";
              symbol = "USDT";
            }
            return {
              mint,
              symbol,
              icon,
              amount,
              decimals,
            };
          })
          .filter((t) => t.amount > 0);
        setSplTokens(tokens);
      } catch (e) {
        setSplTokens([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSplTokens();
  }, [connected, publicKey, connection, getSolBalance]);

  // Récupérer les prix en temps réel (CoinGecko)
  useEffect(() => {
    const ids: Record<string, string> = {
      So11111111111111111111111111111111111111112: "solana",
      Es9vMFrzaCERbZ6t2kF9Q6U6TzQbY4xXHzkwgZ4k6A9E: "usd-coin",
    };
    const cgIds = splTokens.map((t) => ids[t.mint]).filter(Boolean);
    if (cgIds.length === 0) return;
    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds.join(
        ","
      )}&vs_currencies=usd`
    )
      .then((res) => res.json())
      .then((data) => {
        const priceMap: Record<string, number> = {};
        cgIds.forEach((id) => {
          priceMap[id] = data[id]?.usd || 0;
        });
        setPrices(priceMap);
      });
  }, [splTokens]);

  const copyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      console.error("Erreur lors de la copie:", err);
    }
  };

  if (!connected || !publicKey) return null;
  const address = publicKey.toBase58();

  // Ajout du solde SOL comme token dans la liste
  const allTokens = [
    {
      mint: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      icon: "https://static.vecteezy.com/system/resources/thumbnails/024/093/312/small_2x/solana-sol-glass-crypto-coin-3d-illustration-free-png.png",
      amount: solBalance,
      decimals: 9,
    },
    ...splTokens,
  ];

  // Mapping mint -> coingeckoId
  const mintToCg: Record<string, string> = {
    So11111111111111111111111111111111111111112: "solana",
    Es9vMFrzaCERbZ6t2kF9Q6U6TzQbY4xXHzkwgZ4k6A9E: "usd-coin",
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": "tether",
  };

  return (
    <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] mt-4 mb-8">
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-bold text-lg">Mon Wallet</span>
            <span className="text-xs text-muted-foreground break-all">
              {address}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={copyAddress}
              disabled={copying}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
              <a
                href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disconnect}
              className="ml-2"
            >
              Déconnecter
            </Button>
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            {loading
              ? "Chargement du solde..."
              : allTokens.filter((t) => t.amount > 0).length === 0
              ? "Aucun token trouvé"
              : `${allTokens.filter((t) => t.amount > 0).length} tokens`}
          </div>
          <div className="flex flex-wrap gap-3">
            {allTokens
              .filter((t) => t.amount > 0)
              .map((token) => {
                const cgId = mintToCg[token.mint];
                const price = cgId ? prices[cgId] || 0 : 0;
                const value = price * token.amount;
                return (
                  <div
                    key={token.mint}
                    className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 min-w-[120px]"
                  >
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png";
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {token.amount.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                    </span>
                    <span className="font-medium text-foreground">
                      {token.symbol}
                    </span>
                    <span className="ml-2 text-xs text-accent font-semibold">
                      {price > 0
                        ? `$${value.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}`
                        : ""}
                    </span>
                  </div>
                );
              })}
          </div>
          {copying && (
            <div className="text-xs text-green-600 mt-2">Adresse copiée !</div>
          )}
        </div>
      </div>
    </section>
  );
}
