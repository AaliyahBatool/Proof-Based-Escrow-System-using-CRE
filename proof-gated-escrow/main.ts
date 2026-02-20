import {
    EVMClient,
    HTTPClient,
    handler,
    getNetwork,
    type Runtime,
    type EVMLog,
    Runner,
    bytesToHex,
    hexToBase64,
    TxStatus,
    consensusIdenticalAggregation,
    ok,
    json,
    type HTTPSendRequester
} from "@chainlink/cre-sdk"

import { keccak256, toBytes, decodeEventLog, parseAbi, encodeFunctionData } from "viem"

type Config = {
    chainSelectorName: string
    escrowAddress: string
    verificationUrl: string
    gasLimit: string
}

const eventAbi = parseAbi([
    "event ProofSubmitted(uint256 indexed escrowId, address indexed beneficiary, string proofRef)"
])

const escrowAbi = parseAbi([
  "function approveEscrow(uint256 escrowId)",
  "function rejectEscrow(uint256 escrowId)"
])


const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {

    //convert topics + data for viem
    const topics = log.topics.map(t => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]]
    const data = bytesToHex(log.data)

    const decoded = decodeEventLog({
        abi: eventAbi,
        data,
        topics,
    })

    const { escrowId, beneficiary, proofRef } = decoded.args

    runtime.log(`EscrowId: ${escrowId}`)
    runtime.log(`ProofRef: ${proofRef}`)

    //http verificatoin
const httpClient = new HTTPClient()

const verificationResult = httpClient
  .sendRequest(
    runtime,
    verifyProof,
    consensusIdenticalAggregation<{ valid: boolean }>()
  )(runtime.config.verificationUrl, proofRef)
  .result()

const isValid = verificationResult.valid === true

    //onchain write
    const network = getNetwork({
        chainFamily: "evm",
        chainSelectorName: runtime.config.chainSelectorName,
        isTestnet: true,
    })

    if(!network) {
        throw new Error("Network not found")
    }

    const evmClient = new EVMClient(network.chainSelector.selector)

    const functionName = isValid ? "approveEscrow" : "rejectEscrow"

    const callData = encodeFunctionData({
        abi: escrowAbi,
        functionName,
        args: [escrowId]
    })

    const report = runtime.report({
        encodedPayload: hexToBase64(callData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
    }).result()

    const writeResp = evmClient.writeReport(runtime, {
        receiver: runtime.config.escrowAddress,
        report,
        gasConfig: {gasLimit: runtime.config.gasLimit },
    }).result()

    if(writeResp.txStatus !== TxStatus.SUCCESS) {
        throw new Error("Write failed")
    }

    runtime.log(`Escrow ${escrowId} ${isValid ? "approved" : "rejected"}`)

    return "Escrow processed"
}

const initWorkflow = (config: Config) => {
    const network = getNetwork({
        chainFamily: "evm",
        chainSelectorName: config.chainSelectorName,
        isTestnet: true,
    })

    if(!network) {
        throw new Error("Network not found")
    }

    const evmClient = new EVMClient(network.chainSelector.selector)

    const proofEventHash = keccak256(
        toBytes("ProofSubmitted(uint256,address,string)")
    )

    return [
        handler(
            evmClient.logTrigger({
                addresses: [hexToBase64(config.escrowAddress)],
                topics: [
                    { values: [hexToBase64(proofEventHash)] }
                ],
                confidence: "CONFIDENCE_LEVEL_FINALIZED",
            }),
            onLogTrigger
        )
    ]
}

export async function main() {
    const runner = await Runner.newRunner<Config>()
    await runner.run(initWorkflow)
}
const verifyProof = (
  sendRequester: HTTPSendRequester,
  url: string,
  proofRef: string
): { valid: boolean } => {

  const bodyBytes = new TextEncoder().encode(
    JSON.stringify({ proofRef })
  )

  const body = Buffer.from(bodyBytes).toString("base64")

  const response = sendRequester
    .sendRequest({
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body,
    })
    .result()

  if (!ok(response)) {
    throw new Error(`Verification failed: ${response.statusCode}`)
  }

  return json(response) as { valid: boolean }
}
