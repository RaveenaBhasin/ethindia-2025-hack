// 🔹 Import logos properly for Vite
import ethereumLogo from '../assets/logos/blockchains/ethereum.png'
import arbitrumLogo from '../assets/logos/blockchains/arbitrum.png'
import optimismLogo from '../assets/logos/blockchains/optimism.png'
import polygonLogo from '../assets/logos/blockchains/polygon.png'
import baseLogo from '../assets/logos/blockchains/base.png'
import zksyncLogo from '../assets/logos/blockchains/zksync.png'
import hederaLogo from '../assets/logos/blockchains/hedera.png'
import kadenaLogo from '../assets/logos/blockchains/kadena.png'
import usdcLogo from '../assets/logos/blockchains/usdc.png'
import usdtLogo from '../assets/logos/blockchains/usdt.png'
import uniswapLogo from '../assets/logos/blockchains/uniswap.png'

export interface TokenConfig {
  symbol: string
  name: string
  decimals: number
  address: string
}

export interface ChainConfig {
  chainId: number
  networkType: string
  rpcUrl: string
  spokepoolAddress: string
  name: string
  logo: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  tokens: TokenConfig[]
}

// 🔹 Default logo mapping based on networkType using local assets
const defaultLogos: Record<string, string> = {
  ethereum_mainnet: ethereumLogo,
  ethereum_sepolia: ethereumLogo,
  arbitrum_mainnet: arbitrumLogo,
  optimism_mainnet: optimismLogo,
  polygon_mainnet: polygonLogo,
  base_mainnet: baseLogo,
  zksync_mainnet: zksyncLogo,
  hedera_mainnet: hederaLogo,
  hedera_testnet: hederaLogo,
  kadena_mainnet: kadenaLogo,
  kadena_testnet: kadenaLogo,
}

// 🔹 Token logo mapping based on symbol using local assets
const tokenLogos: Record<string, string> = {
  'ETH': ethereumLogo,
  'WETH': ethereumLogo,
  'USDC': usdcLogo,
  'USDT': usdtLogo,
  'UNI': uniswapLogo,
  'KDA': kadenaLogo,
  'HBAR': hederaLogo,
}

let supportedChains: ChainConfig[] = []

// Default chain configurations including Hedera and Kadena
const defaultChainConfigs = [
  {
    chain_id: 1,
    network_type: 'ethereum_mainnet',
    rpc: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    spokepool_address: '0x4D9079Bb4165aeb4084c526a32695dCfd2F77381',
    name: 'Ethereum',
    native_currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    tokens: [
      { symbol: 'ETH', name: 'Ether', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86a33E6441b8c4C8C0e4b8b2c2D2f2f2f2f2f' }
    ]
  },
  {
    chain_id: 11155111,
    network_type: 'ethereum_sepolia',
    rpc: 'https://eth-sepolia.public.blastapi.io',
    spokepool_address: '0x2e464Fc721F65921E6816c852F59ecb9147DdC9C',
    name: 'Ethereum Sepolia',
    native_currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    tokens: [
      { symbol: 'ETH', name: 'Ether', decimals: 18, address: '0x6b73250CFF2DCE3426D41a45f6f7543C65786d96' },
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x6b73250CFF2DCE3426D41a45f6f7543C65786d96' },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' }
    ]
  },
  {
    chain_id: 42161,
    network_type: 'arbitrum_mainnet',
    rpc: 'https://arb1.arbitrum.io/rpc',
    spokepool_address: '0x4D9079Bb4165aeb4084c526a32695dCfd2F77381',
    name: 'Arbitrum',
    native_currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    tokens: [
      { symbol: 'ETH', name: 'Ether', decimals: 18, address: '0x0000000000000000000000000000000000000000' },
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' }
    ]
  },
  {
    chain_id: 296,
    network_type: 'hedera_testnet',
    rpc: 'https://testnet.hashio.io/api',
    spokepool_address: '0x4D9079Bb4165aeb4084c526a32695dCfd2F77381',
    name: 'Hedera',
    native_currency: { name: 'HBAR', symbol: 'HBAR', decimals: 8 },
    tokens: [
      { symbol: 'HBAR', name: 'Hedera', decimals: 8, address: '0x0000000000000000000000000000000000000000' },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x0000000000000000000000000000000000000000' }
    ]
  },
  {
    chain_id: 5920,
    network_type: 'kadena_testnet',
    rpc: 'https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc',
    spokepool_address: '0x71e6d00Ca5c50Bf9c977D6dE81edc637D399c04f',
    name: 'Kadena',
    native_currency: { name: 'KDA', symbol: 'KDA', decimals: 12 },
    tokens: [
      { symbol: 'KDA', name: 'Kadena', decimals: 12, address: '0x578062540915DE0Cc6C97c53F273fFa828ee7bbE' },
      { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, address: '0x578062540915DE0Cc6C97c53F273fFa828ee7bbE' },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x0000000000000000000000000000000000000000' }
    ]
  }
]

