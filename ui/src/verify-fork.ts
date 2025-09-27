// verify-fork.ts
import { ethers } from "ethers";

const RPC = "https://e587d30f4ee64ee7877ae88916786263-rpc.network.dev.bloctopus.io";
const provider = new ethers.JsonRpcProvider(RPC);

const USDC  = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH  = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const PAIR  = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc"; // Uniswap V2 USDC/WETH

const ERC20 = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];
const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112,uint112,uint32)"
];

async function main() {
  const usdc = new ethers.Contract(USDC, ERC20, provider);
  const weth = new ethers.Contract(WETH, ERC20, provider);
  const pair = new ethers.Contract(PAIR, PAIR_ABI, provider);

  const [codeUSDC, codePair] = await Promise.all([
    provider.getCode(USDC),
    provider.getCode(PAIR)
  ]);
  console.log("USDC code size:", codeUSDC.length, "| Pair code size:", codePair.length);

  const [token0, token1] = await Promise.all([pair.token0(), pair.token1()]);
  const [r0, r1] = (await pair.getReserves()).slice(0,2) as [bigint,bigint];

  const [usdcBalPair, wethBalPair] = await Promise.all([
    usdc.balanceOf(PAIR),
    weth.balanceOf(PAIR),
  ]);

  const [usdcDec, wethDec] = await Promise.all([usdc.decimals(), weth.decimals()]);
  console.log("token0:", token0, "token1:", token1);
  console.log("reserves:", r0.toString(), r1.toString());
  console.log("USDC.balanceOf(pair):", usdcBalPair.toString());
  console.log("WETH.balanceOf(pair):", wethBalPair.toString());
  console.log("decimals USDC/WETH:", usdcDec, wethDec);

  // Simple consistency check
  if (token0.toLowerCase() === USDC.toLowerCase()) {
    console.log("Expect USDC.balanceOf(pair) ≈ reserve0, WETH.balanceOf(pair) ≈ reserve1");
  } else {
    console.log("Expect USDC.balanceOf(pair) ≈ reserve1, WETH.balanceOf(pair) ≈ reserve0");
  }
}

main().catch(console.error);