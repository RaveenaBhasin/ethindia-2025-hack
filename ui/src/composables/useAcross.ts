// import { ref } from 'vue'
// import { createAcrossClient } from '@across-protocol/app-sdk'
// import { mainnet, optimism, arbitrum } from 'viem/chains'

// interface QuoteParams {
//   fromChainId: number
//   toChainId: number
//   tokenAddress: `0x${string}`
//   amount: string
//   recipient: `0x${string}`
// }

// interface Quote {
//   totalRelayFee: {
//     total: string
//     pct: string
//   }
//   timestamp: string
//   isAmountTooLow: boolean
//   exclusiveRelayer?: `0x${string}`
//   exclusivityDeadline?: number
//   estimatedFillTimeSec: number
//   deposit: any
// }

// const isLoading = ref(false)
// const error = ref<string | null>(null)
// const currentQuote = ref<Quote | null>(null)
// let acrossClient: any = null

// export function useAcross() {
//   const initializeClient = async () => {
//     if (!acrossClient) {
//       acrossClient = createAcrossClient({
//         integratorId: '0xdead',
//         chains: [mainnet, optimism, arbitrum],
//       })
//     }
//     return acrossClient
//   }

//   const getQuote = async (params: QuoteParams): Promise<Quote | null> => {
//     isLoading.value = true
//     error.value = null

//     try {
//       const client = await initializeClient()
      
//       const route = {
//         originChainId: params.fromChainId,
//         destinationChainId: params.toChainId,
//         inputToken: params.tokenAddress,
//         outputToken: params.tokenAddress,
//       }
//       console.log('route:', route)

//       const result = await client.getQuote({
//         route,
//         inputAmount: params.amount,
//       })

//       const quote: Quote = {
//         totalRelayFee: {
//           total: result.totalRelayFee.total.toString(),
//           pct: result.totalRelayFee.pct.toString(),
//         },
//         isAmountTooLow: result.isAmountTooLow || false,
//         estimatedFillTimeSec: result.estimatedFillTimeSec || 300,
//         exclusiveRelayer: result.exclusiveRelayer as `0x${string}` | undefined,
//         exclusivityDeadline: result.exclusivityDeadline,
//         timestamp: result.timestamp?.toString() || Date.now().toString(),
//         deposit: result.deposit,
//       }

//       currentQuote.value = quote
//       return quote

//     } catch (err) {
//       console.error('Failed to get quote:', err)
//       error.value = err instanceof Error ? err.message : 'Failed to get quote'
//       return null
//     } finally {
//       isLoading.value = false
//     }
//   }

//   const executeDeposit = async (
//     deposit: any,
//     walletClient: any
//   ) => {
//     isLoading.value = true
//     error.value = null

//     try {
//       const client = await initializeClient()
      
//       const result = await client.executeQuote({
//         walletClient,
//         deposit,
//         onProgress: (progress: any) => {
//           console.log('Bridge progress:', progress)
//         }
//       })

//       return result.hash || 'Transaction submitted'

//     } catch (err) {
//       console.error('Failed to execute deposit:', err)
//       error.value = err instanceof Error ? err.message : 'Failed to execute deposit'
//       throw err
//     } finally {
//       isLoading.value = false
//     }
//   }

//   return {
//     isLoading,
//     error,
//     currentQuote,
//     getQuote,
//     executeDeposit,
//   }
// }
import { ref } from 'vue'
import { createAcrossClient } from '@across-protocol/app-sdk'
import { mainnet, optimism, arbitrum } from 'viem/chains'
import { getAddress } from 'viem'

interface QuoteParams {
  fromChainId: number
  toChainId: number
  fromTokenAddress: `0x${string}`
  toTokenAddress: `0x${string}`
  amount: string
  recipient: `0x${string}`
}

// interface Quote {
//   totalRelayFee: {
//     total: string
//     pct: string
//   }
//   timestamp: string
//   isAmountTooLow: boolean
//   exclusiveRelayer?: `0x${string}`
//   exclusivityDeadline?: number
//   estimatedFillTimeSec: number
//   deposit: any
// }
// interface Quote {
//   totalRelayFee: { total: string; pct: string };
//   timestamp: string;
//   isAmountTooLow: boolean;
//   exclusiveRelayer?: `0x${string}`;
//   exclusivityDeadline?: number;
//   estimatedFillTimeSec: number;
//   deposit: any;
//   capitalFeePct?: string;
//   capitalFeeTotal?: string;
//   relayGasFeePct?: string;
//   relayGasFeeTotal?: string;
//   outputAmount?: string;
//   fillDeadline?: string;
//   lpFee?: { total: string; pct: string };
//   outputToken?: { address: string; symbol: string; decimals: number; chainId: number };
//   inputToken?: { address: string; symbol: string; decimals: number; chainId: number };
//   spokePoolAddress?: string;
//   destinationSpokePoolAddress?: string;
// }
interface Quote {
  totalRelayFee: {
    total: string
    pct: string
  }
  timestamp: string
  isAmountTooLow: boolean
  estimatedFillTimeSec: number
  deposit: any

