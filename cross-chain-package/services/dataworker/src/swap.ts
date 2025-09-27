import { ethers } from 'ethers';
import 'dotenv/config';

const rpc = process.env.RPC_URL || "https://cf48a80c442840c4a8ee3d4c9fd8771a-rpc.network.bloctopus.io";
const privateKey = process.env.PRIVATE_KEY;
const relayerPrivateKey = "27816b667cf972e25802edd470c09b2c13fbd152c9371117e2b5c29fdf0f30c3";
const arbRpc = process.env.ARB_RPC_URL || "https://3f3ddeba4c274a6495d82e914806b0be-rpc.network.bloctopus.io";

if (!privateKey) {
  throw new Error('RELAYER_PRIVATE_KEY is not set in environment variables');
}

const provider = new ethers.JsonRpcProvider(arbRpc);
const signer = new ethers.Wallet(relayerPrivateKey, provider);

const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

const WETH_ABI = [
  'function deposit() public payable',
];

async function wrapETH(amountInETH: string) {
  const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer);
  const tx = await weth.deposit({ value: ethers.parseEther(amountInETH) });
  console.log(`Deposited. Tx Hash: ${tx.hash}`);
  await tx.wait();
  console.log('Wrap complete!');
}

wrapETH('0.01').catch(console.error);
