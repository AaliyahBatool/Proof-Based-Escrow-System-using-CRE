'use client'

import { useState, useEffect } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { parseEther, isAddress } from 'viem'
import {
  ESCROW_ADDRESS,
  TOKEN_ADDRESS,
  ESCROW_ABI,
  TOKEN_ABI,
  ESCROW_STATES,
  STATE_COLORS,
} from '@/lib/contracts'

export default function AdminPage() {
  const { isConnected } = useAccount()

  const [beneficiary, setBeneficiary] = useState('')
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<
    'idle' | 'approving' | 'creating' | 'confirming' | 'done'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  const { data: escrowCounter } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'escrowCounter',
  })

  const totalEscrows = Number(escrowCounter ?? 0)

  const { data: txHash, writeContract } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    })

  // Wait for approval confirmation → then create escrow
  useEffect(() => {
    if (isConfirming) {
      setStep('confirming')
    }

    if (isConfirmed && step === 'approving') {
      setStep('creating')

      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'createEscrow',
        args: [beneficiary as `0x${string}`, parseEther(amount)],
      })
    }

    if (isConfirmed && step === 'creating') {
      setStep('done')
      setBeneficiary('')
      setAmount('')
    }
  }, [isConfirming, isConfirmed])

  const handleCreateEscrow = async () => {
    setError(null)

    if (!beneficiary || !amount) {
      setError('All fields are required')
      return
    }

    if (!isAddress(beneficiary)) {
      setError('Invalid Ethereum address')
      return
    }

    if (Number(amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    try {
      setStep('approving')

      writeContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [ESCROW_ADDRESS, parseEther(amount)],
      })
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
      setStep('idle')
    }
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ConnectButton />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage escrows and fund disbursement
            </p>
          </div>
          <ConnectButton />
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-500">
            Total Escrows Created
          </p>
          <p className="text-4xl font-bold text-gray-900 mt-1">
            {totalEscrows}
          </p>
        </div>

        {/* Create Escrow */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Escrow
          </h2>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Beneficiary address (0x...)"
              value={beneficiary}
              onChange={e => setBeneficiary(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="number"
              placeholder="Amount (PFUND)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleCreateEscrow}
            disabled={step !== 'idle'}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'idle' && 'Create Escrow'}
            {step === 'approving' && 'Approving tokens...'}
            {step === 'creating' && 'Creating escrow...'}
            {step === 'confirming' && 'Waiting for confirmation...'}
            {step === 'done' && 'Escrow Created!'}
          </button>
        </div>

        {/* Escrow List */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            All Escrows
          </h2>

          {totalEscrows === 0 ? (
            <p className="text-gray-400 text-sm">
              No escrows created yet.
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: totalEscrows }, (_, i) => (
                <EscrowCard key={i + 1} escrowId={i + 1} />
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}

function EscrowCard({ escrowId }: { escrowId: number }) {
  const { data } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'escrows',
    args: [BigInt(escrowId)],
  })

  if (!data) {
    return (
      <div className="text-sm text-gray-400">
        Loading escrow #{escrowId}...
      </div>
    )
  }

  const [id, beneficiary, amount, proofRef, state] =
    data as [bigint, string, bigint, string, number]

  const stateNum = Number(state)

  return (
    <div className="border rounded-lg p-4 space-y-2">

      <div className="flex justify-between items-center">
        <span className="font-medium text-gray-900">
          Escrow #{Number(id)}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${STATE_COLORS[stateNum]}`}
        >
          {ESCROW_STATES[stateNum]}
        </span>
      </div>

      <p className="text-xs text-gray-500 break-all">
        Beneficiary: {beneficiary}
      </p>

      <p className="text-xs text-gray-500">
        Amount: {Number(amount) / 1e18} PFUND
      </p>

      {proofRef && (
        <a
          href={`https://gateway.pinata.cloud/ipfs/${proofRef.replace(
            'ipfs://',
            ''
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline break-all"
        >
          View Proof →
        </a>
      )}

      <a
        href={`https://sepolia.etherscan.io/address/${ESCROW_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:underline"
      >
        View Contract →
      </a>
    </div>
  )
}