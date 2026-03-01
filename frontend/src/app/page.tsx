'use client'

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS?.toLowerCase()

export default function Home() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (isConnected && address){
      if(address.toLowerCase() === ADMIN_ADDRESS){
        router.push('/admin')
      } else {
        router.push('/beneficiary')
      }
    }
  }, [isConnected, address, router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 max-w-lg px-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Proof-Gated Escrow
        </h1>
        <p className="text-lg text-gray-600">
          A decentralized fund disbursement system. Funds are released automatically only after verified proof of work — no middleman needed.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
        <p className="text-sm text-gray-400">
          Connect as admin to manage escrows. Connect as beneficiary to submit proof and claim funds.
        </p>
      </div>
    </main>
  )
}