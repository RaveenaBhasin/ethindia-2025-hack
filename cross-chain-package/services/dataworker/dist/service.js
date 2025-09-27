"use strict";
// import { ethers } from 'ethers';
// import { createClient, RedisClientType} from 'redis';
// import { MerkleTree } from 'merkletreejs';
// import 'dotenv/config'; 
Object.defineProperty(exports, "__esModule", { value: true });
// interface DataWorkerConfig {
//   hubPool: { rpc: string; privateKey: string; address: string };
//   chainA: { rpc: string; spokePoolAddress: string; chainId: number };
//   chainB: { rpc: string; spokePoolAddress: string; chainId: number };
//   redisUrl: string;
//   pollingInterval?: number; // Add polling interval config
//   blockRange?: number;
// }
// class AcrossDataWorker {
//   private hubPoolProvider: ethers.JsonRpcProvider;
//   private hubPoolWallet: ethers.Wallet;
//   private hubPool: ethers.Contract;
//   private providerA: ethers.JsonRpcProvider;
//   private providerB: ethers.JsonRpcProvider;
//   private spokePoolA: ethers.Contract;
//   private spokePoolB: ethers.Contract;
//   private redis: RedisClientType;
//   private relayData: any[] = [];
//   private pollingInterval: number;
//   private lastProcessedBlockA: number = 0;
//   private lastProcessedBlockB: number = 0;
//   private isRunning: boolean = false;
//   private blockRange: number;
//   constructor(config: DataWorkerConfig) {
//     this.hubPoolProvider = new ethers.JsonRpcProvider(config.hubPool.rpc);
//     this.hubPoolWallet = new ethers.Wallet(config.hubPool.privateKey, this.hubPoolProvider);
//     const hubPoolAbi = [
//       // "function proposeRootBundle(uint256[] memory bundleEvaluationBlockNumbers, uint8 poolRebalanceLeafCount, bytes32 poolRebalanceRoot, bytes32 relayerRefundRoot, bytes32 slowRelayRoot) external"
//       "function proposeRootBundle(uint256[] calldata bundleEvaluationBlockNumbers, uint8 poolRebalanceLeafCount, bytes32 poolRebalanceRoot, bytes32 relayerRefundRoot, bytes32 slowRelayRoot)"
//     ];
//     this.hubPool = new ethers.Contract(config.hubPool.address, hubPoolAbi, this.hubPoolWallet);
//     this.providerA = new ethers.JsonRpcProvider(config.chainA.rpc);
//     this.providerB = new ethers.JsonRpcProvider(config.chainB.rpc);
//     const spokePoolAbi = [
//       "event FilledRelay(bytes32 indexed inputToken, bytes32 indexed outputToken, uint256 inputAmount, uint256 outputAmount, uint256 repaymentChainId, uint256 indexed originChainId, uint256 indexed depositId, uint32 fillDeadline, uint32 exclusivityDeadline, bytes32 exclusiveRelayer, bytes32 indexed relayer, bytes32 depositor, bytes32 recipient, bytes32 messageHash, tuple(bytes32 updatedRecipient, bytes32 updatedMessageHash,uint256 updatedOutputAmount, uint8 fillType) relayExecutionInfo)"
//     ];
//     this.spokePoolA = new ethers.Contract(config.chainA.spokePoolAddress, spokePoolAbi, this.providerA);
//     this.spokePoolB = new ethers.Contract(config.chainB.spokePoolAddress, spokePoolAbi, this.providerB);
//     this.redis = createClient({ url: config.redisUrl });
//     this.pollingInterval = config.pollingInterval || 15000; // Default 15 seconds
//     this.blockRange = 100;
//   }
//   async start() {
//     await this.redis.connect();
//     console.log('DataWorker service started');
//     // Initialize last processed blocks
//     this.lastProcessedBlockA = await this.providerA.getBlockNumber()-100; // Start from 100 blocks ago
//     this.lastProcessedBlockB = await this.providerB.getBlockNumber()-100;
//     this.isRunning = true;
//     // Start polling for events instead of using event listeners
//     this.startPolling();
//     // await this.redis.subscribe('relay-fulfilled', this.processRelayData.bind(this));
//   }
//   private async startPolling() {
//     const pollChainA = async () => {
//       if (!this.isRunning) return;
//       try {
//         await this.pollForEvents('A', this.spokePoolA, this.providerA);
//       } catch (error) {
//         console.error('❌ Error polling chain A:', error);
//       }
//       if (this.isRunning) {
//         setTimeout(pollChainA, this.pollingInterval);
//       }
//     };
//     const pollChainB = async () => {
//       if (!this.isRunning) return;
//       try {
//         await this.pollForEvents('B', this.spokePoolB, this.providerB);
//       } catch (error) {
//         console.error('❌ Error polling chain B:', error);
//       }
//       if (this.isRunning) {
//         setTimeout(pollChainB, this.pollingInterval);
//       }
//     };
//     pollChainA();
//     pollChainB();
//   }
//   private async pollForEvents(
//     chainLabel: string, 
//     spokePool: ethers.Contract, 
//     provider: ethers.JsonRpcProvider
//   ) {
//     const currentBlock = await provider.getBlockNumber();
//     const lastProcessedBlock = chainLabel === 'A' ? this.lastProcessedBlockA : this.lastProcessedBlockB;
//     if (currentBlock <= lastProcessedBlock) {
//       return;
//     }
//     const fromBlock = lastProcessedBlock + 1;
//     const toBlock = Math.min(fromBlock + this.blockRange - 1, currentBlock);
//     console.log(`🔍 Polling chain ${chainLabel} from block ${fromBlock} to ${toBlock}`);
//     try {
//       const eventTopic = '0x44b559f101f8fbcc8a0ea43fa91a05a729a5ea6e14a7c75aa750374690137208'; // FilledRelay
//       const nonIndexedTypes = [
//         'bytes32',  // inputToken
//         'bytes32',  // outputToken
//         'uint256',  // inputAmount
//         'uint256',  // outputAmount
//         'uint256',  // repaymentChainId
//         'uint32',   // fillDeadline
//         'uint32',   // exclusivityDeadline
//         'bytes32',  // exclusiveRelayer
//         'bytes32',  // depositor
//         'bytes32',  // recipient
//         'bytes32',  // messageHash
//         'tuple(bytes32 updatedRecipient, bytes32 updatedMessageHash, uint256 updatedOutputAmount, uint8 fillType)'  // relayExecutionInfo
//       ];
//       const filter = {
//         address: spokePool,
//         fromBlock,
//         toBlock,
//         topics: [eventTopic]
//       };
//       const logs = await provider.getLogs(filter);
//       const abiCoder = ethers.AbiCoder.defaultAbiCoder();
//       for (const log of logs) {
//         try {
//           const decoded = abiCoder.decode(nonIndexedTypes, log.data);
//           console.log('decoded', decoded)
//           const result = {
//             indexed: {
//               originChainId: BigInt(log.topics[1]),
//               depositId: BigInt(log.topics[2]),
//               relayer: log.topics[3]
//             },
//             data: {
//               inputToken: decoded[0].toString(),
//               outputToken: decoded[1].toString(),
//               inputAmount: decoded[2].toString(),
//               outputAmount: decoded[3].toString(),
//               repaymentChainId: decoded[4].toString(),
//               fillDeadline: decoded[5],
//               exclusivityDeadline: decoded[6],
//               exclusiveRelayer: decoded[7],
//               depositor: decoded[8],
//               recipient: decoded[9],
//               messageHash: decoded[10],
//               relayExecutionInfo: {
//                 updatedRecipient: decoded[11][0],
//                 updatedMessageHash: decoded[11][1],
//                 updatedOutputAmount: decoded[11][2].toString(),
//                 fillType: decoded[11][3]
//               }
//             }
//           };
//           console.log('✅ FilledRelay log decoded:', result);
//           const relayEntry = {
//             chain: chainLabel,
//             inputToken: decoded[0].toString(),
//             outputToken: decoded[1].toString(),
//             inputAmount: decoded[2].toString(),
//             outputAmount: decoded[3].toString(),
//             repaymentChainId: decoded[4].toString(),
//             originChainId: BigInt(log.topics[1]).toString(),
//             depositId: BigInt(log.topics[2]).toString(),
//             relayer: log.topics[3],
//             timestamp: Date.now()
//           };
//           this.relayData.push(relayEntry);
//           // Optionally trigger Merkle tree build
//           // if (this.relayData.length >= 10) {
//             await this.processRelayData();
//           // }
//         } catch (err) {
//           console.warn('❌ Failed to decode log:', err);
//         }
//       } 
//       // console.log(`📝 Found ${events.length} FilledRelay events on chain ${chainLabel}`);
//       // console.log('Event: ', events)
//       // // console.log('Spokepool: ', spokePool)
//       // for (const event of events) {
//       //   if ('args' in event) { 
//       //     const [inputToken, outputToken, inputAmount, outputAmount, repaymentChainId, originChainId, depositId, fillDeadline, exclusivityDeadline, exclusiveRelayer, relayer, depositor, recipient, messageHash, relayExecutionInfo] = event.args;
//       //     console.log('FilledRelay event detected');
//       //     // await this.handleDepositEvent(chainLabel, event);
//       //   }
//       // }
//       // Update last processed block
//       if (chainLabel === 'A') {
//         this.lastProcessedBlockA = toBlock;
//       } else {
//         this.lastProcessedBlockB = toBlock;
//       }
//       await this.redis.set(`lastProcessedBlock_${chainLabel}`, toBlock.toString());
//       console.log(`Redis updated: lastProcessedBlock_${chainLabel} = ${toBlock}`);
//     } catch (error) {
//       console.error(`❌ Error querying events for chain ${chainLabel}:`, error);
//     }
//   }
//   private async processRelayData() {
//     if (this.relayData.length === 0) return;
//     console.log('Processing relay data for Merkle tree construction...');
//     const leaves = this.relayData.map(relay => 
//       ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
//         ['bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
//         [relay.inputToken, relay.outputToken, relay.inputAmount, relay.outputAmount, relay.repaymentChainId, relay.originChainId, relay.depositId, relay.relayer]
//       ))
//     );
//     console.log("Leaves", leaves);
//     const merkleTree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
//     console.log("merkletree", merkleTree);
//     const root = merkleTree.getHexRoot();
//     try {
//       const currentBlock = await this.hubPoolProvider.getBlockNumber();
//       console.log("current block", currentBlock);
//       console.log("hubpool provider", this.hubPool.target);
//       const network = await this.hubPoolProvider.getNetwork();
//       console.log("Connected to:", network.name, network.chainId);
//       const tx = await this.hubPool.proposeRootBundle(
//         [currentBlock],
//         1,
//         ethers.ZeroHash,
//         root,
//         ethers.ZeroHash
//       );
//       await tx.wait();
//       console.log(`Merkle root submitted to HubPool: ${tx.hash}`);
//       this.relayData = [];
//     } catch (error) {
//       console.error('Error submitting Merkle root:', error);
//     }
//   }
//   async stop() {
//     this.isRunning = false;
//     await this.redis.disconnect();
//     console.log('stopped');
//   }
// }
// const config: DataWorkerConfig = {
//   hubPool: {
//     rpc: process.env.HUBPOOL_RPC!,
//     privateKey: process.env.HUBPOOL_PRIVATE_KEY!,
//     address: process.env.HUBPOOL_ADDRESS!
//   },
//   chainA: {
//     rpc: process.env.CHAIN_A_RPC!,
//     spokePoolAddress: process.env.SPOKEPOOL_A_ADDRESS!,
//     chainId: parseInt(process.env.CHAIN_A_ID!)
//   },
//   chainB: {
//     rpc: process.env.CHAIN_B_RPC!,
//     spokePoolAddress: process.env.SPOKEPOOL_B_ADDRESS!,
//     chainId: parseInt(process.env.CHAIN_B_ID!)
//   },
//   redisUrl: process.env.REDIS_URL!,
//   pollingInterval: 10000 // Poll every 10 seconds
// };
// const dataWorker = new AcrossDataWorker(config);
// // Handle graceful shutdown
// process.on('SIGINT', async () => {
//   console.log('Received SIGINT, shutting down gracefully...');
//   await dataWorker.stop();
//   process.exit(0);
// });
// process.on('SIGTERM', async () => {
//   console.log('Received SIGTERM, shutting down gracefully...');
//   await dataWorker.stop();
//   process.exit(0);
// });
// dataWorker.start().catch(console.error);
// ===============================11111================================
// import { ethers } from 'ethers';
// import { createClient, RedisClientType} from 'redis';
// import { MerkleTree } from 'merkletreejs';
// import 'dotenv/config'; 
// interface DataWorkerConfig {
//   hubPool: { rpc: string; privateKey: string; address: string };
//   chainA: { rpc: string; spokePoolAddress: string; chainId: number };
//   chainB: { rpc: string; spokePoolAddress: string; chainId: number };
//   redisUrl: string;
//   pollingInterval?: number;
//   blockRange?: number;
//   minRefundVolume?: string; // Minimum volume before submitting refund bundle
// }
// interface RelayData {
//   chain: string;
//   inputToken: string;
//   outputToken: string;
//   inputAmount: string;
//   outputAmount: string;
//   repaymentChainId: string;
//   originChainId: string;
//   depositId: string;
//   relayer: string;
//   timestamp: number;
//   blockNumber: number;
//   transactionHash: string;
// }
// interface RelayerRefund {
//   relayer: string;
//   token: string;
//   amount: string;
//   chainId: number;
//   refundCounter: number;
// }
// interface RelayerRefundLeaf {
//   amountToReturn: string;
//   chainId: number;
//   refundAmounts: string[];
//   leafId: number;
//   l2TokenAddress: string;
//   refundAddresses: string[];
// }
// interface PoolRebalanceLeaf {
//   chainId: number;
//   bundleEvaluationBlockNumber: number;
//   groupIndex: number;
//   leafId: number;
//   tokens: string[];
//   netSendAmounts: string[];
//   runningBalances: string[];
//   leafValue: string;
// }
// class AcrossDataWorker {
//   private hubPoolProvider: ethers.JsonRpcProvider;
//   private hubPoolWallet: ethers.Wallet;
//   private hubPool: ethers.Contract;
//   private providerA: ethers.JsonRpcProvider;
//   private providerB: ethers.JsonRpcProvider;
//   private spokePoolA: ethers.Contract;
//   private spokePoolB: ethers.Contract;
//   private redis: RedisClientType;
//   private relayData: RelayData[] = [];
//   private relayerRefunds: Map<string, RelayerRefund[]> = new Map();
//   private relayerRefundLeaves: RelayerRefundLeaf[] = [];
//   private poolRebalanceLeaves: PoolRebalanceLeaf[] = [];
//   private pollingInterval: number;
//   private lastProcessedBlockA: number = 0;
//   private lastProcessedBlockB: number = 0;
//   private isRunning: boolean = false;
//   private blockRange: number;
//   private minRefundVolume: bigint;
//   private refundCounter: number = 0;
//   constructor(config: DataWorkerConfig) {
//     this.hubPoolProvider = new ethers.JsonRpcProvider(config.hubPool.rpc);
//     this.hubPoolWallet = new ethers.Wallet(config.hubPool.privateKey, this.hubPoolProvider);
//     const hubPoolAbi = [
//       "function proposeRootBundle(uint256[] calldata bundleEvaluationBlockNumbers, uint8 poolRebalanceLeafCount, bytes32 poolRebalanceRoot, bytes32 relayerRefundRoot, bytes32 slowRelayRoot)",
//       "function executeRootBundle(uint256 leafId, bytes32[] calldata proof, tuple(uint256 chainId, uint256 bundleEvaluationBlockNumber, uint256 groupIndex, uint256 leafId, address[] tokens, int256[] netSendAmounts, int256[] runningBalances, uint256 leafValue) poolRebalanceLeaf)",
//       "function getCurrentTime() view returns (uint256)",
//       "function liveness() view returns (uint32)",
//       "function rootBundleProposal() view returns (bytes32 poolRebalanceRoot, bytes32 relayerRefundRoot, bytes32 slowRelayRoot, uint256 claimedBitMap, address proposer, uint8 unclaimedPoolRebalanceLeafCount, uint32 challengePeriodEndTimestamp)"
//     ];
//     this.hubPool = new ethers.Contract(config.hubPool.address, hubPoolAbi, this.hubPoolWallet);
//     this.providerA = new ethers.JsonRpcProvider(config.chainA.rpc);
//     this.providerB = new ethers.JsonRpcProvider(config.chainB.rpc);
//     const spokePoolAbi = [
//       "event FilledRelay(bytes32 indexed inputToken, bytes32 indexed outputToken, uint256 inputAmount, uint256 outputAmount, uint256 repaymentChainId, uint256 indexed originChainId, uint256 indexed depositId, uint32 fillDeadline, uint32 exclusivityDeadline, bytes32 exclusiveRelayer, bytes32 indexed relayer, bytes32 depositor, bytes32 recipient, bytes32 messageHash, tuple(bytes32 updatedRecipient, bytes32 updatedMessageHash,uint256 updatedOutputAmount, uint8 fillType) relayExecutionInfo)",
//       "function executeRelayerRefundLeaf(uint256 leafId, bytes32[] calldata proof, tuple(uint256 amountToReturn, uint256 chainId, uint256[] refundAmounts, uint32 leafId, address l2TokenAddress, address[] refundAddresses) relayerRefundLeaf)",
//       "function relayFills(bytes32 relayHash) view returns (uint256 totalFilledAmount, uint256 fillDeadline, uint256 exclusivityDeadline, address exclusiveRelayer, address relayer, bool isSlowFill)"
//     ];
//     this.spokePoolA = new ethers.Contract(config.chainA.spokePoolAddress, spokePoolAbi, this.providerA);
//     this.spokePoolB = new ethers.Contract(config.chainB.spokePoolAddress, spokePoolAbi, this.providerB);
//     this.redis = createClient({ url: config.redisUrl });
//     this.pollingInterval = config.pollingInterval || 15000;
//     this.blockRange = config.blockRange || 100;
//     this.minRefundVolume = ethers.parseEther("0"); // Default 1000 ETH equivalent
//   }
//   async start() {
//     await this.redis.connect();
//     console.log('🚀 DataWorker service started');
//     // Initialize last processed blocks
//     // this.lastProcessedBlockA = await this.providerA.getBlockNumber() - 7800;
//     this.lastProcessedBlockA = 8732774;
//     this.lastProcessedBlockB = await this.providerB.getBlockNumber() - 7800;
//     this.isRunning = true;
//     // Start polling for events
//     this.startPolling();
//     // Start bundle proposal monitoring
//     this.startBundleMonitoring();
//   }
//   private async startPolling() {
//     const pollChainA = async () => {
//       if (!this.isRunning) return;
//       try {
//         await this.pollForEvents('A', this.spokePoolA, this.providerA);
//       } catch (error) {
//         console.error('❌ Error polling chain A:', error);
//       }
//       if (this.isRunning) {
//         setTimeout(pollChainA, this.pollingInterval);
//       }
//     };
//     const pollChainB = async () => {
//       if (!this.isRunning) return;
//       try {
//         await this.pollForEvents('B', this.spokePoolB, this.providerB);
//       } catch (error) {
//         console.error('❌ Error polling chain B:', error);
//       }
//       if (this.isRunning) {
//         setTimeout(pollChainB, this.pollingInterval);
//       }
//     };
//     pollChainA();
//     pollChainB();
//   }
//   private async startBundleMonitoring() {
//     const monitorBundle = async () => {
//       if (!this.isRunning) return;
//       try {
//         await this.checkAndExecuteBundle();
//       } catch (error) {
//         console.error('❌ Error monitoring bundle:', error);
//       }
//       if (this.isRunning) {
//         setTimeout(monitorBundle, this.pollingInterval * 2); // Check less frequently
//       }
//     };
//     monitorBundle();
//   }
//   private async pollForEvents(
//     chainLabel: string, 
//     spokePool: ethers.Contract, 
//     provider: ethers.JsonRpcProvider
//   ) {
//     const currentBlock = await provider.getBlockNumber();
//     const lastProcessedBlock = chainLabel === 'A' ? this.lastProcessedBlockA : this.lastProcessedBlockB;
//     if (currentBlock <= lastProcessedBlock) {
//       return;
//     }
//     const fromBlock = lastProcessedBlock + 1;
//     const toBlock = Math.min(fromBlock + this.blockRange - 1, currentBlock);
//     console.log(`🔍 Polling chain ${chainLabel} from block ${fromBlock} to ${toBlock}`);
//     try {
//       const eventTopic = '0x44b559f101f8fbcc8a0ea43fa91a05a729a5ea6e14a7c75aa750374690137208'; // FilledRelay
//       const nonIndexedTypes = [
//         'bytes32',  // inputToken
//         'bytes32',  // outputToken
//         'uint256',  // inputAmount
//         'uint256',  // outputAmount
//         'uint256',  // repaymentChainId
//         'uint32',   // fillDeadline
//         'uint32',   // exclusivityDeadline
//         'bytes32',  // exclusiveRelayer
//         'bytes32',  // depositor
//         'bytes32',  // recipient
//         'bytes32',  // messageHash
//         'tuple(bytes32 updatedRecipient, bytes32 updatedMessageHash, uint256 updatedOutputAmount, uint8 fillType)'
//       ];
//       const filter = {
//         address: spokePool.target,
//         fromBlock,
//         toBlock,
//         topics: [eventTopic]
//       };
//       const logs = await provider.getLogs(filter);
//       const abiCoder = ethers.AbiCoder.defaultAbiCoder();
//       for (const log of logs) {
//         try {
//           const decoded = abiCoder.decode(nonIndexedTypes, log.data);
//           const relayEntry: RelayData = {
//             chain: chainLabel,
//             inputToken: decoded[0].toString(),
//             outputToken: decoded[1].toString(),
//             inputAmount: decoded[2].toString(),
//             outputAmount: decoded[3].toString(),
//             repaymentChainId: decoded[4].toString(),
//             originChainId: BigInt(log.topics[1]).toString(),
//             depositId: BigInt(log.topics[2]).toString(),
//             relayer: log.topics[3],
//             timestamp: Date.now(),
//             blockNumber: log.blockNumber,
//             transactionHash: log.transactionHash
//           };
//           console.log('✅ FilledRelay log decoded:', relayEntry);
//           this.relayData.push(relayEntry);
//           // Process refund for this relay
//           await this.processRelayForRefund(relayEntry);
//           console.log(`✅ Processed FilledRelay on chain ${chainLabel}, deposit ${relayEntry.depositId}`);
//         } catch (err) {
//           console.warn('❌ Failed to decode log:', err);
//         }
//       }
//       // Update last processed block
//       if (chainLabel === 'A') {
//         this.lastProcessedBlockA = toBlock;
//       } else {
//         this.lastProcessedBlockB = toBlock;
//       }
//       await this.redis.set(`lastProcessedBlock_${chainLabel}`, toBlock.toString());
//     } catch (error) {
//       console.error(`❌ Error querying events for chain ${chainLabel}:`, error);
//     }
//   }
//   private async processRelayForRefund(relay: RelayData) {
//     const relayerAddress = relay.relayer;
//     const repaymentChainId = parseInt(relay.repaymentChainId);
//     // Create refund entry for the relayer
//     const refund: RelayerRefund = {
//       relayer: relayerAddress,
//       token: relay.outputToken,
//       amount: relay.outputAmount,
//       chainId: repaymentChainId,
//       refundCounter: this.refundCounter++
//     };
//     // Group refunds by relayer
//     if (!this.relayerRefunds.has(relayerAddress)) {
//       this.relayerRefunds.set(relayerAddress, []);
//     }
//     this.relayerRefunds.get(relayerAddress)!.push(refund);
//     // Store in Redis for persistence
//     await this.redis.hSet(
//       `refunds:${relayerAddress}`,
//       `${refund.chainId}:${refund.refundCounter}`,
//       JSON.stringify(refund)
//     );
//     console.log(`💰 Queued refund for relayer ${relayerAddress}: ${ethers.formatEther(refund.amount)} tokens on chain ${repaymentChainId}`);
//   }
//   private async shouldProposeBundle(): Promise<boolean> {
//     // Check if we have enough volume to justify proposing a bundle
//     let totalRefundVolume = 0n;
//     for (const [relayer, refunds] of this.relayerRefunds) {
//       for (const refund of refunds) {
//         totalRefundVolume += BigInt(refund.amount);
//       }
//     }
//     console.log(`📊 Total refund volume: ${ethers.formatEther(totalRefundVolume)} ETH equivalent`);
//     return totalRefundVolume >= this.minRefundVolume;
//   }
//   async bytes32ToAddress(bytes32: any) {
//     // Remove leading zeros and keep last 40 chars
//     return '0x' + bytes32.slice(-40);
//   }
//   private async buildRelayerRefundRoot(): Promise<string> {
//     const leaves: string[] = [];
//     this.relayerRefundLeaves = []; // Reset leaves
//     // Group refunds by chain and token
//     const refundsByChainAndToken = new Map<string, Map<string, RelayerRefund[]>>();
//     for (const [relayer, refunds] of this.relayerRefunds) {
//       for (const refund of refunds) {
//         const chainKey = refund.chainId.toString();
//         const tokenKey = refund.token;
//         if (!refundsByChainAndToken.has(chainKey)) {
//           refundsByChainAndToken.set(chainKey, new Map());
//         }
//         if (!refundsByChainAndToken.get(chainKey)!.has(tokenKey)) {
//           refundsByChainAndToken.get(chainKey)!.set(tokenKey, []);
//         }
//         refundsByChainAndToken.get(chainKey)!.get(tokenKey)!.push(refund);
//       }
//     }
//     // Create RefundLeaf for each chain/token combination
//     let leafId = 0;
//     for (const [chainId, tokenMap] of refundsByChainAndToken) {
//       for (const [token, refunds] of tokenMap) {
//         const refundAddresses = refunds.map(r => r.relayer);
//         const refundAmounts = refunds.map(r => r.amount);
//         const totalAmount = refundAmounts.reduce((sum, amount) => sum + BigInt(amount), 0n);
//         const refundLeaf: RelayerRefundLeaf = {
//           amountToReturn: totalAmount.toString(),
//           chainId: parseInt(chainId),
//           refundAmounts: refundAmounts,
//           leafId: leafId++,
//           l2TokenAddress: token,
//           refundAddresses: refundAddresses
//         };
//         this.relayerRefundLeaves.push(refundLeaf);
//         // Create leaf hash
//         const leafData = ethers.AbiCoder.defaultAbiCoder().encode(
//           ['uint256', 'uint256', 'uint256[]', 'uint32', 'address', 'address[]'],
//           [
//             refundLeaf.amountToReturn,
//             refundLeaf.chainId,
//             refundLeaf.refundAmounts,
//             refundLeaf.leafId,
//             ethers.getAddress('0x' + refundLeaf.l2TokenAddress.slice(26)),
//             ethers.getAddress('0x' + refundLeaf.refundAddresses.slice(26)),
//           ]
//         );
//         leaves.push(ethers.keccak256(leafData));
//       }
//     }
//     if (leaves.length === 0) {
//       return ethers.ZeroHash;
//     }
//     const merkleTree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
//     return merkleTree.getHexRoot();
//   }
//   private async buildPoolRebalanceRoot(): Promise<string> {
//     // For now, return zero hash. In a full implementation, you'd calculate
//     // the net token flows and rebalancing needs across all spoke pools
//     return ethers.ZeroHash;
//   }
//   private async processRelayData() {
//     if (!await this.shouldProposeBundle()) {
//       console.log('⏳ Not enough volume to propose bundle yet');
//       return;
//     }
//     console.log('🏗️  Building bundle for proposal...');
//     try {
//       const currentBlockA = await this.providerA.getBlockNumber();
//       const currentBlockB = await this.providerB.getBlockNumber();
//       const bundleEvaluationBlockNumbers = [currentBlockA, currentBlockB];
//       // const poolRebalanceRoot = await this.buildPoolRebalanceRoot();
//       const relayerRefundRoot = await this.buildRelayerRefundRoot();
//       const slowRelayRoot = ethers.ZeroHash; // Not implementing slow relays in this example
//       console.log('📄 Bundle details:');
//       // console.log('  - Pool rebalance root:', poolRebalanceRoot);
//       console.log('  - Relayer refund root:', relayerRefundRoot);
//       console.log('  - Evaluation blocks:', bundleEvaluationBlockNumbers);
//       const tx = await this.hubPool.proposeRootBundle(
//         bundleEvaluationBlockNumbers,
//         0, // poolRebalanceLeafCount
//         ethers.ZeroHash,
//         relayerRefundRoot,
//         slowRelayRoot
//       );
//       await tx.wait();
//       console.log(`✅ Bundle proposed to HubPool: ${tx.hash}`);
//       // Store bundle info in Redis
//       await this.redis.set('lastBundleProposal', JSON.stringify({
//         transactionHash: tx.hash,
//         timestamp: Date.now(),
//         relayerRefundRoot,
//         refundCount: Array.from(this.relayerRefunds.values()).flat().length
//       }));
//       // Clear processed data
//       this.relayData = [];
//       this.relayerRefunds.clear();
//     } catch (error) {
//       console.error('❌ Error proposing bundle:', error);
//     }
//   }
//   private async checkAndExecuteBundle() {
//     try {
//       console.log('Monitoring bundle');
//       const bundleProposal = await this.hubPool.rootBundleProposal();
//       console.log('Bundle proposal', bundleProposal);
//       console.log('Challenge period end timestamp', bundleProposal.challengePeriodEndTimestamp)
//       const currentTime = await this.hubPool.getCurrentTime();
//       const liveness = await this.hubPool.liveness();
//       // Check if challenge period has passed
//       if (bundleProposal.challengePeriodEndTimestamp > 0n && 
//           currentTime >= bundleProposal.challengePeriodEndTimestamp) {
//         console.log('⏰ Challenge period ended, bundle can be executed');
//         // In a full implementation, you would:
//         // 1. Generate merkle proofs for each refund leaf
//         // 2. Execute refunds on spoke pools
//         // 3. Execute pool rebalancing
//         // Execute refunds on spoke pools
//         await this.executeRefundsOnSpokePool(this.spokePoolA, parseInt(config.chainA.chainId.toString()));
//         await this.executeRefundsOnSpokePool(this.spokePoolB, parseInt(config.chainB.chainId.toString()));
//         console.log('✅ Bundle execution completed');
//         // Trigger new bundle proposal if we have more data
//         if (this.relayData.length > 0) {
//           await this.processRelayData();
//         }
//       } else if (bundleProposal.challengePeriodEndTimestamp > 0n) {
//         const timeRemaining = bundleProposal.challengePeriodEndTimestamp - currentTime;
//         console.log(`⏳ Challenge period active, ${timeRemaining} seconds remaining`);
//       }
//     } catch (error) {
//       console.error('❌ Error checking bundle status:', error);
//     }
//   }
//   async executeRefundsOnSpokePool(spokePool: ethers.Contract, chainId: number) {
//     // Filter refund leaves for this chain
//     const chainRefunds = this.relayerRefundLeaves.filter(leaf => leaf.chainId === chainId);
//     if (chainRefunds.length === 0) {
//       console.log(`No refunds to execute on chain ${chainId}`);
//       return;
//     }
//     console.log(`💸 Executing ${chainRefunds.length} refund leaves on chain ${chainId}`);
//     // Build merkle tree for proof generation
//     const leaves = this.relayerRefundLeaves.map(leaf => {
//       const leafData = ethers.AbiCoder.defaultAbiCoder().encode(
//         ['uint256', 'uint256', 'uint256[]', 'uint32', 'address', 'address[]'],
//         [
//           leaf.amountToReturn,
//           leaf.chainId,
//           leaf.refundAmounts,
//           leaf.leafId,
//           leaf.l2TokenAddress,
//           leaf.refundAddresses
//         ]
//       );
//       return ethers.keccak256(leafData);
//     });
//     console.log('Leaves', leaves);
//     const merkleTree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
//     console.log('Merkle tree', merkleTree);
//     for (const refundLeaf of chainRefunds) {
//       try {
//         // Generate merkle proof
//         const leafData = ethers.AbiCoder.defaultAbiCoder().encode(
//           ['uint256', 'uint256', 'uint256[]', 'uint32', 'address', 'address[]'],
//           [
//             refundLeaf.amountToReturn,
//             refundLeaf.chainId,
//             refundLeaf.refundAmounts,
//             refundLeaf.leafId,
//             refundLeaf.l2TokenAddress,
//             refundLeaf.refundAddresses
//           ]
//         );
//         const leafHash = ethers.keccak256(leafData);
//         const proof = merkleTree.getHexProof(leafHash);
//         // Execute refund on spoke pool
//         const tx = await spokePool.executeRelayerRefundLeaf(
//           refundLeaf.leafId,
//           proof,
//           [
//             refundLeaf.amountToReturn,
//             refundLeaf.chainId,
//             refundLeaf.refundAmounts,
//             refundLeaf.leafId,
//             refundLeaf.l2TokenAddress,
//             refundLeaf.refundAddresses
//           ]
//         );
//         await tx.wait();
//         console.log(`✅ Executed refund leaf ${refundLeaf.leafId} on chain ${chainId}: ${tx.hash}`);
//         // Log individual refunds
//         for (let i = 0; i < refundLeaf.refundAddresses.length; i++) {
//           console.log(`  - Refunded ${ethers.formatEther(refundLeaf.refundAmounts[i])} to ${refundLeaf.refundAddresses[i]}`);
//         }
//       } catch (error) {
//         console.error(`❌ Failed to execute refund leaf ${refundLeaf.leafId}:`, error);
//       }
//     }
//   }
//   async stop() {
//     this.isRunning = false;
//     await this.redis.disconnect();
//     console.log('🛑 DataWorker stopped');
//   }
// }
// const config: DataWorkerConfig = {
//   hubPool: {
//     rpc: process.env.HUBPOOL_RPC!,
//     privateKey: process.env.HUBPOOL_PRIVATE_KEY!,
//     address: process.env.HUBPOOL_ADDRESS!
//   },
//   chainA: {
//     rpc: process.env.CHAIN_A_RPC!,
//     spokePoolAddress: process.env.SPOKEPOOL_A_ADDRESS!,
//     chainId: parseInt(process.env.CHAIN_A_ID!)
//   },
//   chainB: {
//     rpc: process.env.CHAIN_B_RPC!,
//     spokePoolAddress: process.env.SPOKEPOOL_B_ADDRESS!,
//     chainId: parseInt(process.env.CHAIN_B_ID!)
//   },
//   redisUrl: process.env.REDIS_URL!,
//   pollingInterval: 10000,
//   minRefundVolume: "100" // 100 ETH equivalent before proposing bundle
// };
// const dataWorker = new AcrossDataWorker(config);
// // Handle graceful shutdown
// process.on('SIGINT', async () => {
//   console.log('Received SIGINT, shutting down gracefully...');
//   await dataWorker.stop();
//   process.exit(0);
// });
// process.on('SIGTERM', async () => {
//   console.log('Received SIGTERM, shutting down gracefully...');
//   await dataWorker.stop();
//   process.exit(0);
// });
// dataWorker.start().catch(console.error);
const ethers_1 = require("ethers");
const merkletreejs_1 = require("merkletreejs");
const leaves = [
    {
        chainId: 11155111,
        // groupIndex: 0,
        bundleLpFees: [],
        netSendAmounts: [],
        runningBalances: [],
        groupIndex: 0,
        leafId: 0,
        l1Tokens: []
    },
    {
        chainId: 421614,
        // groupIndex: 0,
        bundleLpFees: [],
        netSendAmounts: [],
        runningBalances: [],
        groupIndex: 0,
        leafId: 1,
        l1Tokens: []
    }
];
function encodeLeaf(leaf) {
    const abi = ethers_1.ethers.AbiCoder.defaultAbiCoder();
    const encoded = abi.encode(['uint256', 'uint256[]', 'int256[]', 'int256[]', 'uint256', 'uint8', 'address[]'], [
        BigInt(leaf.chainId),
        [],
        [],
        [],
        BigInt(leaf.groupIndex),
        leaf.leafId,
        []
    ]);
    return ethers_1.ethers.keccak256(encoded);
}
const hashedLeaves = leaves.map(encodeLeaf);
const tree = new merkletreejs_1.MerkleTree(hashedLeaves, (data) => ethers_1.ethers.keccak256(data), { sortPairs: true });
const root = tree.getHexRoot();
console.log("Computed Merkle Root:", root);
hashedLeaves.forEach((leafHash, i) => {
    const proof = tree.getHexProof(leafHash);
    const valid = tree.verify(proof, leafHash, root);
    console.log(`Leaf ${i} valid proof?`, valid);
    console.log('Proof:', proof);
});
const iface = new ethers_1.ethers.Interface([
    "function executeRootBundle(uint256,uint256,uint256[],int256[],int256[],uint8,address[],bytes32[])"
]);
const calldata = "0x80c09a820000000000000000000000000000000000000000000000000000000000aa36a7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f5c8ac12e45baf38c4783656862b112a78cf65fde7b8ba9247a417447d239c05";
const decoded = iface.decodeFunctionData("executeRootBundle", calldata);
console.log(decoded);
