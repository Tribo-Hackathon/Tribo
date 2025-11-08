# TBD Community Kit — AccessNFT + Lightweight Governor

High‑level overview of the smart contracts, how they fit together, and how to integrate them from a frontend (Base / Base Sepolia).

## Overview

- AccessNFT (ERC‑721): membership token. Dynamic mint price ($1 USD via Chainlink Data Feeds), pausable, optional max supply, ERC721Votes (1 NFT = 1 vote).
- CommunityGovernor (OZ Governor): snapshot voting via ERC721Votes; simple quorum and thresholds.
- CommunityFactory: one‑click deploy of AccessNFT + Governor (+ optional Timelock) and write to Registry.
- CommunityRegistry: lightweight discovery index of communities for UIs/bots.
- CommunityDeployer: optional single call to deploy everything on‑chain.

Defaults align with `flow-mvp-simple.md` and are tuned for fast UX on Base Sepolia.

## Components

- Contracts
  - `src/AccessNFT.sol`: ERC‑721 + votes + Chainlink Data Feeds integration; events: `Minted(address,uint256)`, `MintPriceUpdated(uint256,uint256)`.
  - `src/CommunityGovernor.sol`: `Governor` + `GovernorSettings` + `GovernorVotesQuorumFraction`.
  - `src/CommunityFactory.sol`: deploys contracts and emits `CommunityCreated(creator, communityId, nft, governor, timelock)`.
  - `src/CommunityRegistry.sol`: stores `{communityId, creator, nft, governor, timelock, metadataURI, createdAt}`.
  - `src/CommunityDeployer.sol`: convenience deployer that wires Factory/Registry and creates a community.

- Script
  - `script/DeployCommunity.s.sol`: Foundry script to deploy Factory/Registry and create a community with env overrides.

- Tests
  - `test/AccessNFT.t.sol`, `test/CommunityGovernor.t.sol`, `test/CommunityFactory.t.sol`, `test/CommunityRegistry.t.sol`.

## Quick Start

- Build: `forge build`
- Test: `forge test`
- Local node: `anvil`

### One‑shot deployment (script)

Broadcast on Base Sepolia with defaults:

```
PRIVATE_KEY=0x... \
forge script script/DeployCommunity.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast -vvvv
```

Optional env overrides: `NAME`, `SYMBOL`, `BASE_URI`, `CREATOR`, `MAX_SUPPLY`, `VOTING_DELAY`, `VOTING_PERIOD`, `PROPOSAL_THRESHOLD`, `QUORUM_NUMERATOR`, `DEPLOY_TIMELOCK`, `METADATA_URI`, `PRICE_FEED_ADDRESS`.

**Chainlink Integration**: The script automatically uses the correct Chainlink ETH/USD aggregator for Base Sepolia (84532) and Base Mainnet (8453). For other networks, set `PRICE_FEED_ADDRESS` explicitly.

Script outputs Factory, Registry, AccessNFT, Governor, Timelock (if any), and `communityId`.

### Deploy via Factory from frontend

Call `CommunityFactory.createCommunity(cfg)` with a `DeploymentConfig` (see ABI). Use the returned addresses or read from `CommunityRegistry.getAllCommunities()`.

## Frontend Integration (viem)

Examples assume Base Sepolia (chain id 84532). Replace addresses with your deployments. ABIs are in `out/*/*.json`.

1) Clients (public + wallet)

```ts
import { createPublicClient, createWalletClient, custom, http, parseEther } from 'viem'
import { baseSepolia } from 'viem/chains'

export const publicClient = createPublicClient({ chain: baseSepolia, transport: http(process.env.NEXT_PUBLIC_RPC!) })

// In browser with injected wallet (MetaMask, etc.)
export const walletClient = typeof window !== 'undefined' && (window as any).ethereum
  ? createWalletClient({ chain: baseSepolia, transport: custom((window as any).ethereum) })
  : undefined

export async function getAccount() {
  if (!walletClient) throw new Error('No wallet')
  const [account] = await walletClient.getAddresses()
  return account
}
```

2) Mint AccessNFT (Dynamic $1 USD price via Chainlink)

```ts
import AccessNFT from '../out/AccessNFT.sol/AccessNFT.json'

const NFT = { address: '0xYourAccessNFT' as `0x${string}`, abi: AccessNFT.abi }

export async function mint() {
  const account = await getAccount()
  // Get current mint price from Chainlink price feed
  const mintPrice = await publicClient.readContract({ ...NFT, functionName: 'getMintPrice' })
  await walletClient!.writeContract({ ...NFT, functionName: 'mint', account, value: mintPrice })
}
```

3) Check gating (`balanceOf > 0`)

```ts
export async function hasAccess(user: `0x${string}`) {
  const bal = await publicClient.readContract({ ...NFT, functionName: 'balanceOf', args: [user] }) as bigint
  return bal > 0n
}
```

4) Delegate votes once (ERC721Votes)

```ts
export async function delegate(to: `0x${string}`) {
  const account = await getAccount()
  await walletClient!.writeContract({ ...NFT, functionName: 'delegate', args: [to], account })
}
```

5) Create community (Factory)

```ts
import Factory from '../out/CommunityFactory.sol/CommunityFactory.json'

const FACTORY = { address: '0xYourFactory' as `0x${string}`, abi: Factory.abi }

export type DeploymentConfig = {
  name: string
  symbol: string
  baseURI: string
  creator: `0x${string}`
  maxSupply: bigint // 0 = unlimited
  votingDelay: number // blocks
  votingPeriod: number // blocks
  proposalThreshold: bigint // votes required to create a proposal
  quorumNumerator: bigint // percent (1–100)
  deployTimelock: boolean
  metadataURI: string
  priceFeedAddress: `0x${string}` // Chainlink ETH/USD aggregator address
}

export async function createCommunity(cfg: DeploymentConfig) {
  const account = await getAccount()
  await walletClient!.writeContract({ ...FACTORY, functionName: 'createCommunity', args: [cfg], account })
}
```

