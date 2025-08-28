// tests/instagram_test.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SystemProgram, PublicKey, Keypair } from "@solana/web3.js";
import BN from "bn.js";
import { expect } from "chai";
import { InstagramTest } from "../target/types/instagram_test";

describe("InstagramTest - Localnet", () => {
  // usamos local provider
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.InstagramTest as Program<InstagramTest>;

  // usuario de prueba (Keypair generado)
  const user = Keypair.generate();
  let profilePda: PublicKey;

  // helper: derivar PDA de profile
  function deriveProfilePda(userPk: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), userPk.toBuffer()],
      program.programId
    );
  }

  // helper: calcular PDA esperado del siguiente post (a partir del profile.lastPostId + 1)
  async function deriveNextPostPda(userPk: PublicKey, profilePdaLocal: PublicKey): Promise<[PublicKey, number]> {
    const profileAccount = await program.account.profile.fetch(profilePdaLocal);
    const nextId = profileAccount.lastPostId.toNumber() + 1;
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("post"),
        userPk.toBuffer(),
        Buffer.from(new BN(nextId).toArray("le", 8)),
      ],
      program.programId
    );
  }

  before(async () => {
    // airdrop al user (localnet permite airdrops)
    const sig = await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig, "confirmed");

    // derivamos profilePda y creamos profile
    [profilePda] = deriveProfilePda(user.publicKey);

    await program.methods
      .createProfile("erick")
      .accounts({
        user: user.publicKey,
        profile: profilePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const profile = await program.account.profile.fetch(profilePda);
    expect(profile.username).to.equal("erick");
    expect(profile.lastPostId.toNumber()).to.equal(0);
  });

  it("create_post (happy)", async () => {
    // derivamos el PDA que debe usarse (profile.lastPostId + 1)
    const [postPda] = await deriveNextPostPda(user.publicKey, profilePda);

    // llamamos create_post usando el PDA calculado
    await program.methods
      .createPost("https://example.com/img1.jpg")
      .accounts({
        user: user.publicKey,
        profile: profilePda,
        post: postPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // verificamos que el post existe y contiene lo esperado
    const post = await program.account.post.fetch(postPda);
    expect(post.content).to.equal("https://example.com/img1.jpg");
    expect(post.postId.toNumber()).to.equal(1);
    expect(post.likeCount.toNumber()).to.equal(0);
  });

  it("like_post (happy)", async () => {
    // derivamos PDA para el siguiente post (sería post 2)
    const [postPda] = await deriveNextPostPda(user.publicKey, profilePda);

    // creamos un nuevo post (post 2)
    await program.methods
      .createPost("https://example.com/img2.jpg")
      .accounts({
        user: user.publicKey,
        profile: profilePda,
        post: postPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // ahora damos like: derivamos PDA del like (seeds: ["like", post.key(), user.key()])
    const [likePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), postPda.toBuffer(), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .likePost()
      .accounts({
        user: user.publicKey,
        post: postPda,
        like: likePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const post = await program.account.post.fetch(postPda);
    expect(post.likeCount.toNumber()).to.equal(1);
  });

  it("like_post (unhappy - duplicate like)", async () => {
    // derivamos PDA para el siguiente post (post 3)
    const [postPda] = await deriveNextPostPda(user.publicKey, profilePda);

    // creamos post 3
    await program.methods
      .createPost("https://example.com/img3.jpg")
      .accounts({
        user: user.publicKey,
        profile: profilePda,
        post: postPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // derivamos like PDA
    const [likePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), postPda.toBuffer(), user.publicKey.toBuffer()],
      program.programId
    );

    // primer like (debe pasar)
    await program.methods
      .likePost()
      .accounts({
        user: user.publicKey,
        post: postPda,
        like: likePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // segundo like (debe fallar por account already initialized)
    try {
      await program.methods
        .likePost()
        .accounts({
          user: user.publicKey,
          post: postPda,
          like: likePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      throw new Error("Duplicate like should have failed");
    } catch (err: any) {
      // Anchor lanzará error; aquí verificamos que sea por cuenta ya inicializada
      expect(err.toString().toLowerCase()).to.include("already");
    }
  });
});
