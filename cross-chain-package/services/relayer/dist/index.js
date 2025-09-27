"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const redis_1 = require("redis");
require("dotenv/config");
class AcrossRelayer {
    constructor(config) {
        this.lastProcessedBlockA = 0;
        this.lastProcessedBlockB = 0;
        this.isRunning = false;
        console.log('🚀 Initializing Across Relayer...');
        console.log('CHAIN_A_PRIVATE_KEY length:', process.env.CHAIN_A_PRIVATE_KEY?.length);
        this.providerA = new ethers_1.ethers.JsonRpcProvider(config.chainA.rpc);
        this.providerB = new ethers_1.ethers.JsonRpcProvider(config.chainB.rpc);
        this.walletA = new ethers_1.ethers.Wallet(config.chainA.privateKey, this.providerA);
        this.walletB = new ethers_1.ethers.Wallet(config.chainB.privateKey, this.providerB);
        this.pollingInterval = config.pollingInterval || 5000;
        this.blockRange = config.blockRange || 100;
        const spokePoolAbi = [
            "event FundsDeposited(bytes32 inputToken, bytes32 outputToken, uint256 inputAmount, uint256 outputAmount, uint256 indexed destinationChainId, uint256 indexed depositId, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes32 indexed depositor, bytes32 recipient, bytes32 exclusiveRelayer, bytes message)",
            "function fillRelay((bytes32,bytes32,bytes32,bytes32,bytes32,uint256,uint256,uint256,uint256,uint32,uint32,bytes),uint256,bytes32) external"
        ];
        this.spokePoolA = new ethers_1.ethers.Contract(config.chainA.spokePoolAddress, spokePoolAbi, this.walletA);
        this.spokePoolB = new ethers_1.ethers.Contract(config.chainB.spokePoolAddress, spokePoolAbi, this.walletB);
        this.redis = (0, redis_1.createClient)({ url: config.redisUrl });
    }
    async start() {
        await this.redis.connect();
        console.log('✅ Redis connected');
        const networkA = await this.providerA.getNetwork();
        const networkB = await this.providerB.getNetwork();
        console.log(`🔗 Chain A: ${networkA.name} (${networkA.chainId})`);
        console.log(`🔗 Chain B: ${networkB.name} (${networkB.chainId})`);
        // Initialize starting blocks
        this.lastProcessedBlockA = await this.providerA.getBlockNumber() - 50;
        this.lastProcessedBlockB = await this.providerB.getBlockNumber() - 50;
        console.log(`📊 Starting from block A: ${this.lastProcessedBlockA}`);
        console.log(`📊 Starting from block B: ${this.lastProcessedBlockB}`);
        await this.initializeFromRedis();
        this.isRunning = true;
        console.log('🚀 Relayer service started');
        // Start polling
        this.startPolling();
    }
    async stop() {
        this.isRunning = false;
        await this.redis.disconnect();
        console.log('🛑 Relayer service stopped');
    }
    async startPolling() {
        const pollChainA = async () => {
            if (!this.isRunning)
                return;
            try {
                await this.pollForEvents('A', this.spokePoolA, this.providerA);
            }
            catch (error) {
                console.error('❌ Error polling chain A:', error);
            }
            if (this.isRunning) {
                setTimeout(pollChainA, this.pollingInterval);
            }
        };
        const pollChainB = async () => {
            if (!this.isRunning)
                return;
            try {
                await this.pollForEvents('B', this.spokePoolB, this.providerB);
            }
            catch (error) {
                console.error('❌ Error polling chain B:', error);
            }
            if (this.isRunning) {
                setTimeout(pollChainB, this.pollingInterval);
            }
        };
        pollChainA();
        pollChainB();
    }
    async pollForEvents(chainLabel, spokePool, provider) {
        const currentBlock = await provider.getBlockNumber() - 50;
        const lastProcessedBlock = chainLabel === 'A' ? this.lastProcessedBlockA : this.lastProcessedBlockB;
        if (currentBlock <= lastProcessedBlock) {
            return;
        }
        const fromBlock = lastProcessedBlock + 1;
        console.log("Block range", this.blockRange);
        const toBlock = Math.min(fromBlock + this.blockRange - 1, currentBlock);
        console.log(`🔍 Polling chain ${chainLabel} from block ${fromBlock} to ${toBlock}`);
        try {
            // Query FundsDeposited events
            const events = await spokePool.queryFilter(spokePool.filters.FundsDeposited(), fromBlock, toBlock);
            console.log(`📝 Found ${events.length} FundsDeposited events on chain ${chainLabel}`);
            for (const event of events) {
                if ('args' in event) {
                    await this.handleDepositEvent(chainLabel, event);
                }
            }
            // Update last processed block
            if (chainLabel === 'A') {
                this.lastProcessedBlockA = toBlock;
            }
            else {
                this.lastProcessedBlockB = toBlock;
            }
            await this.redis.set(`lastProcessedBlock_${chainLabel}`, toBlock.toString());
            console.log(`Redis updated: lastProcessedBlock_${chainLabel} = ${toBlock}`);
        }
        catch (error) {
            console.error(`❌ Error querying events for chain ${chainLabel}:`, error);
        }
    }
    async handleDepositEvent(sourceChain, event) {
        const { args } = event;
        if (!args)
            return;
        const [inputToken, outputToken, inputAmount, outputAmount, destinationChainId, depositId, quoteTimestamp, fillDeadline, exclusivityDeadline, depositor, recipient, exclusiveRelayer, message] = args;
        const inputTokenAddress = ethers_1.ethers.getAddress('0x' + inputToken.slice(26));
        const outputTokenAddress = ethers_1.ethers.getAddress('0x' + outputToken.slice(26));
        const toBytes32 = (address) => ethers_1.ethers.zeroPadValue(address, 32);
        console.log(`🎯 Deposit detected on chain ${sourceChain}:`, {
            depositId: depositId.toString(),
            destinationChainId: destinationChainId.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            inputTokenAddress,
            outputTokenAddress,
            inputAmount: inputAmount.toString(),
            outputAmount: outputAmount.toString(),
            depositor: toBytes32(depositor),
            recipient: toBytes32(recipient),
        });
        const networkA = await this.walletA.provider.getNetwork();
        const networkB = await this.walletB.provider.getNetwork();
        // Determine target chain
        const targetChainId = destinationChainId.toString();
        const isTargetChainA = targetChainId === networkA.chainId?.toString();
        const isTargetChainB = targetChainId === networkB.chainId?.toString();
        if (!isTargetChainA && !isTargetChainB) {
            console.log(`⚠️  Destination chain ${targetChainId} not supported by this relayer`);
            return;
        }
        const targetSpokePool = isTargetChainA ? this.spokePoolA : this.spokePoolB;
        const targetChainLabel = isTargetChainA ? 'A' : 'B';
        console.log(`🎯 Filling relay on chain ${targetChainLabel} (${targetChainId})`);
        try {
            // Check if already processed
            const processedKey = `processed_${depositId.toString()}_${event.transactionHash}`;
            const alreadyProcessed = await this.redis.get(processedKey);
            if (alreadyProcessed) {
                console.log(`⏭️  Deposit ${depositId.toString()} already processed, skipping`);
                return;
            }
            const relayData = [
                toBytes32(depositor),
                toBytes32(recipient),
                toBytes32(exclusiveRelayer),
                toBytes32(inputToken),
                toBytes32(outputToken),
                inputAmount,
                outputAmount,
                sourceChain === 'A' ? networkA.chainId : networkB.chainId,
                depositId,
                fillDeadline,
                exclusivityDeadline,
                message
            ];
            console.log(`📝 Relay data:`, relayData);
            const repaymentChainId = 1225280;
            const repaymentAddress = toBytes32('0x333F13a6913553EE8C380173B16449d1F7AD0aF9');
            const tx = await targetSpokePool.fillRelay(relayData, repaymentChainId, repaymentAddress);
            console.log(`📤 Fill transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Relay fulfilled: ${tx.hash} (Block: ${receipt.blockNumber})`);
            // Mark as processed
            await this.redis.set(processedKey, 'true', { EX: 86400 });
            // Publish completion
            await this.redis.publish('relay-fulfilled', JSON.stringify({
                depositId: depositId.toString(),
                txHash: tx.hash,
                sourceChain,
                targetChain: targetChainLabel,
                sourceTransactionHash: event.transactionHash,
                blockNumber: receipt.blockNumber
            }));
        }
        catch (error) {
            console.error('❌ Error fulfilling relay:', error);
            if (typeof error === 'object' && error !== null) {
                if ('code' in error && error.code === 'CALL_EXCEPTION') {
                    console.error('Call exception details:', error.reason);
                }
                if ('transaction' in error) {
                    console.error('Failed transaction data:', error.transaction);
                }
            }
        }
    }
    async initializeFromRedis() {
        try {
            const lastBlockA = await this.redis.get('lastProcessedBlock_A');
            const lastBlockB = await this.redis.get('lastProcessedBlock_B');
            if (lastBlockA) {
                this.lastProcessedBlockA = parseInt(lastBlockA);
                console.log(`📊 Recovered Chain A from block: ${this.lastProcessedBlockA}`);
            }
            if (lastBlockB) {
                this.lastProcessedBlockB = parseInt(lastBlockB);
                console.log(`📊 Recovered Chain B from block: ${this.lastProcessedBlockB}`);
            }
        }
        catch (error) {
            console.error('❌ Error recovering from Redis:', error);
        }
    }
}
const config = {
    chainA: {
        rpc: process.env.CHAIN_A_RPC,
        privateKey: process.env.CHAIN_A_PRIVATE_KEY,
        spokePoolAddress: process.env.SPOKEPOOL_A_ADDRESS,
        chainId: parseInt(process.env.CHAIN_A_ID)
    },
    chainB: {
        rpc: process.env.CHAIN_B_RPC,
        privateKey: process.env.CHAIN_B_PRIVATE_KEY,
        spokePoolAddress: process.env.SPOKEPOOL_B_ADDRESS,
        chainId: parseInt(process.env.CHAIN_B_ID)
    },
    redisUrl: process.env.REDIS_URL,
    pollingInterval: parseInt(process.env.POLLING_INTERVAL || '5000'),
    blockRange: parseInt(process.env.BLOCK_RANGE || '100')
};
const relayer = new AcrossRelayer(config);
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    await relayer.stop();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    await relayer.stop();
    process.exit(0);
});
relayer.start().catch(console.error);
