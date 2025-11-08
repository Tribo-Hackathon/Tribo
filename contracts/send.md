# cast send/call snippets for local and remote interaction

Deploy (Factory + Registry + Community)
```
NAME="Builders Club" \
SYMBOL="BLDR" \
BASE_URI="ipfs://base-demo/" \
CREATOR=0xYourEOA \
MAX_SUPPLY=0 \
VOTING_DELAY=1 \
VOTING_PERIOD=7200 \
PROPOSAL_THRESHOLD=1 \
QUORUM_NUMERATOR=5 \
DEPLOY_TIMELOCK=false \
forge script script/DeployCommunity.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

After deployment, export addresses from script logs
```

```

Fund a specific account (native ETH)
```
# Set target and amount (ETH)
export FUND_TARGET=0xYourTargetAddress
export AMOUNT_ETH=1.25

# Check current balances
cast balance $FUND_TARGET --rpc-url $RPC_URL
cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $RPC_URL

# Send funds from your $PRIVATE_KEY to target
cast send $FUND_TARGET --value ${AMOUNT_ETH}ether --private-key $PRIVATE_KEY --rpc-url $RPC_URL

# Verify new balance
cast balance $FUND_TARGET --rpc-url $RPC_URL
```

AccessNFT (src/AccessNFT.sol)
- Get current mint price (Chainlink-based, $1 USD)
```
cast call $NFT "getMintPrice()(uint256)" --rpc-url $RPC_URL
```

- Mint (dynamic price based on Chainlink ETH/USD feed)
```
# First get the price
PRICE=$(cast call $NFT "getMintPrice()(uint256)" --rpc-url $RPC_URL)
# Then mint with the exact price
cast send $NFT "mint()" --value $PRICE --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

```
- Pause / Unpause (owner only)
```
cast send $NFT "pause()" --private-key $PRIVATE_KEY --rpc-url $RPC_URL
cast send $NFT "unpause()" --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
- Set base URI (owner only)
```
cast send $NFT "setBaseURI(string)" "ipfs://new-base/" --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

- Set mint price in USD cents (owner only, e.g., 100 = $1.00, 200 = $2.00)
```
cast send $NFT "setMintPriceUSD(uint256)" 200 --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

- Get current mint price in USD cents
```
cast call $NFT "mintPriceUSD()(uint256)" --rpc-url $RPC_URL
```
- Withdraw funds (owner only)
```
cast send $NFT "withdraw(address)" $(cast wallet address --private-key $PRIVATE_KEY) \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
- Reads
```
cast call $NFT "balanceOf(address)(uint256)" 0xYourAddress --rpc-url $RPC_URL
```

**Note:** Set these environment variables from your deployment logs or .env file:
```
export FACTORY=<your_factory_address>
export REGISTRY=<your_registry_address>
export NFT=<your_nft_address>
export GOV=<your_governor_address>
export RPC_URL=<your_rpc_url>
export PRIVATE_KEY=<your_private_key>
export CREATOR=<your_creator_address>
```

```
cast call $NFT "totalSupply()(uint256)" --rpc-url $RPC_URL
cast call $NFT "tokenURI(uint256)(string)" 1 --rpc-url $RPC_URL
```
- Votes: delegate once per holder (ERC721Votes)
```
cast send $NFT "delegate(address)" 0xYourEOA --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
- Check voting power
```
# Current voting power (includes delegated votes) - 1 NFT = 1 vote
cast call $NFT "getVotes(address)(uint256)" 0xYourAddress --rpc-url $RPC_URL

# Voting power at a specific past block (must be < current block)
BLOCK_NUM=10
cast call $NFT "getPastVotes(address,uint256)(uint256)" 0xYourEOA $BLOCK_NUM --rpc-url $RPC_URL

# Check who an address has delegated to (returns address(0) if self-delegated)
cast call $NFT "delegates(address)(address)" 0xYourEOA --rpc-url $RPC_URL

# Total voting power at a past block (total supply at that block)
cast call $NFT "getPastTotalSupply(uint256)(uint256)" $BLOCK_NUM --rpc-url $RPC_URL

# Current total voting power (same as totalSupply())
cast call $NFT "totalSupply()(uint256)" --rpc-url $RPC_URL
```

