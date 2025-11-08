# Creator DAO Platform

A platform for creators to build, scale, and engage communities with NFTs, DAOs, and automated Discord integration. Deploy on-chain communities with governance in seconds.

## Overview

The Creator DAO Platform enables creators to:

- **Launch NFT-gated communities** with dynamic pricing via Chainlink
- **Set up on-chain governance** using OpenZeppelin Governor
- **Automate Discord integration** for member access control
- **Deploy everything in one click** via the Community Factory

## Tech Stack

### Smart Contracts (`/contracts`)

- **Foundry** - Development framework
- **Solidity ^0.8.27** - Smart contract language
- **OpenZeppelin Contracts** - Governance & NFT standards
- **Chainlink Data Feeds** - Dynamic USD pricing for NFTs

### Frontend (`/frontend`)

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **wagmi + viem** - Web3 interactions
- **RainbowKit** - Wallet connection
- **Farcaster MiniApp SDK** - Social integration
- **Tailwind CSS** - Styling

## Key Features

### AccessNFT

- ERC-721 membership tokens with ERC721Votes
- Dynamic mint pricing ($1 USD via Chainlink)
- Pausable minting and supply limits
- Owner-controlled airdrops and withdrawals

### CommunityGovernor

- Snapshot-based voting (1 NFT = 1 vote)
- Configurable quorum and thresholds
- Optional Timelock support
- Fast voting periods optimized for Base

### CommunityFactory

- One-click deployment of NFT + Governor
- Automatic registry indexing
- Configurable governance parameters
- Chainlink price feed integration

### CommunityRegistry

- On-chain discovery index
- Community metadata storage
- Queryable community listings

## Project Structure

```
cretor-dao-platform/
├── contracts/          # Smart contracts (Foundry)
│   ├── src/            # Contract source files
│   ├── test/           # Test files
│   ├── script/         # Deployment scripts
│   └── out/            # Build artifacts
└── frontend/           # Next.js application
    ├── app/            # Next.js app router
    ├── components/     # React components
    ├── lib/            # Utilities & contract configs
    └── providers/      # React context providers
```

## Network Support

- **Base Mainnet** (Chain ID: 8453)
- **Base Sepolia** (Chain ID: 84532)

Contract addresses are configured in `frontend/lib/contracts/config.ts`.

## Documentation

- [Smart Contracts README](./contracts/README.md) - Detailed contract documentation
- [Frontend README](./frontend/README.md) - Frontend setup and configuration

## License

MIT
