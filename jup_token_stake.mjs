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
import stkae_program_idl from "./locked_voter.json";
import "dotenv/config";

const stake_amount = 1;
const receivers_keys = process.env.receive_wallets_keys.split(",");

const solana_rpc = "https://api.mainnet-beta.solana.com";

const mainnet_connection = new Connection(solana_rpc, {
  commitment: "confirmed",
});

const vote_pub_key = new PublicKey(
  "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
);

const jup_token_address = new PublicKey(
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"
);

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const stake_program = new anchor.Program(`{
  "version": "0.1.0",
  "name": "locked_voter",
  "docs": ["Locked voter program."],
  "instructions": [
    {
      "name": "newLocker",
      "docs": ["Creates a new [Locker]."],
      "accounts": [
        { "name": "base", "isMut": false, "isSigner": true, "docs": ["Base."] },
        {
          "name": "locker",
          "isMut": true,
          "isSigner": false,
          "docs": ["[Locker]."]
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false,
          "docs": ["Mint of the token that can be used to join the [Locker]."]
        },
        {
          "name": "governor",
          "isMut": false,
          "isSigner": false,
          "docs": ["[Governor] associated with the [Locker]."]
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true,
          "docs": ["Payer of the initialization."]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false,
          "docs": ["System program."]
        }
      ],
      "args": [{ "name": "params", "type": { "defined": "LockerParams" } }]
    },
    {
      "name": "newEscrow",
      "docs": [
        "Creates a new [Escrow] for an account.",
        "",
        "A Vote Escrow, or [Escrow] for short, is an agreement between an account (known as the `authority`) and the DAO to",
        "lock up tokens for a specific period of time, in exchange for voting rights",
        "linearly proportional to the amount of votes given."
      ],
      "accounts": [
        {
          "name": "locker",
          "isMut": true,
          "isSigner": false,
          "docs": ["[Locker]."]
        },
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false,
          "docs": ["[Escrow]."]
        },
        { "name": "escrowOwner", "isMut": false, "isSigner": false },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true,
          "docs": ["Payer of the initialization."]
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false,
          "docs": ["System program."]
        }
      ],
      "args": []
    },
    {
      "name": "increaseLockedAmount",
      "docs": ["increase locked amount [Escrow]."],
      "accounts": [
        {
          "name": "locker",
          "isMut": true,
          "isSigner": false,
          "docs": ["[Locker]."]
        },
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false,
          "docs": ["[Escrow]."]
        },
        {
          "name": "escrowTokens",
          "isMut": true,
          "isSigner": false,
          "docs": ["Token account held by the [Escrow]."]
        },
        {
          "name": "payer",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "Authority [Self::source_tokens], Anyone can increase amount for user"
          ]
        },
        {
          "name": "sourceTokens",
          "isMut": true,
          "isSigner": false,
          "docs": ["The source of deposited tokens."]
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false,
          "docs": ["Token program."]
        }
      ],
      "args": [{ "name": "amount", "type": "u64" }]
    },
    {
      "name": "extendLockDuration",
      "docs": ["extend locked duration [Escrow]."],
      "accounts": [
        {
          "name": "locker",
          "isMut": false,
          "isSigner": false,
          "docs": ["[Locker]."]
        },
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false,
          "docs": ["[Escrow]."]
        },
        {
          "name": "escrowOwner",
          "isMut": false,
          "isSigner": true,
          "docs": ["Authority of the [Escrow] and"]
        }
      ],
      "args": [{ "name": "duration", "type": "i64" }]
    },
    {
      "name": "toggleMaxLock",
      "docs": ["toogle max lock [Escrow]."],
      "accounts": [
        {
          "name": "locker",
          "isMut": false,
          "isSigner": false,
          "docs": ["[Locker]."]
        },
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false,
          "docs": ["[Escrow]."]
        },
        {
          "name": "escrowOwner",
          "isMut": false,
          "isSigner": true,
          "docs": ["Authority of the [Escrow] and"]
        }
      ],
      "args": [{ "name": "isMaxLock", "type": "bool" }]
    },
    {
      "name": "withdraw",
      "docs": [
        "Exits the DAO; i.e., withdraws all staked tokens in an [Escrow] if the [Escrow] is unlocked."
      ],
      "accounts": [
        {
          "name": "locker",
          "isMut": true,
          "isSigner": false,
          "docs": ["The [Locker] being exited from."]
        },
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false,
          "docs": ["The [Escrow] that is being closed."]
        },
        {
          "name": "escrowOwner",
          "isMut": false,
          "isSigner": true,
          "docs": ["Authority of the [Escrow]."]
        },
        {
          "name": "escrowTokens",
          "isMut": true,
          "isSigner": false,
          "docs": ["Tokens locked up in the [Escrow]."]
        },
        {
          "name": "destinationTokens",
          "isMut": true,
          "isSigner": false,
          "docs": ["Destination for the tokens to unlock."]
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true,
          "docs": ["The payer to receive the rent refund."]
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false,
          "docs": ["Token program."]
        }
      ],
      "args": []
    },
    {
      "name": "activateProposal",
      "docs": ["Activates a proposal in token launch phase"],
      "accounts": [
        {
          "name": "locker",
          "isMut": false,
          "isSigner": false,
          "docs": ["The [Locker]."]
        },
        {
          "name": "governor",
          "isMut": false,
          "isSigner": false,
          "docs": ["The [Governor]."]
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false,
          "docs": ["The [Proposal]."]
        },
        {
          "name": "governProgram",
          "isMut": false,
          "isSigner": false,
          "docs": ["The [govern] program."]
        },
        {
          "name": "smartWallet",
          "isMut": false,
          "isSigner": true,
          "docs": ["The smart wallet on the [Governor]."]
        }
      ],
      "args": []
    },
    {
      "name": "castVote",
      "docs": ["Casts a vote."],
      "accounts": [
        {
          "name": "locker",
          "isMut": false,
          "isSigner": false,
          "docs": ["The [Locker]."]
        },
        {
          "name": "escrow",
          "isMut": false,
          "isSigner": false,
          "docs": ["The [Escrow] that is voting."]
        },
        {
          "name": "voteDelegate",
          "isMut": false,
          "isSigner": true,
          "docs": ["Vote delegate of the [Escrow]."]
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false,
          "docs": ["The [Proposal] being voted on."]
        },
        {
          "name": "vote",
          "isMut": true,
          "isSigner": false,
          "docs": ["The [Vote]."]
        },
        {
          "name": "governor",
          "isMut": false,
          "isSigner": false,
          "docs": ["The [Governor]."]
        },
        {
          "name": "governProgram",
          "isMut": false,
          "isSigner": false,
          "docs": ["The [govern] program."]
        }
      ],
      "args": [{ "name": "side", "type": "u8" }]
    },
    {
      "name": "setVoteDelegate",
      "docs": ["Delegate escrow vote."],
      "accounts": [
        {
          "name": "escrow",
          "isMut": true,
          "isSigner": false,
          "docs": ["The [Escrow]."]
        },
        {
          "name": "escrowOwner",
          "isMut": false,
          "isSigner": true,
          "docs": ["The owner of the [Escrow]."]
        }
      ],
      "args": [{ "name": "newDelegate", "type": "publicKey" }]
    },
    {
      "name": "setLockerParams",
      "docs": ["Set locker params."],
      "accounts": [
        {
          "name": "locker",
          "isMut": true,
          "isSigner": false,
          "docs": ["The [Locker]."]
        },
        {
          "name": "governor",
          "isMut": false,
          "isSigner": false,
          "docs": ["The [Governor]."]
        },
        {
          "name": "smartWallet",
          "isMut": false,
          "isSigner": true,
          "docs": ["The smart wallet on the [Governor]."]
        }
      ],
      "args": [{ "name": "params", "type": { "defined": "LockerParams" } }]
    }
  ],
  "accounts": [
    {
      "name": "Locker",
      "docs": ["A group of [Escrow]s."],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "base",
            "docs": ["Base account used to generate signer seeds."],
            "type": "publicKey"
          },
          { "name": "bump", "docs": ["Bump seed."], "type": "u8" },
          {
            "name": "tokenMint",
            "docs": ["Mint of the token that must be locked in the [Locker]."],
            "type": "publicKey"
          },
          {
            "name": "lockedSupply",
            "docs": ["Total number of tokens locked in [Escrow]s."],
            "type": "u64"
          },
          {
            "name": "totalEscrow",
            "docs": ["Total number of escrow"],
            "type": "u64"
          },
          {
            "name": "governor",
            "docs": ["Governor associated with the [Locker]."],
            "type": "publicKey"
          },
          {
            "name": "params",
            "docs": ["Mutable parameters of how a [Locker] should behave."],
            "type": { "defined": "LockerParams" }
          },
          {
            "name": "buffers",
            "docs": ["buffer for further use"],
            "type": { "array": ["u128", 32] }
          }
        ]
      }
    },
    {
      "name": "Escrow",
      "docs": ["Locks tokens on behalf of a user."],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "locker",
            "docs": ["The [Locker] that this [Escrow] is part of."],
            "type": "publicKey"
          },
          {
            "name": "owner",
            "docs": [
              "The key of the account that is authorized to stake into/withdraw from this [Escrow]."
            ],
            "type": "publicKey"
          },
          { "name": "bump", "docs": ["Bump seed."], "type": "u8" },
          {
            "name": "tokens",
            "docs": ["The token account holding the escrow tokens."],
            "type": "publicKey"
          },
          {
            "name": "amount",
            "docs": ["Amount of tokens staked."],
            "type": "u64"
          },
          {
            "name": "escrowStartedAt",
            "docs": ["When the [Escrow::owner] started their escrow."],
            "type": "i64"
          },
          {
            "name": "escrowEndsAt",
            "docs": [
              "When the escrow unlocks; i.e. the [Escrow::owner] is scheduled to be allowed to withdraw their tokens."
            ],
            "type": "i64"
          },
          {
            "name": "voteDelegate",
            "docs": [
              "Account that is authorized to vote on behalf of this [Escrow].",
              "Defaults to the [Escrow::owner]."
            ],
            "type": "publicKey"
          },
          { "name": "isMaxLock", "docs": ["Max lock"], "type": "bool" },
          {
            "name": "buffers",
            "docs": ["buffer for further use"],
            "type": { "array": ["u128", 10] }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "LockerParams",
      "docs": ["Contains parameters for the [Locker]."],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maxStakeVoteMultiplier",
            "docs": [
              "The weight of a maximum vote lock relative to the total number of tokens locked.",
              "For example, veCRV is 10 because 1 CRV locked for 4 years = 10 veCRV."
            ],
            "type": "u8"
          },
          {
            "name": "minStakeDuration",
            "docs": ["Minimum staking duration."],
            "type": "u64"
          },
          {
            "name": "maxStakeDuration",
            "docs": ["Maximum staking duration."],
            "type": "u64"
          },
          {
            "name": "proposalActivationMinVotes",
            "docs": [
              "Minimum number of votes required to activate a proposal."
            ],
            "type": "u64"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "ExtendLockDurationEvent",
      "fields": [
        { "name": "locker", "type": "publicKey", "index": false },
        { "name": "escrowOwner", "type": "publicKey", "index": false },
        { "name": "tokenMint", "type": "publicKey", "index": false },
        { "name": "lockerSupply", "type": "u64", "index": false },
        { "name": "duration", "type": "i64", "index": false },
        { "name": "prevEscrowEndsAt", "type": "i64", "index": false },
        { "name": "nextEscrowEndsAt", "type": "i64", "index": false },
        { "name": "nextEscrowStartedAt", "type": "i64", "index": false }
      ]
    },
    {
      "name": "IncreaseLockedAmountEvent",
      "fields": [
        { "name": "locker", "type": "publicKey", "index": false },
        { "name": "escrowOwner", "type": "publicKey", "index": false },
        { "name": "tokenMint", "type": "publicKey", "index": false },
        { "name": "amount", "type": "u64", "index": false },
        { "name": "lockerSupply", "type": "u64", "index": false }
      ]
    },
    {
      "name": "NewEscrowEvent",
      "fields": [
        { "name": "escrow", "type": "publicKey", "index": false },
        { "name": "escrowOwner", "type": "publicKey", "index": false },
        { "name": "locker", "type": "publicKey", "index": false },
        { "name": "timestamp", "type": "i64", "index": false }
      ]
    },
    {
      "name": "NewLockerEvent",
      "fields": [
        { "name": "governor", "type": "publicKey", "index": false },
        { "name": "locker", "type": "publicKey", "index": false },
        { "name": "tokenMint", "type": "publicKey", "index": false },
        {
          "name": "params",
          "type": { "defined": "LockerParams" },
          "index": false
        }
      ]
    },
    {
      "name": "LockerSetParamsEvent",
      "fields": [
        { "name": "locker", "type": "publicKey", "index": false },
        {
          "name": "prevParams",
          "type": { "defined": "LockerParams" },
          "index": false
        },
        {
          "name": "params",
          "type": { "defined": "LockerParams" },
          "index": false
        }
      ]
    },
    {
      "name": "SetVoteDelegateEvent",
      "fields": [
        { "name": "escrowOwner", "type": "publicKey", "index": false },
        { "name": "oldDelegate", "type": "publicKey", "index": false },
        { "name": "newDelegate", "type": "publicKey", "index": false }
      ]
    },
    {
      "name": "ExitEscrowEvent",
      "fields": [
        { "name": "escrowOwner", "type": "publicKey", "index": false },
        { "name": "locker", "type": "publicKey", "index": false },
        { "name": "timestamp", "type": "i64", "index": false },
        { "name": "lockerSupply", "type": "u64", "index": false },
        { "name": "releasedAmount", "type": "u64", "index": false }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "LockupDurationTooShort",
      "msg": "Lockup duration must at least be the min stake duration"
    },
    {
      "code": 6001,
      "name": "LockupDurationTooLong",
      "msg": "Lockup duration must at most be the max stake duration"
    },
    {
      "code": 6002,
      "name": "RefreshCannotShorten",
      "msg": "A voting escrow refresh cannot shorten the escrow time remaining"
    },
    { "code": 6003, "name": "EscrowNotEnded", "msg": "Escrow has not ended" },
    { "code": 6004, "name": "MaxLockIsSet", "msg": "Maxlock is set" },
    {
      "code": 6005,
      "name": "ExpirationIsLessThanCurrentTime",
      "msg": "Cannot set expiration less than the current time"
    },
    { "code": 6006, "name": "LockerIsExpired", "msg": "Locker is expired" },
    {
      "code": 6007,
      "name": "ExpirationIsNotZero",
      "msg": "Expiration is not zero"
    },
    { "code": 6008, "name": "AmountIsZero", "msg": "Amount is zero" }
  ]
}
`, provider);

