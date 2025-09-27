const { ethers } = require("ethers");
const { MerkleTree } = require("merkletreejs");

// 1. Your leaves (replace with your actual values)
const leaves = [
  {
    chainId: 11155111,
    groupIndex: 0,
    bundleLpFees: [],
    netSendAmounts: [],
    runningBalances: [],
    leafId: 0,
    l1Tokens: []
  },
  {
    chainId: 421614,
    groupIndex: 0,
    bundleLpFees: [],
    netSendAmounts: [],
    runningBalances: [],
    leafId: 1,
    l1Tokens: []
  }
];

// 2. Hash function for PoolRebalanceLeaf (matches Solidity encoding)
function hashLeaf(leaf: any) {
  const types = [
    "uint256",    // chainId
    "uint256",    // groupIndex
    "uint256[]",  // bundleLpFees
    "int256[]",   // netSendAmounts
    "int256[]",   // runningBalances
    "uint8",      // leafId
    "address[]"   // l1Tokens
  ];
  const values = [
    leaf.chainId,
    leaf.groupIndex,
    leaf.bundleLpFees,
    leaf.netSendAmounts,
    leaf.runningBalances,
    leaf.leafId,
    leaf.l1Tokens
  ];
  const abiEncoded = ethers.AbiCoder.defaultAbiCoder().encode(types, values);
  return ethers.keccak256(abiEncoded);
}

// 3. Hash all leaves
const leafHashes = leaves.map(hashLeaf);

// 4. Build the Merkle tree
const tree = new MerkleTree(leafHashes, (data: any) => ethers.keccak256(data), { sortPairs: true });

// 5. Get the Merkle root (should match your on-chain poolRebalanceRoot)
const root = tree.getHexRoot();
console.log("Merkle root (poolRebalanceRoot):", root);

// 6. Simulate the contract check for each leaf
leaves.forEach((leaf, i) => {
  const leafHash = leafHashes[i];
  const proof = tree.getHexProof(leafHash);

  // Simulate MerkleLib.verifyPoolRebalance
  const isValid = tree.verify(proof, leafHash, root);

  console.log(`\nLeaf ${i}:`);
  console.log("  Leaf data:", leaf);
  console.log("  Leaf hash:", leafHash);
  console.log("  Proof:", proof);
  console.log("  Valid proof for root?", isValid);
});