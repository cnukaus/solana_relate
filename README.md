1.npm i

2.npm ts-node -g

3.npm typescript -g

4.按照.env.example 设置主钱包，子钱包.保存文件，子钱包私钥由,隔开

5.在 token_transfer 里设置 transfer_amount 和 token_contract 两项.保存文件

6.ts-node token_transfer.ts

7.质押的话在 jup_token_stake.ts 里修改 amount，然后 ts-node jup_token_stake.ts

8.转 sol 请访问 cointool

9.投票需要预先手动投一票在 tx 详情里查看第二个 instruction 的 side 值，类似 0，1，2，3（代表你会投票给哪个项目）.然后再设置 proposal id，投票链接(https://vote.jup.ag/proposal/2c2Yg1E9BNQVxqg9ZpB2CTBa4GGT8CoeWH6JN7ZQ5FDw)后面的这串数值，然后ts-node jup_gov_vote.ts
