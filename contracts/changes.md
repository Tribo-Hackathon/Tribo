# Changes Documentation - Chainlink Integration

This document outlines all changes made to support Chainlink Data Feeds integration. Use this guide to update your frontend integration.

## Summary of Changes

1. **Dynamic Mint Pricing**: Mint price is now calculated using Chainlink ETH/USD price feed (defaults to $1 USD)
2. **New Constructor Parameters**: AccessNFT now requires Chainlink aggregator address
3. **New Owner Functions**: Added function to update mint price

---

## Breaking Changes

### AccessNFT Constructor

**Before:**
```solidity
new AccessNFT(name, symbol, baseURI, maxSupply, initialOwner)
```

**After:**
```solidity
new AccessNFT(name, symbol, baseURI, maxSupply, initialOwner, priceFeedAddress)
```

**New Parameters:**
- `priceFeedAddress` (address): Chainlink ETH/USD aggregator address (required)

### DeploymentConfig Structure

**Before:**
```typescript
{
  name: string
  symbol: string
  baseURI: string
  creator: address
  maxSupply: bigint
  votingDelay: number
  votingPeriod: number
  proposalThreshold: bigint
  quorumNumerator: bigint
  deployTimelock: boolean
  metadataURI: string
}
```

**After:**
```typescript
{
  name: string
  symbol: string
  baseURI: string
  creator: address
  maxSupply: bigint
  votingDelay: number
  votingPeriod: number
  proposalThreshold: bigint
  quorumNumerator: bigint
  deployTimelock: boolean
  metadataURI: string
  priceFeedAddress: address  // NEW - required
}
```

### Removed Constants

- ❌ `MINT_PRICE` constant removed
- ✅ Use `getMintPrice()` function instead

---

## New Functions

### Public/View Functions

#### `getMintPrice() returns (uint256)`
Get the current mint price in ETH based on Chainlink price feed.

**Usage:**
```typescript
const mintPrice = await publicClient.readContract({
  address: nftAddress,
  abi: AccessNFT_ABI,
  functionName: 'getMintPrice'
})
```

**Returns:** Current mint price in wei (calculated from USD price and ETH/USD rate)

**Example:**
```typescript
// Get current price before minting
const price = await publicClient.readContract({
  ...NFT,
  functionName: 'getMintPrice'
})

// Mint with the exact price
await walletClient.writeContract({
  ...NFT,
  functionName: 'mint',
  value: price,
  account
})
```

#### `mintPriceUSD() returns (uint256)`
Get the current mint price in USD cents (e.g., 100 = $1.00).

**Usage:**
```typescript
const priceUSD = await publicClient.readContract({
  address: nftAddress,
  abi: AccessNFT_ABI,
  functionName: 'mintPriceUSD'
})
```

#### `priceFeed() returns (address)`
Get the Chainlink price feed address.

**Usage:**
```typescript
const feedAddress = await publicClient.readContract({
  address: nftAddress,
  abi: AccessNFT_ABI,
  functionName: 'priceFeed'
})
```

### Owner-Only Functions

#### `setMintPriceUSD(uint256 newPriceUSD)`
Update the mint price in USD cents.

**Parameters:**
- `newPriceUSD` (uint256): New price in cents (e.g., 100 = $1.00, 200 = $2.00)

**Usage:**
```typescript
// Change mint price to $2.00
await walletClient.writeContract({
  address: nftAddress,
  abi: AccessNFT_ABI,
  functionName: 'setMintPriceUSD',
  args: [200], // 200 cents = $2.00
  account: ownerAccount
})
```

**Events:**
- `MintPriceUpdated(uint256 oldPrice, uint256 newPrice)`

---

## Updated Functions

### `mint()`
The mint function now uses dynamic pricing instead of a fixed constant.

**Before:**
```typescript
// Fixed price
await walletClient.writeContract({
  ...NFT,
  functionName: 'mint',
  value: parseEther('0.0001'), // Fixed 0.0001 ETH
  account
})
```

**After:**
```typescript
// Dynamic price from Chainlink
const price = await publicClient.readContract({
  ...NFT,
  functionName: 'getMintPrice'
})

await walletClient.writeContract({
  ...NFT,
  functionName: 'mint',
  value: price, // Dynamic price based on current ETH/USD rate
  account
})
```

**Error Changes:**
- Old: `InvalidMintValue(uint256 sent)`
- New: `InvalidMintValue(uint256 sent, uint256 required)`

### `tokenURI(uint256 tokenId)`
No changes - continues to return `baseURI + tokenId` as before.

---

## New Events

### `MintPriceUpdated(uint256 oldPrice, uint256 newPrice)`
Emitted when the mint price in USD is updated.

**Listen:**
```typescript
watchContractEvent(publicClient, {
  address: nftAddress,
  abi: AccessNFT_ABI,
  eventName: 'MintPriceUpdated'
}, (logs) => {
  logs.forEach((log) => {
    console.log('Price updated:', {
      oldPrice: log.args.oldPrice,
      newPrice: log.args.newPrice
    })
  })
})
```

---

## New Errors

### `InvalidPriceFeed()`
Thrown when:
- Price feed data is stale (older than 1 hour)
- Price feed returns invalid price (zero or negative)

