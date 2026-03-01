'use client'

import { useState, useEffect } from 'react'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ESCROW_ADDRESS, ESCROW_ABI, ESCROW_STATES, STATE_COLORS } from '@/lib/contracts'

export default function BeneficiaryPage() {
  const { address, isConnected } = useAccount()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedCid, setUploadedCid] = useState('')
  const [step, setStep] = useState<'idle' | 'uploading' | 'submitting' | 'done'>('idle')

  const { writeContract } = useWriteContract()

  // Find escrow belonging to this address
  const { data: escrowCounter } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'escrowCounter',
  })

  const totalEscrows = Number(escrowCounter ?? 0)

  if (!isConnected) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ConnectButton />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Beneficiary Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">View your escrow and submit proof of work</p>
          </div>
          <ConnectButton />
        </div>

        {/* Escrow Cards */}
        {totalEscrows === 0 ? (
          <div className="bg-white rounded-xl border p-6">
            <p className="text-gray-400 text-sm">No escrows found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: totalEscrows }, (_, i) => (
              <BeneficiaryEscrowCard
                key={i + 1}
                escrowId={i + 1}
                connectedAddress={address!}
              />
            ))}
          </div>
        )}

      </div>
    </main>
  )
}

export function BeneficiaryEscrowCard({
  escrowId,
  connectedAddress,
}: {
  escrowId: number
  connectedAddress: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'idle' | 'uploading' | 'submitting' | 'confirming' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const { data: txHash, writeContract } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    })

  const { data, refetch } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'escrows',
    args: [BigInt(escrowId)],
  })

  // Wait for transaction confirmation
  useEffect(() => {
    if (isConfirming) {
      setStep('confirming')
    }

    if (isConfirmed) {
      setStep('done')
      refetch()
      setFile(null)
    }
  }, [isConfirming, isConfirmed, refetch])

  if (!data) return null

  const [id, beneficiary, amount, proofRef, state] =
    data as [bigint, string, bigint, string, number]

  const stateNum = Number(state)

  if (beneficiary.toLowerCase() !== connectedAddress.toLowerCase())
    return null

  const handleUploadAndSubmit = async () => {
    if (!file) return
    setError(null)

    // File validation
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)')
      return
    }

    try {
      setStep('uploading')

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const { cid } = await response.json()
      const proofURI = `ipfs://${cid}`

      setStep('submitting')

      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'submitProof',
        args: [BigInt(escrowId), proofURI],
      })
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setStep('idle')
    }
  }

  const handleReleaseFunds = () => {
    setError(null)

    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'releaseFunds',
      args: [BigInt(escrowId)],
    })
  }

  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Escrow #{Number(id)}
        </h2>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${STATE_COLORS[stateNum]}`}
        >
          {ESCROW_STATES[stateNum]}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm text-gray-600">
        <p>
          Amount:{' '}
          <span className="font-medium text-gray-900">
            {Number(amount) / 1e18} PFUND
          </span>
        </p>

        {proofRef && (
          <a
            href={`https://gateway.pinata.cloud/ipfs/${proofRef.replace(
              'ipfs://',
              ''
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            View Submitted Proof →
          </a>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm border-t pt-3">
          {error}
        </div>
      )}

      {/* Submit Proof */}
      {stateNum === 1 && !proofRef && (
        <div className="space-y-3 border-t pt-4">

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
              id={`file-${escrowId}`}
            />
            <label
              htmlFor={`file-${escrowId}`}
              className="cursor-pointer text-sm text-gray-500"
            >
              {file ? file.name : 'Click to upload proof document'}
            </label>
          </div>

          <button
            onClick={handleUploadAndSubmit}
            disabled={!file || step !== 'idle'}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'uploading' && 'Uploading to IPFS...'}
            {step === 'submitting' && 'Submitting transaction...'}
            {step === 'confirming' && 'Waiting for confirmation...'}
            {step === 'idle' && 'Upload & Submit Proof'}
            {step === 'done' && 'Proof Submitted'}
          </button>
        </div>
      )}

      {/* Release Funds */}
      {stateNum === 3 && (
        <div className="border-t pt-4">
          <button
            onClick={handleReleaseFunds}
            className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Release Funds
          </button>
        </div>
      )}

      {/* Released */}
      {stateNum === 5 && (
        <div className="border-t pt-4">
          <p className="text-green-600 text-sm text-center font-medium">
            ✅ Funds released to your wallet
          </p>
        </div>
      )}

      {/* Rejected */}
      {stateNum === 4 && (
        <div className="border-t pt-4">
          <p className="text-red-600 text-sm text-center font-medium">
            ❌ Proof rejected. Contact admin.
          </p>
        </div>
      )}
    </div>
  )
}