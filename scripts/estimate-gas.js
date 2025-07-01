const { ethers } = require("hardhat");

async function main() {
  const ArbitragerV2 = await ethers.getContractFactory("ArbitragerV2");
  const tx = await ArbitragerV2.getDeployTransaction(
    "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8", // AAVE_LENDING_POOL_ADDRESSES_PROVIDER
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // UNISWAP_ROUTER
    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", // SUSHISWAP_ROUTER
    "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"  // AAVE_LENDING_POOL_ADDRESSES_PROVIDER
  );
  const [deployer] = await ethers.getSigners();
  const gas = await deployer.estimateGas(tx);
  console.log("Estimated deploy gas:", gas.toString());
}

main();