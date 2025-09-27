import { ethers } from 'ethers';
import 'dotenv/config';

const MAINNET_RPC_URL = "https://e587d30f4ee64ee7877ae88916786263-rpc.network.dev.bloctopus.io";
const PRIVATE_KEY = "660e5f63acf07c86cf8ef448bc68c4b754e16f2c96702acd9f61519a6337ed05";

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is not set in environment variables');
}

const provider = new ethers.JsonRpcProvider(MAINNET_RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract addresses on Ethereum mainnet
const UNISWAP_V3_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC_ADDRESS = '0xA0b86a33E6411a68BFC8b8FAE7B8F50Fde8FC5Ec';

// Pool fee for WETH/USDC pool (0.05%)
const POOL_FEE = 500;

// Uniswap V3 Router ABI (minimal)
const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
];

// WETH ABI (minimal)
const WETH_ABI = [
  'function deposit() public payable',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)'
];

async function swapETHToUSDC(amountInETH: string, minAmountOutUSDC?: string) {
  try {
    console.log(`Starting swap of ${amountInETH} ETH to USDC...`);
    
    // Convert ETH amount to wei
    const amountIn = ethers.parseEther(amountInETH);
    
    // Create contract instances
    const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer);
    const router = new ethers.Contract(UNISWAP_V3_ROUTER_ADDRESS, UNISWAP_V3_ROUTER_ABI, signer);
    
    // Step 1: Wrap ETH to WETH
    console.log('Wrapping ETH to WETH...');
    const wrapTx = await weth.deposit({ value: amountIn });
    console.log(`Wrap transaction hash: ${wrapTx.hash}`);
    await wrapTx.wait();
    console.log('ETH wrapped to WETH successfully');
    
    // Step 2: Approve WETH for Uniswap router
    console.log('Approving WETH for Uniswap router...');
    const approveTx = await weth.approve(UNISWAP_V3_ROUTER_ADDRESS, amountIn);
    console.log(`Approval transaction hash: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('WETH approved for Uniswap router');
    
    // Step 3: Prepare swap parameters
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
    const minAmountOut = minAmountOutUSDC ? ethers.parseUnits(minAmountOutUSDC, 6) : 0; // USDC has 6 decimals
    
    const swapParams = {
      tokenIn: WETH_ADDRESS,
      tokenOut: USDC_ADDRESS,
      fee: POOL_FEE,
      recipient: await signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0
    };
    
    // Step 4: Execute the swap
    console.log('Executing swap on Uniswap V3...');
    const swapTx = await router.exactInputSingle(swapParams);
    console.log(`Swap transaction hash: ${swapTx.hash}`);
    
    const receipt = await swapTx.wait();
    console.log('Swap completed successfully!');
    
    // Parse the swap result from logs (simplified)
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    return {
      success: true,
      transactionHash: swapTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
    
  } catch (error) {
    console.error('Error during swap:', error);
    throw error;
  }
}

// Example usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const ethAmount = args[0] || '0.01'; // Default to 0.01 ETH
  const minUsdcAmount = args[1]; // Optional minimum USDC output
  
  swapETHToUSDC(ethAmount, minUsdcAmount)
    .then((result) => {
      console.log('Swap result:', result);
    })
    .catch((error) => {
      console.error('Swap failed:', error);
      process.exit(1);
    });
}

export { swapETHToUSDC };