async function stake_(stake_amount) {
  const receivers_keypairs = receivers_keys.map((key) => create_wallet(key));
  const token_decimal = await getTokenDecimals(jup_token_address);

  for (let keypair of receivers_keypairs) {
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
    const source_token_account = await getTokenAccount(
      jup_token_address,
      keypair.publicKey
    );

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
    const methods = stake_program.methods.newEscrow();
    const first_instruction = await methods
      .accounts({
        escrow: escrow_storage_address,
        escrowOwner: keypair.publicKey,
        locker: new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
        payer: keypair.publicKey,
        systemProgram: new PublicKey("11111111111111111111111111111111"),
      })
      .instruction();
    // const first_instruction = await first_instruction_accounts.instruction();
    // await getAssociatedTokenAddress()
    const second_instruction = createAssociatedTokenAccountInstruction(
      keypair.publicKey,
      escrow_address_token_address,
      escrow_storage_address,
      jup_token_address
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
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: new PublicKey("11111111111111111111111111111111"),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.concat([
        Buffer.from("d8b68f0bdc2656b9", "hex"),
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
    transaction.setSigners(keypair.publicKey);
    transaction.sign(keypair);
    const signature = await mainnet_connection.sendTransaction(transaction, [
      keypair,
    ]);
    console.log(`Transaction Signature: ${signature}`);
  }
}
stake_(stake_amount);

async function stake(stake_amount) {
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
    const new_es_account = Keypair.generate();
    const first_instruction = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey("CVMdMd79no569tjc5Sq7kzz8isbfCcFyBS5TLGsrZ5dN"),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: new_es_account.publicKey,
          isSigner: false,
          isWritable: true,
        },
        // {
        //   pubkey: new PublicKey("2exTK1vzJCsmPm7qzA8p1ij1jmUcnL8ppkWjsUWWQMQQ"),
        //   isWritable: true,
        //   isSigner: false,
        // },
        {
          pubkey: new PublicKey(keypair.publicKey.toString()),
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: new PublicKey(keypair.publicKey.toString()),
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: new PublicKey("11111111111111111111111111111111"),
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.from("d8b68f0bdc2656b9", "hex"),
      // data,
      programId: new PublicKey("voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"),
    });
    // const hexData =

    transaction.add(first_instruction);
    const get_new_es_jup_account = await getOrCreateAssociatedTokenAccount(
      mainnet_connection,
      keypair,
      new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
      new_es_account.publicKey
    );
    const second_instruction = createAssociatedTokenAccountInstruction(
      keypair.publicKey,
      get_new_es_jup_account.address,
      new_es_account.publicKey,
      new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN")
    );
    transaction.add(second_instruction);

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
function serialize_amount_prop(amount) {
  const equipPlayerSchema = borsh.struct([borsh.u64("amount")]);

  const buffer = Buffer.alloc(1000);
  equipPlayerSchema.encode({ amount: new BN(amount, 10) }, buffer);

  const instructionBuffer = buffer.slice(0, equipPlayerSchema.getSpan(buffer));
  // console.log(instructionBuffer);
  return instructionBuffer;
}

// function serialize_

async function getTokenDecimals(mint_address) {
  const info = await mainnet_connection.getParsedAccountInfo(mint_address);
  const decimals = (info.value?.data).parsed.info.decimals;
  return decimals;
}

function create_wallet(private_key) {
  const privateKey = new Uint8Array(bs58.decode(private_key));
  const keypair = Keypair.fromSecretKey(privateKey);
  console.log(
    `Initialized Keypair: Public Key - ${keypair.publicKey.toString()}`
  );
  return keypair;
}

function deriveEscrow(e, t, a) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("Escrow"), e.toBytes(), t.toBytes()],
    a
  );
}

async function getTokenAccount(mint, owner) {
  return await getAssociatedTokenAddress(mint, owner, true);
}