Parameter explanations (DeploymentConfig)
- `name`, `symbol`: ERC‑721 collection identity.
- `baseURI`: base for token metadata; final `tokenURI = baseURI + tokenId`.
- `creator`: receives initial `Ownable` control of AccessNFT; can `pause/unpause`, `airdrop`, and `withdraw`.
- `maxSupply`: cap on membership size; `0` means unlimited.
- `votingDelay`: blocks between proposal and voting start; `1` is fast and prevents same‑block gaming.
- `votingPeriod`: number of blocks votes remain open; 4–24h for demos on Base Sepolia (e.g., `7200`).
- `proposalThreshold`: minimum votes to propose; set `0` or `1` depending on spam risk.
- `quorumNumerator`: percent of total voting supply required as quorum; typically `5`–`10`.
- `deployTimelock`: if `true`, deploys a `TimelockController` but not wired to execution in this MVP.
- `metadataURI`: optional community metadata reference (off‑chain JSON/IPFS).
- `priceFeedAddress`: Chainlink ETH/USD aggregator address for dynamic mint pricing.

6) Propose & vote (Governor)

```ts
import Governor from '../out/CommunityGovernor.sol/CommunityGovernor.json'

const GOV = { address: '0xYourGovernor' as `0x${string}`, abi: Governor.abi }

export async function proposeNoop(description: string) {
  const account = await getAccount()
  // No‑action proposal example (you can target a real contract method instead)
  await walletClient!.writeContract({ ...GOV, functionName: 'propose', args: [[], [], [], description], account })
}

export async function vote(proposalId: bigint, support: 0 | 1 | 2) {
  const account = await getAccount()
  await walletClient!.writeContract({ ...GOV, functionName: 'castVote', args: [proposalId, support], account })
}
```

Governor parameters and proposal args
- `votingDelay`, `votingPeriod`, `proposalThreshold`, `quorumNumerator` are set at Governor construction via Factory config.
- `propose(targets, values, calldatas, description)`:
  - `targets`: array of contract addresses to call if the proposal passes.
  - `values`: same‑length array of ETH values (wei) for each call.
  - `calldatas`: ABI‑encoded payloads per call.
  - `description`: human‑readable text; the description hash is used in `execute`.
- Snapshot: voting power measured at `proposalSnapshot`; ensure holders delegated before voting.

7) Discover communities (Registry)

```ts
import Registry from '../out/CommunityRegistry.sol/CommunityRegistry.json'
const REG = { address: '0xYourRegistry' as `0x${string}`, abi: Registry.abi }

export async function listCommunities() {
  return publicClient.readContract({ ...REG, functionName: 'getAllCommunities' })
}
```

8) Events

```ts
import { watchContractEvent } from 'viem'

watchContractEvent(publicClient, { ...NFT, eventName: 'Minted' }, logs => {/* update UI */})
watchContractEvent(publicClient, { ...FACTORY, eventName: 'CommunityCreated' }, logs => {/* show addresses */})
```

## Governance Parameters

- `votingDelay`: default 1 block for snappy UX.
- `votingPeriod`: 4–24h for demos; up to 72h for go‑live.
- `quorumNumerator`: 5–10% recommended.
- `proposalThreshold`: 0 or 1. Use 1 to reduce spam with large supply.
- States mirror OZ Governor.

Note: ERC721Votes requires holders to self‑delegate once to activate voting power.

## Chainlink Integration

AccessNFT uses **Chainlink Data Feeds** to provide dynamic mint pricing in USD. This qualifies the project for Chainlink hackathon tracks.

### Features

- **Dynamic Pricing**: Mint price is calculated on-chain using Chainlink ETH/USD price feed to maintain a consistent $1 USD value (configurable via `setMintPriceUSD()`)
- **Price Feed Validation**: Automatic checks for stale or invalid price data (max 1 hour staleness)

### Chainlink Integration Points

- **File**: `src/AccessNFT.sol`
- **Line 83-105**: `getMintPrice()` function - reads from Chainlink AggregatorV3Interface
- **Line 109-125**: `mint()` function` - uses Chainlink price for payment validation
- **State Change**: Minting NFT requires payment calculated from Chainlink price feed

### Network Addresses

- **Base Sepolia**: `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1`
- **Base Mainnet**: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`

### Owner Functions

```ts
// Change mint price to $2.00 USD
await walletClient.writeContract({ 
  ...NFT, 
  functionName: 'setMintPriceUSD', 
  args: [200], // 200 cents = $2.00
  account 
})

// Get current mint price in ETH
const price = await publicClient.readContract({ 
  ...NFT, 
  functionName: 'getMintPrice' 
})
```

## Collab.Land / Discord

- Network: Base or Base Sepolia.
- Contract: AccessNFT address from `CommunityCreated` event.
- Rule: `balanceOf(user) > 0` for the member role.

## Security Notes

- Minting is pausable by the NFT owner (community creator).
- `withdraw()` on AccessNFT transfers collected ETH to a recipient.
- Optional Timelock is available but not wired by default in the Governor.
- Validate input params (creator, URIs, governance) in your UI before sending.

## Repo Layout

- Contracts: `src/`
- Script: `script/`
- Tests: `test/`
- Build artifacts: `out/`
- Flow notes: `flow-mvp-simple.md`
