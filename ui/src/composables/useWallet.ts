import { ref, computed } from 'vue'
import { createWalletClient, custom, type WalletClient } from 'viem'
import { mainnet } from 'viem/chains'
import { ChainConfig } from '@/config/chainConfig'


interface EIP6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: any
}

const isConnected = ref(false)
const connectedAddress = ref<string>('')
const walletClient = ref<WalletClient | null>(null)
const providers = ref<EIP6963ProviderDetail[]>([])

// Storage helpers for wallet persistence
const getStoredWalletState = () => {
  try {
    const stored = localStorage.getItem('walletState')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const setStoredWalletState = (address: string) => {
  try {
    localStorage.setItem('walletState', JSON.stringify({ address, isConnected: true }))
  } catch {
    // Handle localStorage errors gracefully
  }
}

const clearStoredWalletState = () => {
  try {
    localStorage.removeItem('walletState')
  } catch {
    // Handle localStorage errors gracefully
  }
}

export function useWallet() {
  const discoverProviders = () => {
    const discoveredProviders: EIP6963ProviderDetail[] = []
    
    window.addEventListener('eip6963:announceProvider', (event: any) => {
      discoveredProviders.push(event.detail)
      providers.value = [...discoveredProviders]
    })

    window.dispatchEvent(new Event('eip6963:requestProvider'))
    
    setTimeout(() => {
      if (discoveredProviders.length === 0 && (window as any).ethereum) {
        discoveredProviders.push({
          info: {
            uuid: 'injected',
            name: 'Injected Wallet',
            icon: '',
            rdns: 'injected'
          },
          provider: (window as any).ethereum
        })
        providers.value = [...discoveredProviders]
      }
    }, 100)
  }

  const connectWallet = async (providerDetail?: EIP6963ProviderDetail) => {
    try {
      const provider = providerDetail?.provider || (window as any).ethereum
      
      if (!provider) {
        throw new Error('No wallet provider found')
      }

      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const client = createWalletClient({
        chain: mainnet,
        transport: custom(provider),
      })

      walletClient.value = client
      connectedAddress.value = accounts[0]
      isConnected.value = true
      
      // Store wallet state for persistence
      setStoredWalletState(accounts[0])

      provider.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          connectedAddress.value = accounts[0]
        }
      })

      provider.on('chainChanged', (chainId: string) => {
        console.log('Chain changed to:', chainId)
        // Keep wallet connected - just update the chain in the client
        if (walletClient.value) {
          const newChainId = parseInt(chainId, 16)
          walletClient.value = createWalletClient({
            chain: { id: newChainId, name: 'Custom Chain', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [''] } } },
            transport: custom(provider),
          })
        }
      })

    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    }
  }

  const disconnectWallet = () => {
    isConnected.value = false
    connectedAddress.value = ''
    walletClient.value = null
    clearStoredWalletState()
  }

  const switchChain = async (chainId: number) => {
    if (!walletClient.value) return

    try {
      await walletClient.value.switchChain({ id: chainId })
    } catch (error) {
      console.error('Failed to switch chain:', error)
      throw error
    }
  }

  async function addOrSwitchChain(chain: ChainConfig, walletProvider: any) {
  const chainIdHex = '0x' + chain.chainId.toString(16)
  console.log("chain id hex: ", chain);

  try {
    // Try to switch first
    await walletProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    })
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      // Chain not found, attempt to add it
      try {
        await walletProvider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: chain.name,
            rpcUrls: [chain.rpcUrl],
            nativeCurrency: chain.nativeCurrency,
            blockExplorerUrls: [`https://etherscan.io`], // Customize if needed
          }]
        })

        // Retry switch after adding
        await walletProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        })
      } catch (addError) {
        console.error('Failed to add chain to wallet:', addError)
        throw addError
      }
    } else {
      console.error('Switch chain failed:', switchError)
      throw switchError
    }
  }
}

  const reconnectWallet = async () => {
    const storedState = getStoredWalletState()
    if (!storedState || !storedState.address) return false

    try {
      const provider = (window as any).ethereum
      if (!provider) return false

      // Check if the wallet is still connected to the stored address
      const accounts = await provider.request({ method: 'eth_accounts' })
      
      if (accounts.includes(storedState.address)) {
        const client = createWalletClient({
          chain: mainnet,
          transport: custom(provider),
        })

        walletClient.value = client
        connectedAddress.value = storedState.address
        isConnected.value = true

        // Re-setup event listeners
        provider.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length === 0) {
            disconnectWallet()
          } else {
            connectedAddress.value = accounts[0]
            setStoredWalletState(accounts[0])
          }
        })

        provider.on('chainChanged', (chainId: string) => {
          console.log('Chain changed to:', chainId)
          if (walletClient.value) {
            const newChainId = parseInt(chainId, 16)
            walletClient.value = createWalletClient({
              chain: { id: newChainId, name: 'Custom Chain', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [''] } } },
              transport: custom(provider),
            })
          }
        })

        return true
      } else {
        clearStoredWalletState()
        return false
      }
    } catch (error) {
      console.error('Failed to reconnect wallet:', error)
      clearStoredWalletState()
      return false
    }
  }

  const formattedAddress = computed(() => {
    if (!connectedAddress.value) return ''
    return `${connectedAddress.value.slice(0, 6)}...${connectedAddress.value.slice(-4)}`
  })

  return {
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
  }
}
