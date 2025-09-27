// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {TransparentUpgradeableProxy} from "../lib/openzeppelin-contracts/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "../lib/openzeppelin-contracts/contracts/proxy/transparent/ProxyAdmin.sol";
import {ChainwebScript} from "kadena-io/foundry-chainweb/Chainweb.sol";

contract DeploySpokePoolProxyKadena is ChainwebScript {
    function run() public {
        uint256[] memory chainIds = chainweb.getChainIds();
        
        // Get addresses from environment variables
        address implementation = vm.envAddress("SPOKEPOOL_IMPL");
        address hubPool = vm.envAddress("HUBPOOL_ADDRESS");
        
        for (uint256 i = 0; i < chainIds.length; i++) {
            chainweb.switchChain(chainIds[i]);
            console.log("Deploying SpokePool Proxy to chain:", chainIds[i]);
            
            vm.startBroadcast();
            
            // Deploy proxy admin
            ProxyAdmin proxyAdmin = new ProxyAdmin();
            
            // Prepare initialization data
            bytes memory initData = abi.encodeWithSignature(
                "initialize(uint32,address)",
                1_000_000, // initialDepositId
                hubPool     // withdrawalRecipient
            );
            
            // Deploy proxy
            TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
                implementation,
                address(proxyAdmin),
                initData
            );
            
            vm.stopBroadcast();
            
            console.log("SpokePool Proxy deployed at:", address(proxy));
            console.log("ProxyAdmin deployed at:", address(proxyAdmin));
        }
    }
}
