# Local Testing Guide (Anvil)

End-to-end local workflow to deploy and exercise the community kit on a local Anvil node. Includes wallet funding and key commands for minting, delegating, proposing, voting, and executing.

## Prerequisites

- Foundry installed (forge, cast, anvil)
  - Install: `curl -L https://foundry.paradigm.xyz | bash` then `foundryup`
- jq (optional; useful for parsing receipts): `brew install jq` or your package manager

## Start a local chain

- Start Anvil (prefunded accounts, 10,000 ETH each):
  - `anvil`
- Copy one private key and address from the Anvil output (Account #0 is fine)

Export environment variables in a separate terminal:

```
export RPC_URL=http://127.0.0.1:8545
export PRIVATE_KEY=<anvil_account_private_key>
export CREATOR=<creator_address_or_use_same_as_deployer>
```

Tip: You can also generate a new wallet and fund it from Account #0:

```
cast wallet new > .tmp.wallet
export USER_PK=$(grep "Private Key" .tmp.wallet | awk '{print $3}')
export USER_ADDR=$(grep "Address" .tmp.wallet | awk '{print $2}')
# Fund USER_ADDR with 10 ETH from Account #0
cast send $USER_ADDR --value 10ether --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

## Build contracts

- `forge build`

## Deploy Factory + Registry + Community (script)

One-shot deployment using the provided Foundry script. Adjust overrides as desired.

**Note:** For local Anvil testing, you'll need to deploy a mock Chainlink aggregator or use a testnet address. The script will automatically use the correct Chainlink aggregator for the network.

```
NAME="Builders Club" \
SYMBOL="BLDR" \
BASE_URI="ipfs://local-base/" \
CREATOR=${CREATOR:-$(cast wallet address --private-key $PRIVATE_KEY)} \
MAX_SUPPLY=0 \
VOTING_DELAY=1 \
VOTING_PERIOD=20 \
PROPOSAL_THRESHOLD=0 \
QUORUM_NUMERATOR=5 \
DEPLOY_TIMELOCK=false \
PRICE_FEED_ADDRESS=<mock_or_testnet_aggregator_address> \
forge script script/DeployCommunity.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast -vvvv
```

The script logs:
- Factory, Registry, AccessNFT, Governor, optional Timelock, and communityId

Save the addresses for the next steps:

```
export FACTORY=<from_logs>
export REGISTRY=<from_logs>
export NFT=<from_logs>
export GOV=<from_logs>
```

## Mint an NFT (membership)

Get the current mint price from Chainlink and mint. Use the deployer or your funded `USER_ADDR`.

```
# Get current mint price
PRICE=$(cast call $NFT "getMintPrice()(uint256)" --rpc-url $RPC_URL)

# Using deployer key
cast send $NFT "mint()" \
  --value $PRICE \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL

# Optionally, using USER_PK
# cast send $NFT "mint()" --value $PRICE --private-key $USER_PK --rpc-url $RPC_URL
```

Verify balance:

```
cast call $NFT "balanceOf(address)(uint256)" $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $RPC_URL
```

## Delegate votes (ERC721Votes)

Holders must self-delegate once to activate voting power.

```
cast send $NFT "delegate(address)" $(cast wallet address --private-key $PRIVATE_KEY) \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

## Create a proposal (no-op)

For a quick demo, propose a no-op (no actions). Description can be any string.

```
DESC="Demo proposal"
TX=$(cast send $GOV "propose(address[],uint256[],bytes[],string)(uint256)" [] [] [] "$DESC" \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL --legacy)

# The tx hash is in $TX. To obtain the proposalId from logs later, see below.
```

Advance blocks so voting starts (votingDelay=1):

```
cast rpc evm_mine --rpc-url $RPC_URL
```

## Find the proposalId (from receipt)

```
RCPT=$(cast receipt $TX --rpc-url $RPC_URL --json)
# ProposalCreated topic
TOPIC0=0x69958ed344e5655a0d2c57fe1a71e6f4b23e3a666db4a7b0c6a0b3c5d1d7d7a9

PROP_TOPIC=$(echo "$RCPT" | jq -r \
  '.logs[] | select(.topics[0]=="'"$TOPIC0"'") | .topics[1]')
PROPOSAL_ID=$(cast --to-dec $PROP_TOPIC)
echo "proposalId="$PROPOSAL_ID
```

## Cast a vote

```
# support: 0=Against, 1=For, 2=Abstain
cast send $GOV "castVote(uint256,uint8)" $PROPOSAL_ID 1 \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

Advance past the voting period:

```
# mine ~votingPeriod blocks (e.g., 20)
for i in $(seq 1 25); do cast rpc evm_mine --rpc-url $RPC_URL >/dev/null; done
```

## Execute the proposal (no-op)

Compute the description hash and execute with empty arrays:

```
DESC_HASH=$(cast keccak "$DESC")
cast send $GOV "execute(address[],uint256[],bytes[],bytes32)" [] [] [] $DESC_HASH \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

## Useful owner actions (AccessNFT)

- Pause/unpause minting (creator/owner only):
```
cast send $NFT "pause()" --private-key $PRIVATE_KEY --rpc-url $RPC_URL
cast send $NFT "unpause()" --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

- Withdraw collected funds (creator/owner only):
```
cast send $NFT "withdraw(address)" $(cast wallet address --private-key $PRIVATE_KEY) \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```