  // New flattened fields
  capitalFeePct: string
  capitalFeeTotal: string
  relayGasFeePct: string
  relayGasFeeTotal: string
  lpFeePct: string
  lpFeeTotal: string
  fillDeadline: number
  destinationSpokePoolAddress: string
  spokePoolAddress: string
  inputToken: string
  outputToken: string
  outputAmount: string
  recipient?: `0x${string}`
  exclusiveRelayer?: `0x${string}`
  exclusivityDeadline?: number
}

const isLoading = ref(false)
const error = ref<string | null>(null)
const currentQuote = ref<Quote | null>(null)
let acrossClient: any = null

export function useAcross() {
  const initializeClient = async () => {
    if (!acrossClient) {
      acrossClient = createAcrossClient({
        integratorId: '0xdead',
        chains: [mainnet, optimism, arbitrum],
      })
    }
    return acrossClient
  }

  const getQuote = async (params: QuoteParams): Promise<Quote | null> => {
    isLoading.value = true
    error.value = null

    try {
      const client = await initializeClient();

      const result = await client.getQuote({
        route: {
          originChainId: params.fromChainId,
          destinationChainId: params.toChainId,
          inputToken: getAddress(params.fromTokenAddress),
          outputToken: getAddress(params.toTokenAddress),
        },
        inputAmount: params.amount,
      });
      console.log("quote result: ", result);
      
    const deposit = result.deposit || {}
    const fees = result.fees || {}

    const quote: Quote = {
      totalRelayFee: {
        total: fees?.totalRelayFee?.total?.toString() ?? '0',
        pct: fees?.totalRelayFee?.pct?.toString() ?? '0',
      },
      capitalFeeTotal: fees?.relayerCapitalFee?.total?.toString() ?? '0',
      capitalFeePct: fees?.relayerCapitalFee?.pct?.toString() ?? '0',
      relayGasFeeTotal: fees?.relayerGasFee?.total?.toString() ?? '0',
      relayGasFeePct: fees?.relayerGasFee?.pct?.toString() ?? '0',
      lpFeeTotal: fees?.lpFee?.total?.toString() ?? '0',
      lpFeePct: fees?.lpFee?.pct?.toString() ?? '0',

      isAmountTooLow: result.isAmountTooLow || false,
      estimatedFillTimeSec: result.estimatedFillTimeSec || 300,
      timestamp: result.timestamp?.toString() || Date.now().toString(),

      // From deposit
      fillDeadline: deposit.fillDeadline,
      destinationSpokePoolAddress: deposit.destinationSpokePoolAddress,
      spokePoolAddress: deposit.spokePoolAddress,
      inputToken: deposit.inputToken,
      outputToken: deposit.outputToken,
      outputAmount: deposit.outputAmount?.toString() || '0',
      recipient: deposit.recipient,
      exclusiveRelayer: deposit.exclusiveRelayer,
      exclusivityDeadline: deposit.exclusivityDeadline,

      deposit: result.deposit, // optional: full payload for writeContract
    }

      

      currentQuote.value = quote
      console.log("current quote", currentQuote.value);
      return quote

    } catch (err) {
      console.error('Failed to get quote:', err)
      error.value = err instanceof Error ? err.message : 'Failed to get quote'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const executeDeposit = async (
    deposit: any,
    walletClient: any
  ) => {
    isLoading.value = true
    error.value = null

    try {
      const client = await initializeClient()

      const result = await client.executeQuote({
        walletClient,
        deposit,
        onProgress: (progress: any) => {
          console.log('Bridge progress:', progress)
        }
      })

      return result.hash || 'Transaction submitted'

    } catch (err) {
      console.error('Failed to execute deposit:', err)
      error.value = err instanceof Error ? err.message : 'Failed to execute deposit'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    currentQuote,
    getQuote,
    executeDeposit,
  }
}