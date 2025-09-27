# def deploy_contract(plan, script_path, contract_name, rpc_url, private_key, env_vars=None):
#     env_vars = env_vars or {}
#     env_vars.update({
#         "RPC_URL": rpc_url,
#         "PRIVATE_KEY": private_key,
#     })
#     script_full = script_path + ":" + contract_name

#     if contract_name == "DeploySpokePoolProxy":
#         cmd = (
#             "forge script " + script_full +
#             " --broadcast --json --skip-simulation --via-ir --rpc-url $RPC_URL --private-key $PRIVATE_KEY 2>&1 " 
#             # "| grep -o '0x[a-fA-F0-9]\\{40\\}' | tail -n 1"
#         )
#     else:
#        cmd = (
#             "forge script " + script_full +
#             " --broadcast --json --skip-simulation --via-ir --rpc-url $RPC_URL --private-key $PRIVATE_KEY 2>&1 " +
#             "| grep -o '0x[a-fA-F0-9]\\{40\\}' | tail -n 1"
#         ) 

    
#     deployment = plan.run_sh(
#         name="generic-deployer",
#         description="Deploying " + script_full,
#         image="across-mock-contracts:0.0.7",
#         env_vars=env_vars,
#         run=cmd.strip()
#     )
#     # plan.print("deployment output")
#     # plan.print(deployment)
#     return deployment.output.strip()

def deploy_contract(plan, script_path, contract_name, rpc_url, private_key, env_vars=None, network_type=None):
    env_vars = env_vars or {}
    env_vars.update({
        "RPC_URL": rpc_url,
        "PRIVATE_KEY": private_key,
    })
    script_full = script_path + ":" + contract_name

    # Check if this is a Kadena network deployment
    if network_type == "kadena":
        # Use existing chainweb.config.json file
        # Deploy using foundry-chainweb with legacy gas pricing
        if contract_name == "DeploySpokePoolProxy":
            cmd = (
                "CHAINWEB=testnet forge script --multi " + script_full +
                " --broadcast --legacy --rpc-url $RPC_URL --private-key $PRIVATE_KEY 2>&1 " +
                "| grep -o '0x[a-fA-F0-9]\\{40\\}' | tail -n 1 | tr -d '\\n'"
            )
        else:
            cmd = (
                "CHAINWEB=testnet forge script --multi " + script_full +
                " --broadcast --legacy --rpc-url $RPC_URL --private-key $PRIVATE_KEY 2>&1 | tee /tmp/deployment.log && " +
                "grep -E '(Contract deployed at:|Contract Address:)' /tmp/deployment.log | grep -o '0x[a-fA-F0-9]\\{40\\}' | head -n 1 | tr -d '\\n' || " +
                "grep 'Contract Address:' /tmp/deployment.log | grep -o '0x[a-fA-F0-9]\\{40\\}' | head -n 1 | tr -d '\\n' || " +
                "grep -o '0x[a-fA-F0-9]\\{40\\}' /tmp/deployment.log | tail -n 1 | tr -d '\\n'"
            )
    else:
        # Standard deployment for other networks
        if contract_name == "DeploySpokePoolProxy":
            # Some scripts may not print the exact 'Contract deployed at:' line.
            # Fallback to extracting the last 0x...40-hex address from the output.
            cmd = (
                "forge script " + script_full +
                " --broadcast --json --skip-simulation --via-ir --rpc-url $RPC_URL --private-key $PRIVATE_KEY 2>&1 " +
                "| grep -o '0x[a-fA-F0-9]\\{40\\}' | tail -n 1 | tr -d '\\n'"
            )
        else:
            cmd = (
                "forge script " + script_full +
                " --broadcast --json --skip-simulation --via-ir --rpc-url $RPC_URL --private-key $PRIVATE_KEY 2>&1 " +
                "| grep 'Contract deployed at: ' | grep -o '0x[a-fA-F0-9]\\{40\\}' | head -n 1 | tr -d '\\n'"
            )

    deployment = plan.run_sh(
        name="generic-deployer",
        description="Deploying " + script_full + (" (Kadence)" if network_type == "kadence" else ""),
        image="raveenabhasin/across-mock-contracts:0.0.9",
        env_vars=env_vars,
        run=cmd.strip()
    )

    plan.print("Deployment output (address extraction):")
    plan.print(deployment.output)

    return deployment.output.strip()