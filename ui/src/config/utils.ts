export async function fetchTokenPriceUSD(tokenId: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
      )
      const data = await response.json()
      return data[tokenId]?.usd || null
    } catch (err) {
      console.error('Failed to fetch token price from CoinGecko:', err)
      return null
    }
  }