<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Button, Select, Card, Alert } from '@/components/ui'
import { ArrowUpDown, Wallet, ExternalLink } from 'lucide-vue-next'
import { useWallet } from '@/composables/useWallet'
import { useAcross } from '@/composables/useAcross'
import { supportedChains, getTokensByChainId, getTokenLogo, getBlockscoutExplorerUrl, getCrossChainTokenSymbol } from '@/config/chainConfig'
import { parseUnits, formatEther, formatUnits, createPublicClient, http, getAddress, encodeFunctionData } from 'viem'
import { erc20Abi } from 'viem'
// import { resolveActualChainId } from '@/config/chainConfig' // Disabled for now
import { fetchTokenPriceUSD } from '@/config/utils'
import { spokePoolAbi, wethAbi } from '@/config/abi'
import { getPublicClient, getWalletClient } from '@/config/client'
import { createWalletClient, custom } from 'viem'
import { mainnet } from 'viem/chains'
import { Info } from 'lucide-vue-next'

const {
  isConnected,
  connectedAddress,
  walletClient,
  providers,
  formattedAddress,
  discoverProviders,
  connectWallet,
  disconnectWallet,
  switchChain,
  addOrSwitchChain,
  reconnectWallet
} = useWallet()

const {
  // error: quoteError, // Disabled for now
  // currentQuote, // Disabled for now
  // getQuote, // Disabled for now
} = useAcross()

const fromChainId = ref(supportedChains[0]?.chainId || 1)
const toChainId = ref(supportedChains[1]?.chainId || 42161)
const selectedTokenAddress = ref('')
const amount = ref('')
const balance = ref('0')
const executionError = ref<string | null>(null)
const successTxHash = ref<string | null>(null)
const walletError = ref<string | null>(null)

const selectedToken = computed(() => {
  // Extract the symbol from the selectedTokenAddress (format: "address-symbol")
  if (!selectedTokenAddress.value) return undefined
  
  const [address, symbol] = selectedTokenAddress.value.split('-')
  return getTokensByChainId(fromChainId.value).find(t => 
    t.address === address && t.symbol === symbol
  )
})

const tokenOptions = computed(() => {
  const tokens = getTokensByChainId(fromChainId.value)
  console.log('Available tokens for chain', fromChainId.value, ':', tokens)
  return tokens.map(token => ({
    value: `${token.address}-${token.symbol}`, // Make value unique by combining address and symbol
    label: `${token.symbol}`,
    icon: getTokenLogo(token.symbol),
  }))
})


const fromChainOptions = computed(() => {
  console.log('Supported chains:', supportedChains)
  return supportedChains.map(chain => ({
    value: chain.chainId,
    label: chain.name,
    icon: chain.logo,
  }))
})

const toChainOptions = computed(() =>
  supportedChains.map(chain => ({
    value: chain.chainId,
    label: chain.name,
    icon: chain.logo,
  }))
)

async function fetchBalance() {
  if (!isConnected.value || !selectedToken.value || !connectedAddress.value) {
    balance.value = '0'
    return
  }
  const chain = supportedChains.find(c => c.chainId === fromChainId.value)
  if (!chain) return
  const publicClient = createPublicClient({ transport: http(chain.rpcUrl) })

  console.log("symbol", selectedToken.value.symbol);

  if (selectedToken.value.symbol === 'WETH') {
    const bal = await publicClient.readContract({
      address: getAddress(selectedToken.value.address),
      abi: wethAbi,
      functionName: 'balanceOf',
      args: [connectedAddress.value as `0x${string}`],
    })
    console.log("balance native: ", bal);
    balance.value = formatEther(bal as bigint)
  }
  else if (selectedToken.value.symbol === 'ETH' || selectedToken.value.symbol === 'KDA' || selectedToken.value.symbol === 'HBAR') {
    // Handle native tokens (ETH, KDA, HBAR)
    const bal = await publicClient.getBalance({
      address: connectedAddress.value as `0x${string}`
    })
    console.log("balance native", bal);
    
    // Special handling for HBAR - Hedera EVM returns 18 decimals but HBAR uses 8
    if (selectedToken.value.symbol === 'HBAR') {
      // Convert from 18 decimals (EVM) to 8 decimals (HBAR native)
      const hbarBalance = bal / BigInt(10 ** 10) // Divide by 10^10 to convert 18->8 decimals
      balance.value = formatUnits(hbarBalance, 8)
    } 
    // Special handling for KDA - Kadena EVM returns 18 decimals but KDA uses 12
    else if (selectedToken.value.symbol === 'KDA') {
      // Convert from 18 decimals (EVM) to 12 decimals (KDA native)
      const kdaBalance = bal / BigInt(10 ** 6) // Divide by 10^6 to convert 18->12 decimals
      const formattedBalance = formatUnits(kdaBalance, 12)
      balance.value = parseFloat(formattedBalance).toFixed(5) // Display with 5 decimal places
    } 
    else {
      balance.value = formatUnits(bal, selectedToken.value.decimals)
    }
  } 
  else {
    const bal = await publicClient.readContract({
      address: getAddress(selectedToken.value.address),
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [connectedAddress.value as `0x${string}`]
    })
    console.log("balance erc20 ", bal);
    balance.value = formatUnits(bal as bigint, selectedToken.value.decimals)
  }
}

// Disabled automatic quote fetching for now
// watch([amount, selectedTokenAddress, fromChainId, toChainId, isConnected], async () => {
//   if (amount.value) {
//     await handleGetQuote()
//   }
// })

