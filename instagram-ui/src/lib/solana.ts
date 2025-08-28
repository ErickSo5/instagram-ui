// src/utils/solana.ts
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor'
import idl from '../target/idl/instagram_test.json'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'

const programID = new web3.PublicKey(idl.metadata.address)

export function useInstagramProgram() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  if (!publicKey) throw new Error('Wallet not connected')

  const provider = new AnchorProvider(
    connection,
    { publicKey, sendTransaction } as any,
    { preflightCommitment: 'processed' }
  )

  const program = new Program(idl, programID, provider)
  return program
}