CommunityFactory (src/CommunityFactory.sol)
- Ensure Registry exists (owner only)
```
cast send $FACTORY "createRegistryIfNone()" --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
- Set a different Registry (owner only)
```
cast send $FACTORY "setRegistry(address)" $REGISTRY --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
- Create a community (struct tuple arg)
```
# Base Sepolia Chainlink ETH/USD aggregator: 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1
# Base Mainnet Chainlink ETH/USD aggregator: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
export PRICE_FEED=0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1
cast send $FACTORY \
  "createCommunity((string,string,string,address,uint256,uint48,uint32,uint256,uint256,bool,string,address))" \
  "Builders Club" "BLDR" "ipfs://base-demo/" 0xYourEOA 0 1 7200 1 5 false "" $PRICE_FEED \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

CommunityGovernor (src/CommunityGovernor.sol)
- Propose a no-op (1 action: call your own EOA with 0 value and empty calldata)
```
DESC="Demo proposal"
YOUR=0xYourEOA
DESC_HASH=$(cast keccak "$DESC")
cast send $GOV "propose(address[],uint256[],bytes[],string)(uint256)" "[$YOUR]" "[0]" "[0x]" "$DESC" \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
- Compute proposalId deterministically (no need to parse logs)
```
PROPOSAL_ID=$(cast call $GOV "hashProposal(address[],uint256[],bytes[],bytes32)(uint256)" "[$YOUR]" "[0]" "[0x]" $DESC_HASH --rpc-url $RPC_URL)
echo $PROPOSAL_ID
```
- Advance one block so voting starts (if `votingDelay=1`)
```
cast rpc evm_mine --rpc-url $RPC_URL
```
- Cast a vote (0=Against, 1=For, 2=Abstain)
```
cast send $GOV "castVote(uint256,uint8)" $PROPOSAL_ID 1 --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
- Advance past votingPeriod (e.g., mine 25 blocks)
```
for i in $(seq 1 25); do cast rpc evm_mine --rpc-url $RPC_URL >/dev/null; done
```
- Execute the no-op proposal
```
cast send $GOV "execute(address[],uint256[],bytes[],bytes32)" "[$YOUR]" "[0]" "[0x]" $DESC_HASH \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
- Reads
```
cast call $GOV "state(uint256)(uint8)" $PROPOSAL_ID --rpc-url $RPC_URL
cast call $GOV "votingDelay()(uint256)" --rpc-url $RPC_URL
cast call $GOV "votingPeriod()(uint256)" --rpc-url $RPC_URL
cast call $GOV "proposalSnapshot(uint256)(uint256)" $PROPOSAL_ID --rpc-url $RPC_URL
cast call $GOV "proposalDeadline(uint256)(uint256)" $PROPOSAL_ID --rpc-url $RPC_URL

# Get voting power at a specific timepoint (block number)
# Note: timepoint must be < current block (use past block or proposal snapshot)
PAST_BLOCK=30
cast call $GOV "getVotes(address,uint256)(uint256)" 0xYourEOA $PAST_BLOCK --rpc-url $RPC_URL

# Get voting power at proposal snapshot (for checking proposal eligibility)
# This is the recommended way - uses the exact snapshot when proposal was created
SNAPSHOT=$(cast call $GOV "proposalSnapshot(uint256)(uint256)" $PROPOSAL_ID --rpc-url $RPC_URL)
cast call $GOV "getVotes(address,uint256)(uint256)" 0xYourEOA $SNAPSHOT --rpc-url $RPC_URL
```

CommunityRegistry (src/CommunityRegistry.sol)
- Read all communities
```
cast call $REGISTRY "getAllCommunities()((uint256,address,address,address,address,string,uint64)[])" --rpc-url $RPC_URL
```
- Read one community by id
```
cast call $REGISTRY "getCommunity(uint256)((uint256,address,address,address,address,string,uint64))" 1 --rpc-url $RPC_URL
```
- Total communities
```
cast call $REGISTRY "totalCommunities()(uint256)" --rpc-url $RPC_URL
```
