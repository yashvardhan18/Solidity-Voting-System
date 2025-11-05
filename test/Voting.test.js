import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Voting", function () {
  async function deployFixture() {
    const [admin, voter1, voter2, attacker] = await ethers.getSigners();
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.connect(admin).deploy();
    await voting.waitForDeployment();
    return { voting, admin, voter1, voter2, attacker };
  }

  it("sets deployer as admin", async function () {
    const { voting, admin } = await deployFixture();
    const adminAddr = await voting.admin();
    expect(adminAddr).to.equal(admin.address);
  });

  describe("Voter registration", function () {
    it("admin can register voters and emits event", async function () {
      const { voting, voter1, voter2 } = await deployFixture();
      await expect(voting.registerVoter(voter1.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(voter1.address);
      await voting.registerVoter(voter2.address);

      expect(await voting.isRegistered(voter1.address)).to.equal(true);
      expect(await voting.isRegistered(voter2.address)).to.equal(true);
    });

    it("non-admin cannot register voters", async function () {
      const { voting, attacker, voter1 } = await deployFixture();
      await expect(
        voting.connect(attacker).registerVoter(voter1.address)
      ).to.be.revertedWithCustomError(voting, "Unauthorized");
    });

    it("cannot double-register same voter", async function () {
      const { voting, voter1 } = await deployFixture();
      await voting.registerVoter(voter1.address);
      await expect(voting.registerVoter(voter1.address)).to.be.revertedWithCustomError(
        voting,
        "AlreadyRegistered"
      );
    });
  });

  describe("Candidates", function () {
    it("admin can add candidates and emits event", async function () {
      const { voting } = await deployFixture();
      await expect(voting.addCandidate("Alice"))
        .to.emit(voting, "CandidateAdded")
        .withArgs(1, "Alice");
      await voting.addCandidate("Bob");
      expect(await voting.candidateCount()).to.equal(2);
      const c1 = await voting.getCandidate(1);
      expect(c1[1]).to.equal("Alice");
    });

    it("non-admin cannot add candidates", async function () {
      const { voting, attacker } = await deployFixture();
      await expect(
        voting.connect(attacker).addCandidate("Eve")
      ).to.be.revertedWithCustomError(voting, "Unauthorized");
    });

    it("rejects empty candidate name", async function () {
      const { voting } = await deployFixture();
      await expect(voting.addCandidate("")).to.be.revertedWithCustomError(
        voting,
        "NameRequired"
      );
    });
  });

  describe("Voting flow", function () {
    async function setupWithTwoCandidatesAndVoters() {
      const ctx = await deployFixture();
      const { voting, voter1, voter2 } = ctx;
      await voting.addCandidate("Alice");
      await voting.addCandidate("Bob");
      await voting.registerVoter(voter1.address);
      await voting.registerVoter(voter2.address);
      return ctx;
    }

    it("registered voters can vote once", async function () {
      const { voting, voter1, voter2 } = await setupWithTwoCandidatesAndVoters();
      await expect(voting.connect(voter1).vote(1))
        .to.emit(voting, "Voted")
        .withArgs(voter1.address, 1);
      await voting.connect(voter2).vote(2);

      const c1 = await voting.getCandidate(1);
      const c2 = await voting.getCandidate(2);
      expect(c1[2]).to.equal(1n);
      expect(c2[2]).to.equal(1n);
    });

    it("prevents double voting", async function () {
      const { voting, voter1 } = await setupWithTwoCandidatesAndVoters();
      await voting.connect(voter1).vote(1);
      await expect(voting.connect(voter1).vote(2)).to.be.revertedWithCustomError(
        voting,
        "AlreadyVoted"
      );
    });

    it("rejects unregistered voter", async function () {
      const { voting, attacker } = await deployFixture();
      await voting.addCandidate("Alice");
      await expect(voting.connect(attacker).vote(1)).to.be.revertedWithCustomError(
        voting,
        "NotRegistered"
      );
    });

    it("rejects invalid candidate id", async function () {
      const { voting, voter1 } = await deployFixture();
      await voting.registerVoter(voter1.address);
      await expect(voting.connect(voter1).vote(1)).to.be.revertedWithCustomError(
        voting,
        "InvalidCandidate"
      );
    });
  });

  describe("Results", function () {
    it("getAllCandidates returns all", async function () {
      const { voting } = await deployFixture();
      await voting.addCandidate("Alice");
      await voting.addCandidate("Bob");
      const all = await voting.getAllCandidates();
      expect(all.length).to.equal(2);
      expect(all[0][1]).to.equal("Alice");
      expect(all[1][1]).to.equal("Bob");
    });

    it("getWinningCandidate returns the highest votes", async function () {
      const { voting, voter1, voter2 } = await deployFixture();
      await voting.addCandidate("Alice"); // id 1
      await voting.addCandidate("Bob");   // id 2
      await voting.registerVoter(voter1.address);
      await voting.registerVoter(voter2.address);

      await voting.connect(voter1).vote(2);
      await voting.connect(voter2).vote(2);

      const winner = await voting.getWinningCandidate();
      expect(winner[0]).to.equal(2n);
      expect(winner[1]).to.equal("Bob");
      expect(winner[2]).to.equal(2n);
    });
  });
});