**Handling:**
```typescript
try {
  const price = await publicClient.readContract({
    ...NFT,
    functionName: 'getMintPrice'
  })
} catch (error) {
  if (error.message.includes('InvalidPriceFeed')) {
    // Handle stale or invalid price feed
    console.error('Price feed unavailable')
  }
}
```

---

## Chainlink Network Addresses

### Base Sepolia (Testnet)
```
0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1
```

### Base Mainnet
```
0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
```

### Usage in Frontend
```typescript
const CHAINLINK_FEEDS = {
  84532: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1', // Base Sepolia
  8453: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',  // Base Mainnet
}

const priceFeedAddress = CHAINLINK_FEEDS[chainId]
```

---

## Migration Guide

### Step 1: Update Mint Flow

**Old Code:**
```typescript
const MINT_PRICE = parseEther('0.0001')

async function mint() {
  await walletClient.writeContract({
    ...NFT,
    functionName: 'mint',
    value: MINT_PRICE,
    account
  })
}
```

**New Code:**
```typescript
async function mint() {
  // Get current price from Chainlink
  const price = await publicClient.readContract({
    ...NFT,
    functionName: 'getMintPrice'
  })
  
  // Mint with dynamic price
  await walletClient.writeContract({
    ...NFT,
    functionName: 'mint',
    value: price,
    account
  })
}
```

### Step 2: Update Deployment Config

**Old Code:**
```typescript
const config = {
  name: "My Community",
  symbol: "COMM",
  baseURI: "ipfs://...",
  creator: creatorAddress,
  maxSupply: 1000n,
  votingDelay: 1,
  votingPeriod: 7200,
  proposalThreshold: 0n,
  quorumNumerator: 5n,
  deployTimelock: false,
  metadataURI: ""
}
```

**New Code:**
```typescript
const CHAINLINK_FEEDS = {
  84532: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
  8453: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
}

const config = {
  name: "My Community",
  symbol: "COMM",
  baseURI: "ipfs://...",
  creator: creatorAddress,
  maxSupply: 1000n,
  votingDelay: 1,
  votingPeriod: 7200,
  proposalThreshold: 0n,
  quorumNumerator: 5n,
  deployTimelock: false,
  metadataURI: "",
  priceFeedAddress: CHAINLINK_FEEDS[chainId] // NEW
}
```

### Step 3: Update Error Handling

**Old Code:**
```typescript
try {
  await mint()
} catch (error) {
  if (error.message.includes('InvalidMintValue')) {
    // Handle incorrect payment
  }
}
```

**New Code:**
```typescript
try {
  const price = await getMintPrice()
  await mint(price)
} catch (error) {
  if (error.message.includes('InvalidMintValue')) {
    // Handle incorrect payment
    // Error now includes both sent and required amounts
  } else if (error.message.includes('InvalidPriceFeed')) {
    // Handle stale/invalid price feed
  }
}
```

### Step 4: Update UI Components

**Price Display:**
```typescript
// Show current mint price
const [mintPrice, setMintPrice] = useState<bigint | null>(null)
const [priceUSD, setPriceUSD] = useState<number | null>(null)

useEffect(() => {
  async function fetchPrice() {
    const price = await publicClient.readContract({
      ...NFT,
      functionName: 'getMintPrice'
    })
    const usdPrice = await publicClient.readContract({
      ...NFT,
      functionName: 'mintPriceUSD'
    })
    
    setMintPrice(price)
    setPriceUSD(Number(usdPrice) / 100) // Convert cents to dollars
  }
  
  fetchPrice()
  const interval = setInterval(fetchPrice, 60000) // Update every minute
  
  return () => clearInterval(interval)
}, [])

// Display
<div>
  Mint Price: {formatEther(mintPrice || 0n)} ETH
  (${priceUSD?.toFixed(2) || '0.00'})
</div>
```

---

## TypeScript Type Definitions

```typescript
// Add to your types file
export interface AccessNFT {
  // Existing functions...
  getMintPrice: () => Promise<bigint>
  mintPriceUSD: () => Promise<bigint>
  priceFeed: () => Promise<`0x${string}`>
  setMintPriceUSD: (newPriceUSD: bigint) => Promise<`0x${string}`>
}

export interface DeploymentConfig {
  // Existing fields...
  priceFeedAddress: `0x${string}`
}

// Events
export interface MintPriceUpdatedEvent {
  oldPrice: bigint
  newPrice: bigint
}
```

---

## Testing Checklist

- [ ] Update mint function to use `getMintPrice()`
- [ ] Add Chainlink price feed address to deployment config
- [ ] Handle `InvalidPriceFeed` error
- [ ] Update error handling for new `InvalidMintValue` signature
- [ ] Add price display showing current ETH and USD amounts
- [ ] Update deployment scripts with new parameters
- [ ] Test on Base Sepolia with correct Chainlink address
- [ ] Verify price updates correctly when ETH/USD changes

---

## Notes

1. **Price Updates**: The mint price automatically updates based on Chainlink price feed. No need to refresh manually, but you may want to poll `getMintPrice()` periodically.

2. **Price Staleness**: If Chainlink price feed is stale (>1 hour), minting will fail. Monitor for this error and handle gracefully.

3. **Backward Compatibility**: Existing deployed contracts will continue to work, but new deployments require the Chainlink parameters.

---

## Support

For questions or issues:
- Check the README.md for detailed integration examples
- Review test files in `test/` directory for usage patterns
- Chainlink documentation: https://docs.chain.link/data-feeds

