import { ethers } from 'ethers';
import { getAddress } from 'ethers';
import 'dotenv/config';

// const ARBITRUM_RPC_URL = "https://ba1a5256c96346cd8a70e4c69c157d90-rpc.network.dev.bloctopus.io";
const BASE_RPC = "https://969c283710464a2ebc0d5d2f55811b83-rpc.network.dev.bloctopus.io";
const PRIVATE_KEY = "0x27816b667cf972e25802edd470c09b2c13fbd152c9371117e2b5c29fdf0f30c3";

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is not set in environment variables');
}

const provider = new ethers.JsonRpcProvider(BASE_RPC);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract addresses on Arbitrum
const UNISWAP_V2_ROUTER_ADDRESS = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';
// const UNISWAP_V2_ROUTER_ADDRESS = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';

const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Native USDC on Arbitrum

// Uniswap V2 Router ABI (minimal)
const UNISWAP_V2_ROUTER_ABI = [
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
  'function factory() external pure returns (address)'
];

// Uniswap V2 Factory ABI (minimal)
const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

// Uniswap V2 Pair ABI (minimal)
const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

// WETH ABI (minimal)
const WETH_ABI = [
  'function deposit() public payable',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function transfer(address to, uint256 amount) public returns (bool)'
];

// USDC ABI (additional functions for debugging)
const USDC_ABI_EXTRA = [
  'function isBlacklisted(address) view returns (bool)',
  'function paused() view returns (bool)',
  'function balanceOf(address) view returns (uint256)'
];

