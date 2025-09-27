export const spokePoolAbi = [
    {
      inputs: [],
      name: 'getCurrentTime',
      outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'depositQuoteTimeBuffer',
      outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'address', name: 'originSender', type: 'address' },
        { internalType: 'address', name: 'recipient', type: 'address' },
        { internalType: 'address', name: 'originToken', type: 'address' },
        { internalType: 'address', name: 'destinationToken', type: 'address' },
        { internalType: 'uint256', name: 'amount', type: 'uint256' },
        { internalType: 'uint256', name: 'relayerFeePct', type: 'uint256' },
        { internalType: 'uint256', name: 'destinationChainId', type: 'uint256' },
        { internalType: 'address', name: 'exclusiveRelayer', type: 'address' },
        { internalType: 'uint32', name: 'quoteTimestamp', type: 'uint32' },
        { internalType: 'uint32', name: 'fillDeadline', type: 'uint32' },
        { internalType: 'uint32', name: 'exclusivityDeadline', type: 'uint32' },
        { internalType: 'bytes', name: 'message', type: 'bytes' }
      ],
      name: 'depositV3',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ]


export const wethAbi = [
    {
      "constant": true,
      "inputs": [{ "name": "guy", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "name": "", "type": "uint256" }],
      "type": "function",
    },
  ]