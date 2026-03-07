import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Telika Verification Contract Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Deployer:  ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:   ${ethers.formatEther(balance)} ETH/MATIC`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Deploy TelikaVerification
  console.log("\n⏳ Deploying TelikaVerification...");
  const TelikaVerification = await ethers.getContractFactory("TelikaVerification");
  const contract = await TelikaVerification.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`✅ TelikaVerification deployed to: ${contractAddress}`);

  // Verify roles
  const ANCHOR_ROLE = await contract.ANCHOR_ROLE();
  const hasAnchorRole = await contract.hasRole(ANCHOR_ROLE, deployer.address);
  console.log(`✅ Deployer has ANCHOR_ROLE: ${hasAnchorRole}`);

  const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  console.log(`✅ Deployer has DEFAULT_ADMIN_ROLE: ${hasAdminRole}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deployment Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Contract: ${contractAddress}`);
  console.log(`  Network:  ${(await ethers.provider.getNetwork()).name}`);
  console.log(`  Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📋 Add this to your .env file:");
  console.log(`  CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
