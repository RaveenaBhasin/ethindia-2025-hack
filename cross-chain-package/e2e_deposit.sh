#!/bin/bash

if [ $# -ne 1 ]; then
  echo "Usage: $0 <direction>"
  echo "  direction: a2b or b2a"
  exit 1
fi

DIRECTION="$1"

CHAIN_A_RPC="https://eth-sepolia.public.blastapi.io"
CHAIN_B_RPC="https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc"
CHAIN_A_PRIVATE_KEY="0x35c5c71f673bf923f46fb572212ea7160b876290689ab2ce298925ad0eb1b167"
CHAIN_B_PRIVATE_KEY="0x660e5f63acf07c86cf8ef448bc68c4b754e16f2c96702acd9f61519a6337ed05"  
SPOKEPOOL_A_ADDRESS="0x2e464Fc721F65921E6816c852F59ecb9147DdC9C"
SPOKEPOOL_B_ADDRESS="0xdad2efe2440de1b9d495064353503f6f3db26516"
WETH_A_ADDRESS="0x6b73250CFF2DCE3426D41a45f6f7543C65786d96"
WETH_B_ADDRESS="0x578062540915DE0Cc6C97c53F273fFa828ee7bbE"

if [ "$DIRECTION" = "a2b" ]; then
  SRC_CHAIN_RPC="$CHAIN_A_RPC"
  DST_CHAIN_RPC="$CHAIN_B_RPC"
  SRC_PRIVATE_KEY="$CHAIN_A_PRIVATE_KEY"
  SRC_SPOKEPOOL="$SPOKEPOOL_A_ADDRESS"
  DST_SPOKEPOOL="$SPOKEPOOL_B_ADDRESS"
  SRC_WETH="$WETH_A_ADDRESS"
  DST_WETH="$WETH_B_ADDRESS"
elif [ "$DIRECTION" = "b2a" ]; then
  SRC_CHAIN_RPC="$CHAIN_B_RPC"
  DST_CHAIN_RPC="$CHAIN_A_RPC"
  SRC_PRIVATE_KEY="$CHAIN_B_PRIVATE_KEY"
  SRC_SPOKEPOOL="$SPOKEPOOL_B_ADDRESS"
  DST_SPOKEPOOL="$SPOKEPOOL_A_ADDRESS"
  SRC_WETH="$WETH_B_ADDRESS"
  DST_WETH="$WETH_A_ADDRESS"
else
  echo "Invalid direction: $DIRECTION. Use 'a2b' or 'b2a'."
  exit 1
fi

EXCLUSIVE_RELAYER="0xca0AAC84A57e239A2918E9537BCc3Ee29E24b6cd"  # Set your exclusive relayer address here
EXCLUSIVITY_DEADLINE_DELTA=300  # Set to 300 or 400 as needed

hex_to_dec() {
  printf "%d" "$((16#${1#0x}))"
}

current_time_hex=$(cast call $SRC_SPOKEPOOL "getCurrentTime()" --rpc-url $SRC_CHAIN_RPC)
current_time_dec=$(hex_to_dec $current_time_hex)

quote_time_buffer_hex=$(cast call $SRC_SPOKEPOOL "depositQuoteTimeBuffer()" --rpc-url $SRC_CHAIN_RPC)
quote_time_buffer_dec=$(hex_to_dec $quote_time_buffer_hex)

fill_deadline=$((current_time_dec + quote_time_buffer_dec))

exclusivity_deadline=$((current_time_dec + EXCLUSIVITY_DEADLINE_DELTA))

chain_id=$(cast chain-id --rpc-url $DST_CHAIN_RPC)

sender_address=$(cast wallet address --private-key $SRC_PRIVATE_KEY)
recipient_address=0xe50b254a5571B59B521e75622C2573067F893132

# Get nonce for approval
approve_nonce=$(cast nonce $sender_address --rpc-url $SRC_CHAIN_RPC)

# Approve WETH for SpokePool
if [ "$DIRECTION" = "b2a" ]; then
  # Kadena requires explicit gas parameters
  cast send $SRC_WETH "approve(address,uint256)" $SRC_SPOKEPOOL 10000000 \
    --rpc-url $SRC_CHAIN_RPC \
    --private-key $SRC_PRIVATE_KEY \
    --legacy \
    --chain-id 5920 \
    --gas-price 1gwei \
    --gas-limit 100000 \
    --nonce $approve_nonce
else
  # Ethereum Sepolia
  cast send $SRC_WETH "approve(address,uint256)" $SRC_SPOKEPOOL 10000000 \
    --rpc-url $SRC_CHAIN_RPC \
    --private-key $SRC_PRIVATE_KEY \
    # --nonce $approve_nonce
fi

# Get nonce for deposit
deposit_nonce=$((approve_nonce + 1))

# DepositV3 transaction
if [ "$DIRECTION" = "b2a" ]; then
  # Kadena requires explicit gas parameters
  cast send $SRC_SPOKEPOOL "depositV3(address,address,address,address,uint256,uint256,uint256,address,uint32,uint32,uint32,bytes)" \
    $sender_address \
    $recipient_address \
    $SRC_WETH \
    $DST_WETH \
    200 \
    50 \
    $chain_id \
    0x0000000000000000000000000000000000000000 \
    $current_time_dec \
    $fill_deadline \
    0 \
    0x \
    --rpc-url $SRC_CHAIN_RPC \
    --private-key $SRC_PRIVATE_KEY \
    --legacy \
    --chain-id 5920 \
    --gas-price 1gwei \
    --gas-limit 200000 \
    --nonce $deposit_nonce
else
  # Ethereum Sepolia
  cast send $SRC_SPOKEPOOL "depositV3(address,address,address,address,uint256,uint256,uint256,address,uint32,uint32,uint32,bytes)" \
    $sender_address \
    $recipient_address \
    $SRC_WETH \
    $DST_WETH \
    200 \
    50 \
    $chain_id \
    0x0000000000000000000000000000000000000000 \
    $current_time_dec \
    $fill_deadline \
    0 \
    0x \
    --rpc-url $SRC_CHAIN_RPC \
    --private-key $SRC_PRIVATE_KEY \
    --nonce $deposit_nonce
fi

echo "DepositV3 transaction sent. Monitor relayer and DataWorker logs for full flow." 