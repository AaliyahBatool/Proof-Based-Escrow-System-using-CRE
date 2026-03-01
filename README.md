# Proof-Gated Escrow

A decentralized escrow system where fund releases are gated by automated off-chain proof verification — powered by Chainlink CRE (Compute Runtime Environment).

No trusted admin needed to approve or reject escrows. The Chainlink network handles it automatically.

---

## How It Works

```
Beneficiary submits proof on-chain
        ↓
ProofSubmitted event emitted
        ↓
Chainlink CRE workflow detects the event
        ↓
Calls verification API (off-chain)
        ↓
Consensus reached across CRE nodes
        ↓
approveEscrow() or rejectEscrow() called on-chain
        ↓
Funds released (or rejected)
```

---

## Architecture

```
contracts/          Solidity smart contracts (Foundry)
  src/
    FundToken.sol   ERC20 token used as escrow currency
    Escrow.sol      Main escrow contract with state machine

proof-gated-escrow/ Chainlink CRE workflow (TypeScript)
  main.ts           Workflow logic: trigger → verify → write
  config.staging.json  Chain + contract config for Sepolia
  workflow.yaml     CRE CLI target configuration
  project.yaml      RPC configuration
```

---

## Escrow State Machine

```
LOCKED → PROOF_SUBMITTED → APPROVED → RELEASED
                         → REJECTED
```

- Admin creates escrow and locks tokens
- Beneficiary submits proof reference (e.g. IPFS hash)
- CRE workflow verifies proof and calls approve/reject
- Beneficiary can release funds if approved

---
## Chainlink CRE Files

| File | Description |
|------|-------------|
| `proof-gated-escrow/main.ts` | CRE workflow — trigger, HTTP verify, consensus, onchain write |
| `proof-gated-escrow/workflow.yaml` | CRE CLI target configuration |
| `proof-gated-escrow/project.yaml` | RPC configuration for CRE CLI |
| `proof-gated-escrow/config.staging.json` | Chain selector and contract addresses |

---

## Contracts (Sepolia Testnet)

| Contract | Address |
|----------|---------|
| FundToken (PFUND) | `0xE26212119267aA5b29576e4042aC1bdc65Aff6cD` |
| Escrow | `0xd1a9CBC265aD9c7812a1a4D25c2356B733b5e379` |

---

## Prerequisites

- [Foundry](https://book.getfoundry.sh/)
- [Bun](https://bun.sh/)
- [CRE CLI](https://github.com/smartcontractkit/cre-cli)
- Node.js 18+
- A Sepolia RPC URL (Alchemy or Infura)
- Sepolia ETH (from a faucet)

---

## Setup

**1. Clone and install**
```bash
git clone <repo>
cd contracts && forge install
cd ../proof-gated-escrow && bun install
```

**2. Configure environment**

In `contracts/.env`:
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
DEPLOYER_ADDRESS=0xYOUR_ADDRESS
```

**3. Deploy contracts**
```bash
cd contracts
source .env && forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --private-key $PRIVATE_KEY
```

Update `proof-gated-escrow/config.staging.json` with the new contract addresses.

**4. Setup escrow and submit proof**
```bash
source .env && forge script script/SetupEscrow.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --private-key $PRIVATE_KEY
```

Note the transaction hash of the `submitProof` call from the output.

**5. Start your verification server**
```bash
# Must be running on localhost:3001
# POST /verify with { proofRef: string } → { valid: boolean }
```

**6. Run the CRE simulation**
```bash
cd proof-gated-escrow
cre workflow simulate . -T staging-settings --evm-tx-hash 0xYOUR_TX_HASH --evm-event-index 0 --non-interactive
```

---

## CRE Workflow

The workflow (`main.ts`) does three things:

**Trigger** — Listens for `ProofSubmitted(uint256 escrowId, address beneficiary, string proofRef)` events on the escrow contract.

**Verify** — POSTs the `proofRef` to your verification API. Uses `consensusIdenticalAggregation` so all CRE nodes must agree on the response before proceeding.

**Write** — Encodes and submits an `approveEscrow` or `rejectEscrow` call on-chain via a signed Chainlink report.

---

## Security Notes

- `onlyWorkflow` modifier ensures only the Chainlink forwarder can call `approveEscrow`/`rejectEscrow`
- In production, `workflowAddress` should be set to the Chainlink Forwarder contract (`0xF8344CFd5c43616a4366C34E3EEE75af79a74482` on Sepolia)

---

## Built With

- [Chainlink CRE SDK](https://docs.chain.link/cre)
- [Foundry](https://book.getfoundry.sh/)
- [viem](https://viem.sh/)
- Solidity 0.8.20
