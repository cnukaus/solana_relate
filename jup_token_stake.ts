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

import "dotenv/config";
const stake_amount = 1;
const receivers_keys: string[] = process.env.receive_wallets_keys!.split(",");

const solana_rpc = "https://api.mainnet-beta.solana.com";

const mainnet_connection = new Connection(solana_rpc, {
  commitment: "confirmed",
});

stake(stake_amount);

async function stake(stake_amount: number) {
  const receivers_keypairs = receivers_keys.map((key) => create_wallet(key));
  const token_decimal = await getTokenDecimals(
    new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN")
  );
  for (let keypair of receivers_keypairs) {
    const transaction = new Transaction();
    const data = serialize_amount_prop(
      stake_amount * Math.pow(10, token_decimal)
    );
    console.log(data);
    let latestBlockhash = await mainnet_connection.getLatestBlockhash(
      "confirmed"
    );
    let sourceAccount = await getOrCreateAssociatedTokenAccount(
      mainnet_connection,
      keypair,
      new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
      keypair.publicKey
    );
    console.log(sourceAccount);
    const first_instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new PublicKey("EqvrJY2ATgyh94SUixgUkjRc1abSnAHV3ifHdGq8KZzp"),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new PublicKey("2exTK1vzJCsmPm7qzA8p1ij1jmUcnL8ppkWjsUWWQMQQ"),
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: new PublicKey(keypair.publicKey.toString()),
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: sourceAccount.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.concat([Buffer.from("05a87635482ecb92", "hex"), data]),
      // data,
      programId: new PublicKey("voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"),
    });
    // const hexData =

    transaction.add(first_instruction);

    // transaction.add(new ComputeBudgetInstruction())
    const computeUnitLimitInstruction =
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 150000, // 例如，设置计算单元限制为200000
      });

    // 设置计算单元价格
    const computeUnitPriceInstruction =
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 53620, // 例如，设置计算单元价格为1000 microLamports
      });
    transaction.add(computeUnitLimitInstruction);
    transaction.add(computeUnitPriceInstruction);
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.setSigners(keypair.publicKey);
    transaction.sign(keypair);
    // const versionedTransaction =
    const signature = await mainnet_connection.sendTransaction(transaction, [
      keypair,
    ]);
    console.log(`Transaction Signature: ${signature}`);
  }
}
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
