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
  // StakeProgram,
} from "@solana/web3.js";
import BufferLayout, {
  u8,
  nu64,
  struct,
  Structure,
} from "@solana/buffer-layout";
import "dotenv/config";
// import {mnemoni}

const main_key: string = process.env.main_wallet_key!;
const receivers_keys: string[] = process.env.receive_wallets_keys!.split(",");

const solana_rpc = "https://api.mainnet-beta.solana.com";

const mainnet_connection = new Connection(solana_rpc, {
  commitment: "confirmed",
});

const transfer_amount = 0.001;
const token_contract = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
//jup地址

main(transfer_amount, token_contract);
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
// getBlockNumber();

async function main(send_amount: number, token_contract: string) {
  // Config priority fee and amount to transfer
  const PRIORITY_RATE = 12345; // MICRO_LAMPORTS
  const transferAmount = send_amount;
  // Instruction to set the compute unit price for priority fee
  const PRIORITY_FEE_INSTRUCTIONS = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: PRIORITY_RATE,
  });
  let fromKeypair = create_wallet(main_key);
  let mint_address = new PublicKey(token_contract);
  let destination_wallets_pub = receivers_keys.map((key) => {
    return new PublicKey(create_wallet(key).publicKey);
  });
  let sourceAccount = await getOrCreateAssociatedTokenAccount(
    mainnet_connection,
    fromKeypair,
    mint_address,
    fromKeypair.publicKey
  );
  console.log(`Destination Account: ${sourceAccount.address.toString()}`);
  let destination_accounts = await Promise.all(
    destination_wallets_pub.map(
      async (i) =>
        await getOrCreateAssociatedTokenAccount(
          mainnet_connection,
          fromKeypair,
          mint_address,
          i
        )
    )
  );
  for (let i of destination_accounts) {
    console.log(`Destination Account: ${i.address.toString()}`);
    const token_decimals = await getTokenDecimals(mint_address);
    const transferAmountInDecimals =
      transferAmount * Math.pow(10, token_decimals);
    const transferInstruction = createTransferInstruction(
      // Those addresses are the Associated Token Accounts belonging to the sender and receiver
      sourceAccount.address,
      i.address,
      fromKeypair.publicKey,
      transferAmountInDecimals
    );
    let latestBlockhash = await mainnet_connection.getLatestBlockhash(
      "confirmed"
    );
    const messageV0 = new TransactionMessage({
      payerKey: fromKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [PRIORITY_FEE_INSTRUCTIONS, transferInstruction],
    }).compileToV0Message();
    const versionedTransaction = new VersionedTransaction(messageV0);
    versionedTransaction.sign([fromKeypair]);
    console.log("Transaction Signed. Preparing to send...");

    // Attempts to send the transaction to the network, handling success or failure.
    try {
      const txid = await mainnet_connection.sendTransaction(
        versionedTransaction,
        {
          maxRetries: 20,
        }
      );
      console.log(`Transaction Submitted: ${txid}`);

      const confirmation = await mainnet_connection.confirmTransaction(
        {
          signature: txid,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed"
      );
      if (confirmation.value.err) {
        throw new Error("🚨Transaction not confirmed.");
      }
      console.log(
        `Transaction Successfully Confirmed! 🎉 View on SolScan: https://solscan.io/tx/${txid}`
      );
    } catch (error) {
      console.error("Transaction failed", error);
    }
  }
}

export { create_wallet };
