import hardhat from "hardhat";
const { ethers } = hardhat;


async function ensureMinBalance(sender, recipientAddress, minWei, topUpWei) {
  const balance = await sender.provider.getBalance(recipientAddress);
  if (balance >= minWei) return;
  const tx = await sender.sendTransaction({ to: recipientAddress, value: topUpWei });
  await tx.wait();
}

async function main() {
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  // Security: ensure we are on BSC Testnet by chain id (97)
  if (Number(network.chainId) !== 97) {
    throw new Error(`Refusing to run on chainId ${network.chainId}. Expected 97 (BSC Testnet).`);
  }

  const [admin] = await ethers.getSigners();
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv.find((a) => /^0x[0-9a-fA-F]{40}$/.test(a));
  if (!contractAddress) throw new Error("Missing CONTRACT_ADDRESS (env or arg)");

  const voting = await ethers.getContractAt("Voting", contractAddress, admin);

  // Ensure there are at least 2 candidates
  let candidateCount = await voting.candidateCount();
  if (candidateCount < 2n) {
    const tx1 = await voting.addCandidate("Alice");
    await tx1.wait();
    const tx2 = await voting.addCandidate("Bob");
    await tx2.wait();
  }
  candidateCount = await voting.candidateCount();
  if (candidateCount < 2n) throw new Error("Failed to ensure at least two candidates");

  // Helper to check/perform a registration and vote flow for a signer and candidateId
  const performVote = async (signer, candidateId) => {
    const addr = await signer.getAddress();
    const isReg = await voting.isRegistered(addr);
    if (!isReg) {
      const tx = await voting.registerVoter(addr);
      await tx.wait();
    }

    const hasVoted = await voting.hasVoted(addr);
    if (!hasVoted) {
      const votingAs = voting.connect(signer);
      const tx = await votingAs.vote(candidateId);
      const receipt = await tx.wait();
      // Basic event assertion
      const votedEvt = receipt.logs
        .map((l) => {
          try { return voting.interface.parseLog(l); } catch { return null; }
        })
        .filter(Boolean)
        .find((e) => e.name === "Voted");
      if (!votedEvt) throw new Error("Voted event not found in receipt");
    }
  };

  // Try to use separate voter(s) if provided
  const voterPk1 = process.env.VOTER_PRIVATE_KEY;
  const voterPk2 = process.env.VOTER2_PRIVATE_KEY; // optional second voter

  if (voterPk1) {
    const voter1 = new ethers.Wallet(voterPk1, provider);
    // Ensure minimal balance (~0.001 BNB)
    const minWei = ethers.parseEther("0.0002");
    const topUpWei = ethers.parseEther("0.001");
    await ensureMinBalance(admin, await voter1.getAddress(), minWei, topUpWei);

    // Candidate 1
    await performVote(voter1, 1n);

    if (voterPk2) {
      const voter2 = new ethers.Wallet(voterPk2, provider);
      await ensureMinBalance(admin, await voter2.getAddress(), minWei, topUpWei);
      // Candidate 2 (different option)
      await performVote(voter2, 2n);
    }
  } else {
    // Fallback: admin acts as voter (candidate 1)
    await performVote(admin, 1n);
  }

  // Retrieve results
  const all = await voting.getAllCandidates();
  const winner = await voting.getWinningCandidate();

  const summary = {
    network: {
      name: network.name,
      chainId: Number(network.chainId),
    },
    admin: await admin.getAddress(),
    contractAddress,
    candidateCount: Number(candidateCount),
    candidates: all.map((c) => ({ id: Number(c.id), name: c.name, voteCount: Number(c.voteCount) })),
    winner: { id: Number(winner[0]), name: winner[1], voteCount: Number(winner[2]) },
    checks: {
      registration: true,
      voting: true,
      resultsRetrieval: true,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