watch([isConnected, fromChainId, selectedTokenAddress, connectedAddress], fetchBalance, { immediate: true })


watch([fromChainId], async (newChainId, oldChainId) => {
  const tokens = getTokensByChainId(fromChainId.value)
  selectedTokenAddress.value = tokens[0] ? `${tokens[0].address}-${tokens[0].symbol}` : ''
  
  // If from and to chains are the same, automatically switch to chain
  if (fromChainId.value === toChainId.value) {
    const availableChains = supportedChains.filter(chain => chain.chainId !== fromChainId.value)
    if (availableChains.length > 0) {
      toChainId.value = availableChains[0].chainId
    }
  }

  if (isConnected.value && newChainId !== oldChainId && window.ethereum) {
    const fromChain = supportedChains.find(c => c.chainId === (Array.isArray(newChainId) ? newChainId[0] : newChainId))
    if (fromChain) {
      try {
        await addOrSwitchChain(fromChain, window.ethereum)
      } catch (error) {
        console.warn('User rejected network switch or it failed:', error)
      }
    }
  }
}, { immediate: true })

watch([toChainId], () => {
  // If to and from chains are the same, automatically switch from chain
  if (toChainId.value === fromChainId.value) {
    const availableChains = supportedChains.filter(chain => chain.chainId !== toChainId.value)
    if (availableChains.length > 0) {
      fromChainId.value = availableChains[0].chainId
    }
  }
})

watch(fromChainId, async (newChainId, oldChainId) => {
  if (isConnected.value && newChainId !== oldChainId) {
    const chain = supportedChains.find(c => c.chainId === newChainId)
    try {
      if (chain && window.ethereum) {
        await addOrSwitchChain(chain, window.ethereum)
      }
    } catch (err) {
      console.warn('Failed to switch/add network:', err)
    }
  }
})

// Disabled for now
// const isValidAmount = computed(() => {
//   const val = parseFloat(amount.value)
//   return val > 0 && !isNaN(val)
// })

const hasInsufficientBalance = computed(() => {
  if (!amount.value || !balance.value) return false
  const amountVal = parseFloat(amount.value)
  const balanceVal = parseFloat(balance.value)
  return amountVal > balanceVal
})

const unsupportedFromChains = ['arbitrum_mainnet', 'zksync_mainnet', 'polygon_mainnet']

const isFromChainUnsupported = ref(true)
const isButtonDisabled = ref(true)

// Watch fromChainId and update button state
watch(fromChainId, () => {
  const currentFromChain = supportedChains.find(chain => chain.chainId === fromChainId.value)
  
  if (!currentFromChain) {
    isFromChainUnsupported.value = true
    isButtonDisabled.value = true
    return
  }
  
  const isUnsupported = unsupportedFromChains.includes(currentFromChain.networkType)
  isFromChainUnsupported.value = isUnsupported
  isButtonDisabled.value = isUnsupported
}, { immediate: true })

// Disabled canGetQuote for now
// const canGetQuote = computed(() => {
//   return (
//     isConnected.value &&
//     fromChainId.value !== toChainId.value &&
//     isValidAmount.value &&
//     !isFromChainUnsupported.value
//   )
// })


const tokenPriceUSD = ref<number | null>(null)
const ethPriceUSD = ref<number | null>(null)
const kdaPriceUSD = ref<number | null>(null)
const hbarPriceUSD = ref<number | null>(null)
const kdaToEthRate = ref<number | null>(null)
const hbarToEthRate = ref<number | null>(null)

// const coingeckoTokenIds: Record<string, string> = {
//   '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'weth',
//   '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'weth',
// }

// Function to fetch ETH, KDA, and HBAR prices for conversion calculations
async function fetchEthKdaAndHbarPrices() {
  try {
    const [ethPrice, kdaPrice, hbarPrice] = await Promise.all([
      fetchTokenPriceUSD('weth'),
      fetchTokenPriceUSD('kadena'),
      fetchTokenPriceUSD('hedera-hashgraph')
    ])
    
    ethPriceUSD.value = ethPrice
    kdaPriceUSD.value = kdaPrice
    hbarPriceUSD.value = hbarPrice
    
    if (ethPrice && kdaPrice) {
      // Calculate KDA to ETH conversion rate
      kdaToEthRate.value = kdaPrice / ethPrice
      console.log(`ETH Price: $${ethPrice}`)
      console.log(`KDA Price: $${kdaPrice}`)
      console.log(`KDA to ETH rate: ${kdaToEthRate.value}`)
    }
    
    if (ethPrice && hbarPrice) {
      // Calculate HBAR to ETH conversion rate
      hbarToEthRate.value = hbarPrice / ethPrice
      console.log(`HBAR Price: $${hbarPrice}`)
      console.log(`HBAR to ETH rate: ${hbarToEthRate.value}`)
    }
  } catch (error) {
    console.error('Failed to fetch ETH/KDA/HBAR prices:', error)
  }
}

// Function to format numbers with precision and remove trailing zeros
function formatPreciseNumber(num: number, maxDecimals: number): string {
  const formatted = num.toFixed(maxDecimals)
  // Remove trailing zeros
  return parseFloat(formatted).toString()
}

