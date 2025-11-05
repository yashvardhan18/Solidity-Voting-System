import hardhat from "hardhat";
const { run } = hardhat;

async function main() {
  const provided = process.argv.slice(2).find((a) => /^0x[0-9a-fA-F]{40}$/.test(a));
  const address = provided || process.env.CONTRACT_ADDRESS;
  if (!address) {
    throw new Error(
      "Missing contract address. Provide as arg or set CONTRACT_ADDRESS env."
    );
  }

  console.log(`Verifying contract at: ${address}`);
  await run("verify:verify", {
    address,
    constructorArguments: [],
  });
  console.log("Verification submitted.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


