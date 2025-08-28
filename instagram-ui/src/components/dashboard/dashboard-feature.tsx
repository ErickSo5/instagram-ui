import { useInstagramProgram } from '@/utils/solana'
import { useWallet } from '@solana/wallet-adapter-react'
import { web3 } from '@coral-xyz/anchor'

export function DashboardFeature() {
  const program = useInstagramProgram()
  const { publicKey } = useWallet()

  const createProfile = async () => {
    const profilePda = /* aquí calculas tu PDA del profile */

    await program.methods
      .createProfile('erick_dev')
      .accounts({
        user: publicKey,
        profile: profilePda,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc()
  }

  return (
    <div>
      <button onClick={createProfile}>Crear perfil</button>
    </div>
  )
}