// Function to calculate converted amount for cross-chain swaps
function calculateConvertedAmount(inputAmount: string, fromSymbol: string, toSymbol: string): string {
  const amount = parseFloat(inputAmount)
  if (isNaN(amount)) return inputAmount
  
  // KDA to ETH/WETH conversion
  if (fromSymbol === 'KDA' && (toSymbol === 'ETH' || toSymbol === 'WETH') && kdaToEthRate.value) {
    const ethAmount = amount * kdaToEthRate.value
    return formatPreciseNumber(ethAmount, 8)
  } 
  
  // ETH/WETH to KDA conversion
  else if ((fromSymbol === 'ETH' || fromSymbol === 'WETH') && toSymbol === 'KDA' && kdaToEthRate.value) {
    const kdaAmount = amount / kdaToEthRate.value
    return formatPreciseNumber(kdaAmount, 6)
  }
  
  // HBAR to ETH/WETH conversion
  else if (fromSymbol === 'HBAR' && (toSymbol === 'ETH' || toSymbol === 'WETH') && hbarToEthRate.value) {
    const ethAmount = amount * hbarToEthRate.value
    return formatPreciseNumber(ethAmount, 8)
  }
  
  // ETH/WETH to HBAR conversion
  else if ((fromSymbol === 'ETH' || fromSymbol === 'WETH') && toSymbol === 'HBAR' && hbarToEthRate.value) {
    const hbarAmount = amount / hbarToEthRate.value
    return formatPreciseNumber(hbarAmount, 6)
  }
  
  return inputAmount
}

console.log("selected token address", selectedTokenAddress.value)

watch([selectedTokenAddress], async () => {
  if (!selectedTokenAddress.value) {
    tokenPriceUSD.value = null
    return
  }
  
  // Extract address and symbol from the combined format "address-symbol"
  const [address, symbol] = selectedTokenAddress.value.split('-')
  console.log("Token address:", address, "Symbol:", symbol)
  
  // For both ETH and WETH, use 'weth' price ID
  if (symbol === 'ETH' || symbol === 'WETH') {
    console.log("Fetching price for ETH/WETH as 'weth'")
    tokenPriceUSD.value = await fetchTokenPriceUSD('weth')
  } 
  else if(symbol === 'USDC') {
    // For USDC, use 'usd-coin' price ID
    console.log("Fetching price for USDC")
    tokenPriceUSD.value = await fetchTokenPriceUSD('usd-coin')
  }
  else if(symbol === 'KDA') {
    // For KDA, use 'kadena' price ID
    console.log("Fetching price for KDA")
    tokenPriceUSD.value = await fetchTokenPriceUSD('kadena')
  }
  else if(symbol === 'HBAR') {
    // For HBAR, use 'hedera-hashgraph' price ID
    console.log("Fetching price for HBAR")
    tokenPriceUSD.value = await fetchTokenPriceUSD('hedera-hashgraph')
  }
  else {
      tokenPriceUSD.value = null
  }
}, { immediate: true })

// Note: ETH and KDA prices will be fetched when component mounts

