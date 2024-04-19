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
import { count } from "console";

const proposal_vote_contract = new PublicKey(
  "2c2Yg1E9BNQVxqg9ZpB2CTBa4GGT8CoeWH6JN7ZQ5FDw"
);
const vote_id = 1;

const receivers_keys: string[] = process.env.receive_wallets_keys!.split(",");

const solana_rpc = "https://api.mainnet-beta.solana.com";
// throw Error("stop");
const mainnet_connection = new Connection(solana_rpc, {
  commitment: "confirmed",
});

const vote_pub_key = new PublicKey(
  "GovaE4iu227srtG2s3tZzB4RmWBzw8sTwrCLZz7kN7rY"
);

const jup_token_address = new PublicKey(
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"
);

// const provider = anchor.AnchorProvider.env();
// anchor.setProvider(provider);
// const stake_program = new anchor.Program(stkae_program_idl as any, provider);

async function vote() {
  const receivers_keypairs = receivers_keys.map((key) => create_wallet(key));
  //   const token_decimal = await getTokenDecimals(jup_token_address);
  const counter = 0;
  for (let keypair of receivers_keypairs) {
    console.log("voting start:" + keypair.publicKey.toString());
    const transaction = new Transaction();
    const [gov_storage_address] = deriveVote(
      proposal_vote_contract,
      keypair.publicKey,
      vote_pub_key
    );

    const [escrow_storage_address] = deriveEscrow(
      new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
      keypair.publicKey,
      new PublicKey("voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj")
    );
    // const gov_address_token_address = await getTokenAccount(
    //   jup_token_address,
    //   escrow_storage_address
    // );

    const source_token_account = await getTokenAccount(
      jup_token_address,
      keypair.publicKey
    );

    const first_instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: proposal_vote_contract,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: gov_storage_address,
          isSigner: false,
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
      data: Buffer.concat([
        Buffer.from("a36c9dbd8c500d8f", "hex"),
        serialize_voter(keypair.publicKey),
      ]),
    });
    // const first_instruction = await first_instruction_accounts.instruction();
    // await getAssociatedTokenAddress()

    const third_instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: escrow_storage_address,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: keypair.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: proposal_vote_contract,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: gov_storage_address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new PublicKey("EZjEbaSd1KrTUKHNGhyHj42PxnoK742aGaNNqb9Rcpgu"),
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: vote_pub_key,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.concat([
        Buffer.from("14d40fbd45b44597", "hex"),
        serialize_voteid_prop(vote_id),
      ]),
      // data,
      programId: new PublicKey("voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"),
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
    // transaction.add(second_instruction);
    transaction.add(third_instruction);
    // transaction.add(fourth_instruction);
    transaction.add(computeUnitLimitInstruction);
    transaction.add(computeUnitPriceInstruction);
    let latestBlockhash = await mainnet_connection.getLatestBlockhash(
      "confirmed"
    );

    transaction.recentBlockhash = latestBlockhash.blockhash;
    // transaction.setSigners(keypair.publicKey);
    transaction.sign(keypair);
    const signature = await mainnet_connection.sendTransaction(transaction, [
      keypair,
    ]);
    console.log(`Transaction Signature: ${signature}`);
    console.log(`第${counter}个账号投票成功`);
  }
}
// 0000000000
vote();
// console.log(serialize_amount_prop(100000));
//包含decimal

function serialize_voteid_prop(amount: number) {
  const equipPlayerSchema = borsh.struct([borsh.u8("side")]);

  const buffer = Buffer.alloc(2000);
  equipPlayerSchema.encode(
    {
      side: amount,
    },
    buffer
  );

  const instructionBuffer = buffer.slice(0, equipPlayerSchema.getSpan(buffer));
  // console.log(instructionBuffer);
  return instructionBuffer;
}

function serialize_amount_prop(amount: number) {
  const equipPlayerSchema = borsh.struct([borsh.u64("amount")]);

  const buffer = Buffer.alloc(1000);
  equipPlayerSchema.encode({ amount: new BN(amount, 10) }, buffer);

  const instructionBuffer = buffer.slice(0, equipPlayerSchema.getSpan(buffer));
  // console.log(instructionBuffer);
  return instructionBuffer;
}

// function serialize_

function serialize_voter(voter: PublicKey) {
  const equipPlayerSchema = borsh.struct([borsh.publicKey("voter")]);

  const buffer = Buffer.alloc(2000);
  equipPlayerSchema.encode(
    {
      voter: voter,
    },
    buffer
  );

  const instructionBuffer = buffer.slice(0, equipPlayerSchema.getSpan(buffer));
  // console.log(instructionBuffer);
  return instructionBuffer;
}
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

function deriveVote(e: PublicKey, t: PublicKey, a: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("Vote"), e.toBytes(), t.toBytes()],
    a
  );
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