async function swapETHToUSDC(amountInETH: string, minAmountOutUSDC?: string) {
  try {
    console.log(`Starting swap of ${amountInETH} ETH to USDC on Arbitrum...`);
    
    // Convert ETH amount to wei
    const amountIn = ethers.parseEther(amountInETH);
    
    // Check ETH balance first
    const ethBalance = await provider.getBalance(await signer.getAddress());
    console.log(`ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Reserve some ETH for gas fees (rough estimate: 0.01 ETH for all transactions)
    const gasReserve = ethers.parseEther('0.01');
    const requiredEth = amountIn + gasReserve;
    
    if (ethBalance < requiredEth) {
      throw new Error(`Insufficient ETH balance. Have: ${ethers.formatEther(ethBalance)}, Need: ${ethers.formatEther(requiredEth)} (including gas)`);
    }
    
    // Create contract instances
    const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer);
    const router = new ethers.Contract(UNISWAP_V2_ROUTER_ADDRESS, UNISWAP_V2_ROUTER_ABI, signer);
    
    // Check initial WETH balance
    const initialWethBalance = await weth.balanceOf(await signer.getAddress());
    console.log(`Initial WETH balance: ${ethers.formatEther(initialWethBalance)} WETH`);
    
    // Step 1: Wrap ETH to WETH
    console.log(`Wrapping ${ethers.formatEther(amountIn)} ETH to WETH...`);
    const wrapTx = await weth.deposit({ value: amountIn });
    console.log(`Wrap transaction hash: ${wrapTx.hash}`);
    const wrapReceipt = await wrapTx.wait();
    console.log(`ETH wrapped to WETH successfully. Gas used: ${wrapReceipt.gasUsed}`);
    
    // Step 2: Check WETH balance
    const wethBalance = await weth.balanceOf(await signer.getAddress());
    console.log(`WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
    
    if (wethBalance < amountIn) {
      throw new Error(`Insufficient WETH balance. Have: ${ethers.formatEther(wethBalance)}, Need: ${ethers.formatEther(amountIn)}`);
    }
    
    // Step 3: Approve WETH for Uniswap router
    console.log(`Approving WETH for Uniswap router...`);
    const approveTx = await weth.approve(UNISWAP_V2_ROUTER_ADDRESS, amountIn);
    console.log(`Approval transaction hash: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('WETH approved for Uniswap router');
    
    // Verify approval
    const allowance = await weth.allowance(await signer.getAddress(), UNISWAP_V2_ROUTER_ADDRESS);
    console.log(`Router allowance: ${ethers.formatEther(allowance)} WETH`);
    
    if (allowance < amountIn) {
      throw new Error(`Approval failed. Allowance: ${ethers.formatEther(allowance)}, Need: ${ethers.formatEther(amountIn)}`);
    }
    
    // Step 4: Prepare swap parameters
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
    const minAmountOut = minAmountOutUSDC ? ethers.parseUnits(minAmountOutUSDC, 6) : 0; // USDC has 6 decimals
    
    // Define the path for the swap: WETH -> USDC
    const path = [getAddress(WETH_ADDRESS), getAddress(USDC_ADDRESS)];
    
    // Check if WETH/USDC pair exists and has liquidity
    const factoryAddress = await router.factory();
    const factory = new ethers.Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, provider);
    const pairAddress = await factory.getPair(WETH_ADDRESS, USDC_ADDRESS);
    
    console.log(`Factory address: ${factoryAddress}`);
    console.log(`WETH/USDC pair address: ${pairAddress}`);
    
    if (pairAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('WETH/USDC pair does not exist on Uniswap V2');
    }
    
    // Check pair liquidity
    const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    
    console.log(`Token0: ${token0}, Token1: ${token1}`);
    console.log(`Reserve0: ${reserves.reserve0}, Reserve1: ${reserves.reserve1}`);
    
    if (reserves.reserve0 === 0n || reserves.reserve1 === 0n) {
      throw new Error('WETH/USDC pair has no liquidity');
    }
    
    // Get expected amounts out to ensure we have realistic minimum
    let expectedAmountOut: bigint;
    try {
      const amounts = await router.getAmountsOut(amountIn, path);
      expectedAmountOut = amounts[1];
      console.log(`Expected USDC output: ${ethers.formatUnits(expectedAmountOut, 6)} USDC`);
    } catch (error) {
      console.error('Failed to get amounts out:', error);
      throw new Error('Cannot get swap quote - likely insufficient liquidity');
    }
    
    // Use the provided minimum or 95% of expected amount (5% slippage tolerance)
    const finalMinAmountOut = minAmountOut > 0 ? minAmountOut : expectedAmountOut * 95n / 100n;
    
    // Step 5: Final checks before swap
    console.log('Executing swap on Uniswap V2...');
    
    // Double-check WETH balance and allowance right before swap
    const finalWethBalance = await weth.balanceOf(await signer.getAddress());
    const finalAllowance = await weth.allowance(await signer.getAddress(), UNISWAP_V2_ROUTER_ADDRESS);
    
    console.log(`Final WETH balance: ${ethers.formatEther(finalWethBalance)} WETH`);
    console.log(`Final router allowance: ${ethers.formatEther(finalAllowance)} WETH`);
    
    if (finalWethBalance < amountIn) {
      throw new Error(`Insufficient WETH balance for swap. Have: ${ethers.formatEther(finalWethBalance)}, Need: ${ethers.formatEther(amountIn)}`);
    }
    
    if (finalAllowance < amountIn) {
      throw new Error(`Insufficient allowance for swap. Have: ${ethers.formatEther(finalAllowance)}, Need: ${ethers.formatEther(amountIn)}`);
    }
    
    // Test if we can even transfer WETH to the router (simulate what Uniswap does)
    console.log('Testing WETH transfer to router...');
    try {
      await weth.transfer.estimateGas(UNISWAP_V2_ROUTER_ADDRESS, amountIn);
      console.log('WETH transfer gas estimation successful');
    } catch (transferError) {
      console.error('WETH transfer would fail:', transferError);
      throw new Error(`Cannot transfer WETH to router: ${transferError.message || transferError}`);
    }
    
    // Check USDC status and balances
    console.log('Checking USDC contract status...');
    const usdc = new ethers.Contract(USDC_ADDRESS, [...WETH_ABI, ...USDC_ABI_EXTRA], provider);
    
    const pairUsdcBal = await usdc.balanceOf(pairAddress);
    console.log('USDC balance of pair:', pairUsdcBal.toString());
    
    console.log(`Swap parameters:`);
    console.log(`  AmountIn: ${ethers.formatEther(amountIn)} WETH`);
    console.log(`  MinAmountOut: ${ethers.formatUnits(finalMinAmountOut, 6)} USDC`);
    console.log(`  Path: [${path.join(', ')}]`);
    console.log(`  To: ${await signer.getAddress()}`);
    console.log(`  Deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`);
    
    // Estimate gas first
    try {
      const gasEstimate = await router.swapExactTokensForTokens.estimateGas(
        amountIn,
        finalMinAmountOut,
        path,
        await signer.getAddress(),
        deadline
      );
      console.log(`Estimated gas: ${gasEstimate}`);
    } catch (gasError) {
      console.error('Gas estimation failed:', gasError);
      throw new Error(`Swap would fail. Gas estimation error: ${gasError.message || gasError}`);
    }
    
    const swapTx = await router.swapExactTokensForTokens(
      amountIn,
      finalMinAmountOut,
      path,
      await signer.getAddress(),
      deadline
    );
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
const ethAmount = '2'; // Default to 0.01 ETH
const minUsdcAmount = '0'; // Optional minimum USDC output

swapETHToUSDC(ethAmount, minUsdcAmount)
  .then((result) => {
    console.log('Swap result:', result);
  })
  .catch((error) => {
    console.error('Swap failed:', error);
    process.exit(1);
  });

// export { swapETHToUSDC };