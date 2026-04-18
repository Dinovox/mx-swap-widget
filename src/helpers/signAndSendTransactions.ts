import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager';
import { Transaction } from '@multiversx/sdk-core';
import type { TransactionsDisplayInfoType } from '@multiversx/sdk-dapp/out/types/transactions.types';

type SignAndSendTransactionsProps = {
  transactions: Transaction[];
  transactionsDisplayInfo?: TransactionsDisplayInfoType;
};

export const signAndSendTransactions = async ({
  transactions,
  transactionsDisplayInfo,
}: SignAndSendTransactionsProps) => {
  const provider = getAccountProvider();
  const txManager = TransactionManager.getInstance();

  const signedTransactions = await provider.signTransactions(transactions);
  const sentTransactions = await txManager.send(signedTransactions);
  const sessionId = await txManager.track(sentTransactions, {
    transactionsDisplayInfo,
  });

  return sessionId;
};
