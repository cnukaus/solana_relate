import * as borsh from "@coral-xyz/borsh";
import BN from "bn.js";
import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import web3, {
  Connection,
  PublicKey,
  Keypair,
  ParsedAccountData,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  ComputeBudgetInstruction,
  // StakeProgram,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  // getOrCreateAssociatedTokenIns
} from "@solana/spl-token";
import anchor, { Instruction } from "@coral-xyz/anchor";
// import stkae_program_idl from "./locked_voter.json";
import "dotenv/config";

const stake_amount = 0.01;
const receivers_keys: string[] = process.env.receive_wallets_keys!.split(",");

const solana_rpc = "https://api.mainnet-beta.solana.com";
throw Error("stop");
const mainnet_connection = new Connection(solana_rpc, {
  commitment: "confirmed",
});

const vote_pub_key = new PublicKey(
  "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
);

const jup_token_address = new PublicKey(
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"
);

// const provider = anchor.AnchorProvider.env();
// anchor.setProvider(provider);
// const stake_program = new anchor.Program(stkae_program_idl as any, provider);

async function stake_(stake_amount: number) {
  const receivers_keypairs = receivers_keys.map((key) => create_wallet(key));
  const token_decimal = await getTokenDecimals(jup_token_address);

  for (let keypair of receivers_keypairs) {
    console.log(keypair);
    const transaction = new Transaction();
    const [escrow_storage_address] = deriveEscrow(
      new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
      keypair.publicKey,
      vote_pub_key
    );
    const escrow_address_token_address = await getTokenAccount(
      jup_token_address,
      escrow_storage_address
    );
    console.log(escrow_address_token_address);
    console.log(escrow_storage_address);
    const source_token_account = await getTokenAccount(
      jup_token_address,
      keypair.publicKey
    );
    console.log(source_token_account);
    // const first_instruction = (await stake_program.methods
    //   .newEscrow()
    //   .accounts({
    //     escrow: escrow_storage_address,
    //     escrowOwner: keypair.publicKey,
    //     locker: new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
    //     payer: keypair.publicKey,
    //     systemProgram: new PublicKey("11111111111111111111111111111111"),
    //   })
    //   .instruction()) as TransactionInstruction;
    // const methods = stake_program.methods.newEscrow();
    const first_instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: escrow_storage_address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: keypair.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: keypair.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: new PublicKey("11111111111111111111111111111111"),
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: vote_pub_key,
      data: Buffer.from("d8b68f0bdc2656b9", "hex"),
    });
    // const first_instruction = await first_instruction_accounts.instruction();
    // await getAssociatedTokenAddress()
    const second_instruction = createAssociatedTokenAccountInstruction(
      keypair.publicKey,
      escrow_address_token_address,
      escrow_storage_address,
      jup_token_address,
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );

    const third_instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: escrow_storage_address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: escrow_address_token_address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new PublicKey(keypair.publicKey.toString()),
          isSigner: true,
          isWritable: true,
        },

        {
          pubkey: source_token_account,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.concat([
        Buffer.from("05a87635482ecb92", "hex"),
        serialize_amount_prop(stake_amount * Math.pow(10, token_decimal)),
      ]),
      // data,
      programId: vote_pub_key,
    });
    const fourth_instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
          isSigner: false,
          isWritable: true,
        },
        { pubkey: escrow_storage_address, isSigner: false, isWritable: true },
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      ],
      programId: vote_pub_key,
      data: Buffer.from("a39da184b36b7f8f01", "hex"),
    });
    const computeUnitLimitInstruction =
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 150000, // 例如，设置计算单元限制为200000
      });

    // 设置计算单元价格
    const computeUnitPriceInstruction =
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 53620, // 例如，设置计算单元价格为1000 microLamports
      });
    transaction.add(first_instruction);
    transaction.add(second_instruction);
    transaction.add(third_instruction);
    transaction.add(fourth_instruction);
    transaction.add(computeUnitLimitInstruction);
    transaction.add(computeUnitPriceInstruction);
    let latestBlockhash = await mainnet_connection.getLatestBlockhash(
      "confirmed"
    );

    transaction.recentBlockhash = latestBlockhash.blockhash;
    // transaction.setSigners(keypair.publicKey);
    transaction.sign(keypair);
    console.log("hello");
    const signature = await mainnet_connection.sendTransaction(transaction, [
      keypair,
    ]);
    console.log(`Transaction Signature: ${signature}`);
  }
}
// 0000000000
stake_(stake_amount);
// console.log(serialize_amount_prop(100000));
//包含decimal
function serialize_amount_prop(amount: number) {
  const equipPlayerSchema = borsh.struct([borsh.u64("amount")]);

  const buffer = Buffer.alloc(1000);
  equipPlayerSchema.encode({ amount: new BN(amount, 10) }, buffer);

  const instructionBuffer = buffer.slice(0, equipPlayerSchema.getSpan(buffer));
  // console.log(instructionBuffer);
  return instructionBuffer;
}

// function serialize_

async function getTokenDecimals(mint_address: PublicKey): Promise<number> {
  const info = await mainnet_connection.getParsedAccountInfo(mint_address);
  const decimals = (info.value?.data as ParsedAccountData).parsed.info
    .decimals! as number;
  return decimals;
}

function create_wallet(private_key: string) {
  const privateKey = new Uint8Array(bs58.decode(private_key));
  const keypair = Keypair.fromSecretKey(privateKey);
  console.log(
    `Initialized Keypair: Public Key - ${keypair.publicKey.toString()}`
  );
  return keypair;
}

function deriveEscrow(e: PublicKey, t: PublicKey, a: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("Escrow"), e.toBytes(), t.toBytes()],
    a
  );
}

async function getTokenAccount(mint: PublicKey, owner: PublicKey) {
  return await getAssociatedTokenAddress(mint, owner, true);
}
