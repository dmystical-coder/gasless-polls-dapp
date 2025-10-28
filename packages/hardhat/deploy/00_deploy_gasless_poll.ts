import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys a contract named "GaslessPoll" using the deployer account and
 * constructor arguments set to the deployer address (which will act as the relayer)
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployGaslessPoll: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("GaslessPoll", {
    from: deployer,
    // Contract constructor arguments - deployer will act as the relayer
    args: [deployer],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const gaslessPoll = await hre.ethers.getContract<Contract>("GaslessPoll", deployer);
  const contractAddress = await gaslessPoll.getAddress();

  console.log("\n✅ GaslessPoll deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("👤 Owner/Relayer:", deployer);

  // Display contract configuration
  const minDuration = await gaslessPoll.MIN_POLL_DURATION();
  const maxDuration = await gaslessPoll.MAX_POLL_DURATION();
  const maxQuestionLength = await gaslessPoll.MAX_QUESTION_LENGTH();

  console.log("\n⚙️  Contract Configuration:");
  console.log(`   Min Poll Duration: ${minDuration} seconds (${Number(minDuration) / 3600} hours)`);
  console.log(`   Max Poll Duration: ${maxDuration} seconds (${Number(maxDuration) / 86400} days)`);
  console.log(`   Max Question Length: ${maxQuestionLength} characters`);

  console.log("\n📝 Next Steps:");
  console.log("   1. Update your relayer .env with the new contract address");
  console.log("   2. Frontend will auto-update via deployedContracts.ts");
  console.log("   3. Polls now auto-expire based on duration - no manual closure needed!");
  console.log("\n");
};

export default deployGaslessPoll;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags GaslessPoll
deployGaslessPoll.tags = ["GaslessPoll"];
