// clients.ts
import { createPublicClient, createWalletClient, http, custom } from 'viem'
import { ChainConfig } from '@/config/chainConfig'

export function getPublicClient(chain: ChainConfig) {
  return createPublicClient({
    transport: http(chain.rpcUrl),
  })
}

export function getWalletClient(chain: ChainConfig, ethereum: any) {
  return createWalletClient({
    chain: {
      id: chain.chainId,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: { http: [chain.rpcUrl] },
        public: { http: [chain.rpcUrl] },
      },
    },
    transport: custom(ethereum),
  })
}