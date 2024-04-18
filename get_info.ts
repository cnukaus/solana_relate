// const web3 = require('@solana/web3.js');
import web3 from "@solana/web3.js";
async function getTransactionInstructions(txHash: string) {
  const connection = new web3.Connection(
    web3.clusterApiUrl("mainnet-beta"),
    "confirmed"
  );

  // 获取交易详情
  const transactionDetails = await connection.getParsedTransaction(txHash);

  if (transactionDetails) {
    console.log(transactionDetails.transaction.message.instructions);
    // console.log("Transaction Details:", transactionDetails);
    //     transactionDetails.transaction.message.instructions.forEach(
    //       (instruction, index) => {
    //         console.log(instruction);
    //       }
    //     );
    //   } else {
    //     console.log("No transaction found with that hash.");
    //   }
  }
}

// 示例用法：替换'TransactionHashHere'为你的实际交易哈希
const transactionHash =
  "4s48QaCiKj6PwdCH1QjgAEfpoWFNEjv84puH8KMYxvHGqyxiCTMzmzVHafhqx8KW9ATXBhki5vXjGukrY5Z1kMPB";
getTransactionInstructions(transactionHash);
