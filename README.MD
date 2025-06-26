# DexYield

DexYield is a decentralized finance (DeFi) platform designed to optimize yield farming strategies in the Web3 ecosystem. By leveraging smart contracts and blockchain technology, DexYield provides users with secure, transparent, and efficient tools to maximize their returns.

## Structure

```mermaid
graph TD
  A[Project Root] --> B[api]
  A --> C[contracts]
  A --> D[frontend]

  %% API
  B --> B1[prisma]
  B1 --> B1a[schema.prisma]

  B --> B2[src]
  B2 --> B2a[db]
  B2a --> B2a1[kysely.ts]
  B2 --> B2b[routes]

  B --> B3[docker-compose.yml]
  B --> B4[Dockerfile]

  %% Contracts (Anchor / Solana)
  C --> C2[app]
  C --> C3[migrations]
  C --> C4[programs]
  C --> C5[target]
  C --> C6[tests]

  %% Frontend
  D --> D1[public]
  D --> D2[src]
  D --> D3[index.html]
```

## Features

- **Automated Yield Optimization**: Automatically find and execute the best yield farming opportunities.
- **Multi-Chain Support**: Operates across multiple blockchain networks for maximum flexibility.
- **Secure Smart Contracts**: Audited contracts to ensure the safety of user funds.
- **Real-Time Analytics**: Track your portfolio performance with detailed insights.
- **Community Governance**: Participate in decision-making through a decentralized governance model.

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/MTthoas/dexyield.git
   cd dexyield
   ```
