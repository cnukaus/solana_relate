1.npm i

2.npm ts-node -g

3.npm typescript -g

4.按照.env.example 设置主钱包，子钱包.保存文件，子钱包私钥由,隔开

5.在 token_transfer 里设置 transfer_amount 和 token_contract 两项.保存文件

6.ts-node token_transfer.ts

7.质押的话在 jup_token_stake.ts 里修改 amount，然后 ts-node
