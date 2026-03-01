import EscrowJson from'./Escrow.json'
import FundTokenJson from'./FundToken.json'

export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? '') as `0x${string}`
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? '') as `0x${string}`

export const ESCROW_ABI = EscrowJson.abi
export const TOKEN_ABI = FundTokenJson.abi

export const ESCROW_STATES: Record<number, string> = {
  0: 'CREATED',
  1: 'LOCKED',
  2: 'PROOF_SUBMITTED',
  3: 'APPROVED',
  4: 'REJECTED',
  5: 'RELEASED',
}

export const STATE_COLORS: Record<number, React.CSSProperties> = {
  0: { backgroundColor: '#f3f4f6', color: '#1f2937' },
  1: { backgroundColor: '#fef9c3', color: '#854d0e' },
  2: { backgroundColor: '#dbeafe', color: '#1e40af' },
  3: { backgroundColor: '#dcfce7', color: '#166534' },
  4: { backgroundColor: '#fee2e2', color: '#991b1b' },
  5: { backgroundColor: '#f3e8ff', color: '#6b21a8' },
}