const estimatedUSDValue = computed(() => {
  console.log("amount raw", amount.value) // ✅ Add this
  console.log("token price usd", tokenPriceUSD.value)
  if (!tokenPriceUSD.value || !amount.value) return null
  const amountFloat = parseFloat(amount.value)
  console.log("amount float", amountFloat)
  if (isNaN(amountFloat)) return null
  console.log("amount float *  token price usd", amountFloat * tokenPriceUSD.value)
  return `$${(amountFloat * tokenPriceUSD.value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
})
console.log("estimated usd value", estimatedUSDValue.value)

// const canExecute = computed(() => {
//   return amount.value 
// })

function swapChains() {
  const temp = fromChainId.value
  fromChainId.value = toChainId.value
  toChainId.value = temp
}

// Disabled quote-related computed properties for now
// const tokenSymbol = computed(() => selectedToken.value?.symbol || '')
// const tokenPrice = computed(() => tokenPriceUSD.value || 0)

const destinationTokenSymbol = computed(() => {
  if (!selectedToken.value || !toChainId.value) return ''
  const toChain = supportedChains.find(c => c.chainId === toChainId.value)
  if (!toChain) return ''
  return getCrossChainTokenSymbol(selectedToken.value.symbol, toChain.networkType)
})

// Conversion rate displays
const kdaToEthRateDisplay = computed(() => {
  if (!kdaToEthRate.value) return 'Loading...'
  return `1 KDA = ${formatPreciseNumber(kdaToEthRate.value, 8)} ETH`
})

const ethToKdaRateDisplay = computed(() => {
  if (!kdaToEthRate.value) return 'Loading...'
  const ethToKdaRate = 1 / kdaToEthRate.value
  return `1 ETH = ${formatPreciseNumber(ethToKdaRate, 6)} KDA`
})

const hbarToEthRateDisplay = computed(() => {
  if (!hbarToEthRate.value) return 'Loading...'
  return `1 HBAR = ${formatPreciseNumber(hbarToEthRate.value, 8)} ETH`
})

const ethToHbarRateDisplay = computed(() => {
  if (!hbarToEthRate.value) return 'Loading...'
  const ethToHbarRate = 1 / hbarToEthRate.value
  return `1 ETH = ${formatPreciseNumber(ethToHbarRate, 6)} HBAR`
})

// Show conversion rate when doing ETH/WETH-KDA or ETH/WETH-HBAR swaps
const shouldShowConversionRate = computed(() => {
  if (!selectedToken.value || !toChainId.value) return false
  const toChain = supportedChains.find(c => c.chainId === toChainId.value)
  if (!toChain) return false
  
  const fromSymbol = selectedToken.value.symbol
  const toSymbol = getCrossChainTokenSymbol(fromSymbol, toChain.networkType)
  
  return (fromSymbol === 'KDA' && (toSymbol === 'ETH' || toSymbol === 'WETH')) || 
         ((fromSymbol === 'ETH' || fromSymbol === 'WETH') && toSymbol === 'KDA') ||
         (fromSymbol === 'HBAR' && (toSymbol === 'ETH' || toSymbol === 'WETH')) ||
         ((fromSymbol === 'ETH' || fromSymbol === 'WETH') && toSymbol === 'HBAR')
})

const conversionRateDisplay = computed(() => {
  if (!shouldShowConversionRate.value) return ''
  
  const fromSymbol = selectedToken.value?.symbol || ''
  const toChain = supportedChains.find(c => c.chainId === toChainId.value)
  if (!toChain) return ''
  
  const toSymbol = getCrossChainTokenSymbol(fromSymbol, toChain.networkType)
  
  if (fromSymbol === 'KDA' && (toSymbol === 'ETH' || toSymbol === 'WETH')) {
    return kdaToEthRateDisplay.value
  } else if ((fromSymbol === 'ETH' || fromSymbol === 'WETH') && toSymbol === 'KDA') {
    return ethToKdaRateDisplay.value
  } else if (fromSymbol === 'HBAR' && (toSymbol === 'ETH' || toSymbol === 'WETH')) {
    return hbarToEthRateDisplay.value
  } else if ((fromSymbol === 'ETH' || fromSymbol === 'WETH') && toSymbol === 'HBAR') {
    return ethToHbarRateDisplay.value
  }
  
  return ''
})

// Disabled fee calculations for now
// const totalFeeUSD = computed(() => {
//   if (!currentQuote.value || !tokenPrice.value) return null
//   const feeEth = formatEther(BigInt(currentQuote.value.totalRelayFee.total))
//   return (parseFloat(feeEth) * tokenPrice.value).toFixed(2)
// })

// const capitalFeeUSD = computed(() => {
//   if (!currentQuote.value || !tokenPrice.value) return null
//   const feeEth = formatEther(BigInt(currentQuote.value.capitalFeeTotal))
//   return (parseFloat(feeEth) * tokenPrice.value).toFixed(2)
// })

// const gasFeeUSD = computed(() => {
//   if (!currentQuote.value || !tokenPrice.value) return null
//   const feeEth = formatEther(BigInt(currentQuote.value.relayGasFeeTotal))
//   return (parseFloat(feeEth) * tokenPrice.value).toFixed(2)
// })

// Disabled handleGetQuote for now
// async function handleGetQuote() {
//   // console.log("can get quote", canGetQuote) // Disabled for now

//   try {
//     const rawAmount = typeof amount.value === 'string' ? amount.value : String(amount.value || '')
//     // Handle decimals correctly based on token
//     const tokenDecimals = selectedToken.value?.decimals || 18
//     const amountWei = parseUnits(rawAmount, tokenDecimals).toString()

//     const fromChain = supportedChains.find(c => c.chainId === fromChainId.value)
//     const toChain = supportedChains.find(c => c.chainId === toChainId.value)

//     console.log("from chain ", fromChain)
//     console.log("to chain ", toChain)

//     if (!fromChain || !toChain) {
//       throw new Error('Chain config not found.')
//     }

//     const resolvedFromId = resolveActualChainId(fromChain.networkType)
//     const resolvedToId = resolveActualChainId(toChain.networkType)

//     if (!resolvedFromId || !resolvedToId) {
//       throw new Error('Unable to resolve actual chain IDs')
//     }

//     const fromTokenSymbol = selectedToken.value?.symbol
//     if (!fromTokenSymbol) {
//       throw new Error('No token selected')
//     }

//     // Get the cross-chain token symbol for the destination chain
//     const toTokenSymbol = getCrossChainTokenSymbol(fromTokenSymbol, toChain.networkType)
    
//     const fromToken = fromChain.tokens.find(t => t.symbol === fromTokenSymbol)
//     const toToken = toChain.tokens.find(t => t.symbol === toTokenSymbol)

//     if (!fromToken || !toToken) {
//       throw new Error(`Token swap from ${fromTokenSymbol} to ${toTokenSymbol} not supported.`)
//     }
//     console.log("from token", fromToken.address);
//     console.log("to token", toToken.address);

//     await getQuote({
//       fromChainId: resolvedFromId,
//       toChainId: resolvedToId,
//       fromTokenAddress: fromToken.address as `0x${string}`,
//       toTokenAddress: toToken.address as `0x${string}`,
//       amount: amountWei,
//       recipient: connectedAddress.value as `0x${string}`,
//     })

//   } catch (err) {
//     console.error('Quote error:', err)
//   }
// }


async function handleRawDeposit() {
  if (!selectedToken.value || !walletClient.value || !window.ethereum) return

  // Clear previous states
  executionError.value = null
  successTxHash.value = null

  try {
    const fromChain = supportedChains.find(c => c.chainId === fromChainId.value)
    const toChain = supportedChains.find(c => c.chainId === toChainId.value)
    if (!fromChain || !toChain) throw new Error('Chain config not found.')

    // Disabled quote requirement for now
    // if (!currentQuote.value) {
    //   throw new Error('Please get a quote first before bridging.')
    // }

  const publicClient = getPublicClient(fromChain)
  const wallet = getWalletClient(fromChain, window.ethereum)

  const spokePool = fromChain.spokepoolAddress as `0x${string}`
  // const toSpokePool = toChain.spokepoolAddress
  // Get the correct token addresses for cross-chain swaps
  let tokenFrom: `0x${string}`
  let tokenTo: `0x${string}`
  
  if (selectedToken.value.symbol === 'ETH') {
    // For ETH deposits, use WETH address on the source chain
    const fromWethToken = fromChain.tokens.find(t => t.symbol === 'WETH')
    tokenFrom = (fromWethToken?.address || selectedToken.value.address) as `0x${string}`
  } else {
    tokenFrom = selectedToken.value.address as `0x${string}`
  }
  
  const toTokenSymbol = getCrossChainTokenSymbol(selectedToken.value.symbol, toChain.networkType)
  const toToken = toChain.tokens.find(t => t.symbol === toTokenSymbol)
  tokenTo = (toToken?.address || '0x0000000000000000000000000000000000000000') as `0x${string}`
  
  console.log('Token mapping:')
  console.log('  Selected token symbol:', selectedToken.value.symbol)
  console.log('  Token from address:', tokenFrom)
  console.log('  Destination token symbol:', toTokenSymbol)
  console.log('  Token to address:', tokenTo)
  const recipient = connectedAddress.value

  const sender = await wallet.getAddresses().then(([addr]) => addr)
  const rawAmount = typeof amount.value === 'string' ? amount.value : String(amount.value || '')
  
  // Calculate converted amount for cross-chain swaps (ETH-KDA)
  const fromSymbol = selectedToken.value?.symbol || ''
  const toSymbol = getCrossChainTokenSymbol(fromSymbol, toChain.networkType)
  const convertedAmount = calculateConvertedAmount(rawAmount, fromSymbol, toSymbol)
  
  console.log(`Original amount: ${rawAmount} ${fromSymbol}`)
  console.log(`Converted amount: ${convertedAmount} ${toSymbol}`)
  
  // Handle decimals correctly based on token
  const tokenDecimals = selectedToken.value?.decimals || 18
  const inputAmountInWei = parseUnits(rawAmount, tokenDecimals)
  
  // Calculate output amount with conversion
  const outputToken = toChain.tokens.find(t => t.symbol === toSymbol)
  const outputTokenDecimals = outputToken?.decimals || 18
  const outputAmountInWei = parseUnits(convertedAmount, outputTokenDecimals)
  
  console.log(`Input amount in wei: ${inputAmountInWei}`)
  console.log(`Output amount in wei: ${outputAmountInWei}`)
  // const amountRaw = parseEther(amount.value)
  const chainId = toChain.chainId

  const currentTime = await publicClient.readContract({
    address: spokePool,
    abi: spokePoolAbi,
    functionName: 'getCurrentTime',
  })
  console.log("current time ", currentTime);

  const quoteBuffer = await publicClient.readContract({
    address: spokePool,
    abi: spokePoolAbi,
    functionName: 'depositQuoteTimeBuffer',
  })
  console.log("quote buffer ", quoteBuffer);

  const fillDeadline = BigInt(currentTime as string) + BigInt(quoteBuffer as string)

  // Log transaction parameters
  console.log("=== TRANSACTION PARAMETERS ===")
  console.log("Depositor (sender):", sender)
  console.log("Recipient:", recipient)
  console.log("Input Token (from):", tokenFrom)
  console.log("Output Token (to):", tokenTo)
  console.log("Input Amount (wei):", inputAmountInWei.toString())
  console.log("Output Amount (wei):", outputAmountInWei.toString())
  console.log("Destination Chain ID:", chainId)
  console.log("Quote Timestamp:", currentTime)
  console.log("Fill Deadline:", fillDeadline.toString())
  console.log("Spoke Pool Address:", spokePool)
  // const exclusivityDeadline = BigInt(currentTime as string) + BigInt(300)

  // Only approve if it's not native ETH (ETH doesn't need approval, ERC20 tokens like USDC and WETH do)
  if (selectedToken.value.symbol !== 'ETH') {
    console.log(`Approving ${selectedToken.value.symbol} tokens...`)
    const approveHash = await wallet.writeContract({
      address: getAddress(tokenFrom),
      abi: erc20Abi,
      functionName: 'approve',
      args: [getAddress(spokePool), inputAmountInWei],
      account: getAddress(connectedAddress.value!),
      chain: {
        id: fromChain.chainId,
        name: fromChain.name,
        nativeCurrency: fromChain.nativeCurrency,
        rpcUrls: {
          default: { http: [fromChain.rpcUrl] },
          public: { http: [fromChain.rpcUrl] },
        },
      },
    })
    console.log('Approve TX:', approveHash)
    
    // Wait for approval transaction to be confirmed
    await publicClient.waitForTransactionReceipt({ hash: approveHash })
    console.log('Approval confirmed')
  } else {
    console.log('Skipping approval for native ETH - will wrap to WETH automatically')
  }
  console.log("=== DEPOSIT TRANSACTION DETAILS ===")
  console.log("Sender:", sender);
  console.log("Recipient:", recipient);
  console.log("Token From:", tokenFrom);
  console.log("Token To:", tokenTo);
  console.log("Input Amount (depositing):", inputAmountInWei.toString());
  console.log("Output Amount (minAmount):", outputAmountInWei.toString());
  console.log("Chain ID:", chainId);
  console.log("Current Time:", currentTime);
  console.log("Fill Deadline:", fillDeadline.toString());
  console.log("Spoke Pool:", spokePool)

  // Prepare deposit transaction with ETH value if depositing native ETH
  const depositTxConfig = {
    account: connectedAddress.value as `0x${string}`,
    address: getAddress(spokePool),
    abi: spokePoolAbi,
    functionName: 'depositV3',
    args: [
      sender,
      recipient,
      tokenFrom,
      tokenTo,
      inputAmountInWei, // Still deposit the full input amount
      outputAmountInWei, // Minimum amount should be the output amount (input - fees)
      BigInt(chainId),
      '0x0000000000000000000000000000000000000000', // relayerFeePctRecipient
      BigInt(currentTime as string),
      fillDeadline,
      BigInt(0), // quoteTimestampOverride
      '0x', // message
    ],
    // Add ETH value if depositing native ETH
    ...(selectedToken.value.symbol === 'ETH' ? { value: inputAmountInWei } : {})
  }

  console.log('=== DEPOSIT TRANSACTION CONFIG ===')
  console.log('Transaction config:', depositTxConfig)
  
  // Log the calldata that will be generated
  console.log('=== CALLDATA PARAMETERS ===')
  console.log('Function: depositV3')
  console.log('Arguments:')
  console.log('  [0] depositor:', depositTxConfig.args[0])
  console.log('  [1] recipient:', depositTxConfig.args[1])
  console.log('  [2] inputToken:', depositTxConfig.args[2])
  console.log('  [3] outputToken:', depositTxConfig.args[3])
  console.log('  [4] inputAmount:', depositTxConfig.args[4]?.toString())
  console.log('  [5] outputAmount:', depositTxConfig.args[5]?.toString())
  console.log('  [6] destinationChainId:', depositTxConfig.args[6]?.toString())
  console.log('  [7] exclusiveRelayer:', depositTxConfig.args[7])
  console.log('  [8] quoteTimestamp:', depositTxConfig.args[8]?.toString())
  console.log('  [9] fillDeadline:', depositTxConfig.args[9]?.toString())
  console.log('  [10] exclusivityDeadline:', depositTxConfig.args[10]?.toString())
  console.log('  [11] message:', depositTxConfig.args[11])
  
  // Encode the calldata to see the exact hex data
  try {
    const calldata = encodeFunctionData({
      abi: spokePoolAbi,
      functionName: 'depositV3',
      args: depositTxConfig.args
    })
    console.log('=== ENCODED CALLDATA ===')
    console.log('Calldata (hex):', calldata)
    console.log('Calldata length:', calldata.length)
  } catch (error) {
    console.error('Failed to encode calldata:', error)
  }
  
  const depositHash = await wallet.writeContract({
    ...depositTxConfig,
    chain: {
      id: fromChain.chainId,
      name: fromChain.name,
      nativeCurrency: fromChain.nativeCurrency,
      rpcUrls: {
        default: { http: [fromChain.rpcUrl] },
        public: { http: [fromChain.rpcUrl] },
      },
    },
  })
  console.log('Deposit TX:', depositHash)
  
  // Wait for deposit transaction to be confirmed
  await publicClient.waitForTransactionReceipt({ hash: depositHash })
  console.log('Deposit confirmed')
  
    // Set success transaction hash to show the success alert
    console.log('Setting successTxHash to:', depositHash)
    successTxHash.value = depositHash
    console.log('successTxHash.value is now:', successTxHash.value)
    amount.value = ''
  } catch (err) {
    console.error('Deposit error:', err)
    // executionError.value = err instanceof Error ? err.message : 'Deposit failed'
    executionError.value = 'Deposit failed. Try again!'
  }
}

watch(fromChainId, async (newChainId, oldChainId) => {
  if (isConnected.value && newChainId !== oldChainId) {
    try {
      await switchChain(newChainId)
    } catch (err) {
      console.warn('User rejected chain switch or it failed:', err)
    }
  }
})


async function handleConnectWallet() {
  walletError.value = null

  try {
    if (isConnected.value) {
      disconnectWallet()
      return
    }

    if (providers.value.length > 0) {
      await connectWallet(providers.value[0])
    } else {
      await connectWallet()
    }

    const chain = supportedChains.find(c => c.chainId === fromChainId.value)
    if (!chain) throw new Error('Selected chain config not found')

    const ethereumProvider = (window as any).ethereum
    if (!ethereumProvider) throw new Error('Ethereum provider not found')

    // Create a Viem WalletClient using the custom provider
    const viemWalletClient = createWalletClient({
      chain: mainnet, // or dynamically use chain info
      transport: custom(ethereumProvider)
    })

    await addOrSwitchChain(chain, ethereumProvider)
    walletClient.value = viemWalletClient

  } catch (error) {
    console.error('Failed to connect wallet:', error)

    if (error instanceof Error && error.message.includes('No wallet provider found')) {
      walletError.value = 'Please install a wallet extension like MetaMask to use the bridge.'
    } else {
      walletError.value = 'Failed to connect wallet. Please try again.'
    }
  }
}

// Disabled quote clearing watchers for now
// watch([fromChainId, toChainId, selectedTokenAddress], () => {
//   currentQuote.value = null
//   executionError.value = null
//   successTxHash.value = null
// })

// Separate watcher for amount that doesn't clear success hash
// watch([amount], () => {
//   currentQuote.value = null
//   executionError.value = null
//   // Don't clear successTxHash when amount changes
// })

onMounted(async () => {
  discoverProviders()
  // Try to reconnect wallet on page load
  await reconnectWallet()
  // Fetch ETH, KDA, and HBAR prices for conversion calculations
  await fetchEthKdaAndHbarPrices()
})
function setMaxAmount() {
  amount.value = balance.value
}
</script>

<template>
  <Card class="p-6 space-y-6">
    <div class="flex justify-between items-center mb-2">
      <h2 class="text-xl font-semibold text-gray-900">Bridge Assets</h2>
      <div class="flex items-center gap-2">
        <span v-if="isConnected" class="text-sm text-gray-400">{{ formattedAddress }}</span>
        <!-- <Button
          size="sm"
          variant="outline"
          @click="isConnected ? disconnectWallet() : handleConnectWallet()"
        >
          <template v-if="isConnected">Disconnect</template>
          <template v-else><Wallet class="w-4 h-4 mr-2" /> Connect Wallet</template>
        </Button> -->
        <Button
          size="sm"
          variant="outline"
          @click="handleConnectWallet()"
        >
          <Wallet class="w-4 h-4 mr-2" />
          {{ isConnected ? 'Disconnect' : 'Connect Wallet' }}
        </Button>
      </div>
    </div>

    <Alert v-if="walletError" variant="error">{{ walletError }}</Alert>

    <div v-if="!isConnected" class="text-gray-500 text-center py-12">
      Connect your wallet to start bridging
    </div>

    <div v-else class="space-y-8">
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">Send</label>
          <div class="flex gap-2 items-center w-full">
            <div class="flex flex-[2] items-center rounded-lg bg-white px-2 h-10 min-w-0" :class="hasInsufficientBalance ? 'border border-red-500' : 'border border-gray-300'">
              <input
                v-model="amount"
                type="number"
                placeholder="Enter amount"
                class="flex-1 h-8 bg-transparent text-base text-gray-900 outline-none border-none placeholder-gray-400 min-w-0"
              />
              <span class="flex items-center gap-1 text-gray-500 text-sm ml-2">  {{ Number(balance).toFixed(2) }}
              </span>
              <button type="button" @click="setMaxAmount" class="ml-2 px-2 py-1 rounded border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 flex-shrink-0">MAX</button>
            </div>
            <Select v-model="selectedTokenAddress" :options="tokenOptions" placeholder="Select token" class="flex-1 min-w-0" />
          </div>
          <!-- <div class="text-xs text-gray-500 mt-1">Balance: {{ balance }} {{ selectedToken?.symbol }}</div> -->
          <div class="flex gap-3 flex-wrap">
            <div v-if="estimatedUSDValue" class="text-sm text-gray-400 mt-1">
            {{ estimatedUSDValue }}
            </div>
            
            <!-- Show converted amount for ETH-KDA swaps -->
            <div v-if="shouldShowConversionRate && amount" class="flex items-center gap-1 text-sm text-blue-600 mt-1">
              <span>≈</span>
              <span>{{ calculateConvertedAmount(amount, selectedToken?.symbol || '', destinationTokenSymbol) }}</span>
              <img :src="getTokenLogo(destinationTokenSymbol)" :alt="destinationTokenSymbol" class="w-3 h-3" />
              <span>{{ destinationTokenSymbol }}</span>
            </div>
            
            <div v-if="hasInsufficientBalance" class="text-sm text-red-500 mt-1">
              Insufficient balance to process transfer
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">From Chain</label>
          <Select v-model="fromChainId" :options="fromChainOptions" placeholder="Select source chain" />
        </div>
        

        <div class="flex justify-center">
          <Button size="sm" variant="outline" @click="swapChains">
            <ArrowUpDown class="w-4 h-4" />
          </Button>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">To Chain</label>
          <div class="flex gap-2">
            <Select v-model="toChainId" :options="toChainOptions" placeholder="Select destination chain" class="flex-[2] min-w-0" />
            <div class="flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
              <img v-if="destinationTokenSymbol" :src="getTokenLogo(destinationTokenSymbol)" :alt="destinationTokenSymbol" class="w-4 h-4" />
              {{ destinationTokenSymbol || 'Select token' }}
            </div>
          </div>
          
          <!-- Conversion Rate Display -->
          <div v-if="shouldShowConversionRate" class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-blue-900">Exchange Rate:</span>
              <div class="flex items-center gap-1 text-blue-700 font-mono">
                <img :src="getTokenLogo(selectedToken?.symbol || '')" :alt="selectedToken?.symbol || ''" class="w-3 h-3" />
                <span>{{ conversionRateDisplay }}</span>
                <img :src="getTokenLogo(destinationTokenSymbol)" :alt="destinationTokenSymbol" class="w-3 h-3" />
              </div>
            </div>
            <div class="mt-1 text-xs text-blue-600 flex gap-4 flex-wrap">
              <!-- Show only ETH price -->
              <div v-if="selectedToken?.symbol === 'ETH' || selectedToken?.symbol === 'WETH'" class="flex items-center gap-1">
                <img :src="getTokenLogo('ETH')" alt="ETH" class="w-3 h-3" />
                <span>ETH: ${{ ethPriceUSD?.toFixed(2) || 'Loading...' }}</span>
              </div>
              
              <!-- Show only KDA price when KDA is selected -->
              <div v-if="selectedToken?.symbol === 'KDA'" class="flex items-center gap-1">
                <img :src="getTokenLogo('KDA')" alt="KDA" class="w-3 h-3" />
                <span>KDA: ${{ kdaPriceUSD?.toFixed(4) || 'Loading...' }}</span>
              </div>
              
              <!-- Show only HBAR price when HBAR is selected -->
              <div v-if="selectedToken?.symbol === 'HBAR'" class="flex items-center gap-1">
                <img :src="getTokenLogo('HBAR')" alt="HBAR" class="w-3 h-3" />
                <span>HBAR: ${{ hbarPriceUSD?.toFixed(4) || 'Loading...' }}</span>
              </div>
              
              <!-- Show destination token price -->
              <div v-if="destinationTokenSymbol && destinationTokenSymbol !== selectedToken?.symbol" class="flex items-center gap-1">
                <img :src="getTokenLogo(destinationTokenSymbol)" :alt="destinationTokenSymbol" class="w-3 h-3" />
                <span v-if="destinationTokenSymbol === 'KDA'">KDA: ${{ kdaPriceUSD?.toFixed(4) || 'Loading...' }}</span>
                <span v-else-if="destinationTokenSymbol === 'HBAR'">HBAR: ${{ hbarPriceUSD?.toFixed(4) || 'Loading...' }}</span>
                <span v-else-if="destinationTokenSymbol === 'ETH' || destinationTokenSymbol === 'WETH'">ETH: ${{ ethPriceUSD?.toFixed(2) || 'Loading...' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <!-- <div v-if="currentQuote" class="space-y-2 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-sm font-medium text-gray-900">Quote Details</h3>
          <div class="space-y-1 text-sm text-gray-600">
            <div class="flex justify-between">
              <span>Net fee</span>
              <span v-if="totalFeeUSD !== null">${{ totalFeeUSD }}</span>
            </div>
            
            <div class="flex justify-between">
              <span>Fee Percentage:</span><span>{{ currentQuote.totalRelayFee.pct }}%</span>
              <span>{{ (Number(currentQuote.totalRelayFee.pct) / 1e16).toFixed(2) }}%</span>
            </div>
            <div class="flex justify-between"><span>Estimated Time:</span><span> ~ {{ currentQuote.estimatedFillTimeSec }} secs</span></div>
          </div>
          <Alert v-if="currentQuote.isAmountTooLow" variant="warning">Amount is too low for bridging</Alert>
        </div>
         -->

        <!-- Quote display hidden for now -->
        <!-- <div v-if="currentQuote" class="space-y-2 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between text-sm text-gray-400">
          <span>{{ amount }} {{ tokenSymbol }} ({{ estimatedUSDValue }})</span>
          <span>in ~{{ currentQuote.estimatedFillTimeSec }} secs</span>
        </div>

        <hr class="border-gray-200" />

        <div class="space-y-1 text-sm text-gray-600">
          <div class="flex justify-between font-medium">
            <div class="flex items-center gap-1">
              <span>Net fee</span>
              <div class="relative group">
                <Info class="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                <div
                  class="absolute z-10 hidden w-56 p-2 text-xs text-white bg-gray-800 rounded shadow-lg -top-2 left-6 group-hover:block"
                >
                  Total fee in USD
                </div>
              </div>
            </div>
            <span v-if="totalFeeUSD !== null">${{ totalFeeUSD }}</span>
          </div>

          <div class="pl-3 text-gray-500 space-y-1">
            <div class="flex justify-between">
              <div class="flex items-center gap-1">
                <span>Bridge fee</span>
                <div class="relative group">
                  <Info class="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                  <div
                    class="absolute z-10 hidden w-64 p-2 text-xs text-white bg-gray-800 rounded shadow-lg -top-2 left-6 group-hover:block"
                  >
                    Fee paid to Across Liquidity Providers and Relayers.
                  </div>
                </div>
              </div>
              <span v-if="capitalFeeUSD !== null">${{ capitalFeeUSD }}</span>
            </div>

            <div class="flex justify-between">
              <div class="flex items-center gap-1">
                <span>Destination gas fee</span>
                <div class="relative group">
                  <Info class="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                  <div
                    class="absolute z-10 hidden w-64 p-2 text-xs text-white bg-gray-800 rounded shadow-lg -top-2 left-6 group-hover:block"
                  >
                    Estimated gas fee required to relay the message on destination chain.
                  </div>
                </div>
              </div>
              <span v-if="gasFeeUSD !== null">${{ gasFeeUSD }}</span>
            </div>
          </div>
        </div>
      </div>
      <Alert v-if="currentQuote?.isAmountTooLow" variant="warning">Amount is too low for bridging</Alert> -->
      
      <Alert v-if="isFromChainUnsupported" variant="warning" class="flex items-center gap-2">
        <Info class="w-4 h-4 flex-shrink-0" />
        Bridging from this chain is not currently supported
      </Alert>

      <button
        @click="handleRawDeposit"
        :disabled="isButtonDisabled"
        :class="[
          'w-full h-10 px-4 py-2 rounded-md font-medium transition-colors',
          isButtonDisabled 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
        ]"
      >
        Simulate Bridge Assets
      </button>
      </div>

      <!-- <Alert v-if="quoteError" variant="error">{{ quoteError }}</Alert> -->
      <Alert v-if="executionError" variant="error">{{ executionError }}</Alert>
      <Alert v-if="successTxHash" variant="success" class="!mt-3 p-3 !text-sm">
        Transaction completed
          <a :href="`${getBlockscoutExplorerUrl(supportedChains.find(c => c.chainId === fromChainId) || supportedChains[0])}/tx/${successTxHash}`" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline">
            <ExternalLink class="w-4 h-4 pl-1 pt-0.5" />
            View Transaction
          </a>
      </Alert>
    </div>
  </Card>
</template>
