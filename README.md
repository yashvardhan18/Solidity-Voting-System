## Solidity-Voting-System

Solidity-based Voting System with admin-controlled voter registration, candidate management, secure single-vote enforcement, and results queries. Built with Hardhat, tested with Mocha + Chai, deployed to BSC testnet (e.g., BSC testnet) and verifiable on Etherscan.

### Features
- Admin-only voter registration (`registerVoter`)
- Admin-only candidate creation (`addCandidate`)
- Registered voters can vote once (`vote` with double-vote prevention)
- Retrieve candidate details and all candidates
- Determine current winning candidate
- Events: `VoterRegistered`, `CandidateAdded`, `Voted`

### Tech
- Solidity ^0.8.20
- Hardhat (ESM project)
- @nomicfoundation/hardhat-toolbox
- ethers.js v6, Mocha, Chai

---

### Project Structure

```
VotingSystem/
├── contracts/
│   └── Voting.sol
├── test/
│   └── Voting.test.js
├── scripts/
│   ├── deploy.js
│   └── verify.js
├── hardhat.config.js
├── package.json
├── .env.example
└── README.md
```

---

### Prerequisites
- Node.js: 18.x or 20.x recommended (Hardhat may not support Node 22 yet)
- An RPC endpoint for Sepolia (Alchemy/Infura)
- A funded testnet account (MetaMask private key) with some Sepolia ETH
- Etherscan API key (for verification)

---

### Install
```bash
npm install
```

Copy `.env.example` to `.env` and fill in values:
```
BSC_TESTNET_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key_without_0x
ETHERSCAN_API_KEY=your_key
```

---

### Build & Test
```bash
npx hardhat compile
npx hardhat test
```

---

### Deploy (BSC Testnet)
```bash
npx hardhat run scripts/deploy.js --network bsctestnet
```
This will log the deployed contract address.

---

### Verify on Etherscan
You can pass the address as an argument or via env var:
```bash
# Option A: pass address
npx hardhat run scripts/verify.js --network bsctestnet -- 0xYourDeployedAddress

# Option B: env var
export CONTRACT_ADDRESS=0xYourDeployedAddress
npx hardhat run scripts/verify.js --network bsctestnet
```

---

### Contract: `contracts/Voting.sol`
- `registerVoter(address voter)` (only admin)
- `addCandidate(string name)` (only admin)
- `vote(uint candidateId)` (registered voters only, one-time)
- `getCandidate(uint candidateId) -> (id, name, voteCount)`
- `getAllCandidates() -> Candidate[]`
- `getWinningCandidate() -> (id, name, voteCount)`

Events:
- `VoterRegistered(address voter)`
- `CandidateAdded(uint256 candidateId, string name)`
- `Voted(address voter, uint256 candidateId)`

---

### Scripts
- `scripts/deploy.js`: Deploys the contract and prints the address
- `scripts/verify.js`: Verifies the contract on Etherscan

---

### Package Scripts
```json
{
  "compile": "hardhat compile",
  "test": "hardhat test",
  "deploy:sepolia": "hardhat run scripts/deploy.js --network bsctestnet",
  "verify:sepolia": "hardhat run scripts/verify.js --network bsctestnet"
}
```

---

### Deliverables
- Deployed Address (BSC Testnet): `0x999E2f429B2064788CCcAbAd2acAef7fe8359152`
- Explorer Link: `https://testnet.bscscan.com/address/0x999E2f429B2064788CCcAbAd2acAef7fe8359152#code`
- Repo contains contracts, tests, scripts, and this README.

---

### Notes
- Admin is the deployer (`msg.sender`).
- Candidate IDs start at 1.
- `getWinningCandidate` returns the first candidate with the highest votes in case of a tie.