try {
  // Try runtime environment first, fallback to build-time
  const raw = (window as any).ENV?.VITE_SUPPORTED_CHAINS || import.meta.env.VITE_SUPPORTED_CHAINS
  console.log("raw env data", raw);
  const parsed = JSON.parse(raw || JSON.stringify(defaultChainConfigs))

  supportedChains = parsed.map((entry: any) => ({
    chainId: entry.chain_id,
    networkType: entry.network_type,
    rpcUrl: entry.rpc,
    spokepoolAddress: entry.spokepool_address,
    name: entry.name,
    // ✅ Fallback to default logo if not provided
    logo: entry.logo || defaultLogos[entry.network_type] || '',
    nativeCurrency: entry.native_currency,
    tokens: entry.tokens || [],
  }))
  console.log("parsed chains", supportedChains);
} catch (err) {
  console.error('❌ Failed to parse VITE_SUPPORTED_CHAINS:', err)
  // Fallback to default configurations
  supportedChains = defaultChainConfigs.map((entry: any) => ({
    chainId: entry.chain_id,
    networkType: entry.network_type,
    rpcUrl: entry.rpc,
    spokepoolAddress: entry.spokepool_address,
    name: entry.name,
    logo: defaultLogos[entry.network_type] || '',
    nativeCurrency: entry.native_currency,
    tokens: entry.tokens || [],
  }))
}

export { supportedChains }

export function getChainById(id: number): ChainConfig | undefined {
  return supportedChains.find(c => c.chainId === id)
}

export function getTokensByChainId(id: number): TokenConfig[] {
  return getChainById(id)?.tokens || []
}

export function getTokenLogo(symbol: string): string {
  return tokenLogos[symbol] || ''
}

export function extractNetworkId(rpcUrl: string): string | null {
  try {
    console.log("rpc", rpcUrl)
    const url = new URL(rpcUrl)
    console.log("url", url)
    const hostname = url.hostname
    
    // Match pattern: networkId-blockscout.network.dev.bloctopus.io
    const match = hostname.match(/^([a-f0-9]+)-rpc\.network\.dev\.bloctopus\.io$/)
    console.log("match", match);
    return match ? match[1] : null
  } catch (error) {
    console.error('Failed to extract network ID from RPC URL:', rpcUrl, error)
    return null
  }
}

export function getBlockscoutExplorerUrl(chain: ChainConfig): string {
  const networkId = extractNetworkId(chain.rpcUrl)
  console.log("network id: ", networkId);
  return `https://${networkId}-blockscout.network.dev.bloctopus.io`
}

const actualMainnetChainIds: Record<string, number> = {
  ethereum_mainnet: 1,
  ethereum_sepolia: 1, // Use mainnet chain ID for quotes
  arbitrum_mainnet: 42161,
  optimism_mainnet: 10,
  polygon_mainnet: 137,
  base_mainnet: 8453,
  zksync_mainnet: 324,
  hedera_mainnet: 295,
  hedera_testnet: 295, // Use mainnet chain ID for quotes
  kadena_mainnet: 2222,
  kadena_testnet: 2222, // Use mainnet chain ID for quotes
}

export function resolveActualChainId(networkType: string): number {
  const id = actualMainnetChainIds[networkType]
  if (!id) {
    throw new Error(`No mainnet chain ID mapped for networkType: ${networkType}`)
  }
  return id
}

// Token mapping for cross-chain swaps
const crossChainTokenMapping: Record<string, Record<string, string>> = {
  'KDA': {
    'ethereum_mainnet': 'WETH',
    'ethereum_sepolia': 'WETH',
    'arbitrum_mainnet': 'WETH',
    'optimism_mainnet': 'WETH',
    'polygon_mainnet': 'WETH',
    'base_mainnet': 'WETH',
  },
  'HBAR': {
    'ethereum_mainnet': 'ETH',
    'ethereum_sepolia': 'ETH',
    'arbitrum_mainnet': 'ETH',
    'optimism_mainnet': 'ETH',
    'polygon_mainnet': 'ETH',
    'base_mainnet': 'ETH',
  },
  'ETH': {
    'kadena_testnet': 'KDA',
    'kadena_mainnet': 'KDA',
    'hedera_testnet': 'HBAR',
    'hedera_mainnet': 'HBAR',
  },
  'WETH': {
    'kadena_testnet': 'KDA',
    'kadena_mainnet': 'KDA',
    'hedera_testnet': 'HBAR',
    'hedera_mainnet': 'HBAR',
  }
}

export function getCrossChainTokenSymbol(fromSymbol: string, toNetworkType: string): string {
  return crossChainTokenMapping[fromSymbol]?.[toNetworkType] || fromSymbol
}