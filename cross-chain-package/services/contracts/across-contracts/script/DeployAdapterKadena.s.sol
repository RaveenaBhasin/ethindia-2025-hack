// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Ethereum_Adapter} from "../lib/contracts/contracts/chain-adapters/Ethereum_Adapter.sol";
import {ChainwebScript} from "kadena-io/foundry-chainweb/Chainweb.sol";

contract DeployAdapterKadena is ChainwebScript {
    function run() public {
        uint256[] memory chainIds = chainweb.getChainIds();
        
        for (uint256 i = 0; i < chainIds.length; i++) {
            chainweb.switchChain(chainIds[i]);
            console.log("Deploying Adapter to chain:", chainIds[i]);
            
            vm.startBroadcast();
            Ethereum_Adapter adapter = new Ethereum_Adapter();
            vm.stopBroadcast();
            
            console.log("Adapter deployed at:", address(adapter));
        }
    }
}
