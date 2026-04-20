import { getAccountProvider } from '@multiversx/sdk-dapp/out/providers/helpers/accountProvider';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager';
import { Transaction } from '@multiversx/sdk-core';
import type { TransactionsDisplayInfoType } from '@multiversx/sdk-dapp/out/types/transactions.types';

type DisplayInfo = { processingMessage: string; errorMessage: string; successMessage: string };

type SignAndSendTransactionsProps = {
  transactions: Transaction[];
  transactionsDisplayInfo?: TransactionsDisplayInfoType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSignTransactions?: (txs: any[], info: DisplayInfo) => Promise<unknown>;
};

export const signAndSendTransactions = async ({
  transactions,
  transactionsDisplayInfo,
  onSignTransactions,
}: SignAndSendTransactionsProps) => {
  const info: DisplayInfo = {
    processingMessage: transactionsDisplayInfo?.processingMessage ?? '',
    errorMessage: transactionsDisplayInfo?.errorMessage ?? '',
    successMessage: transactionsDisplayInfo?.successMessage ?? '',
  };

  if (onSignTransactions) {
    return onSignTransactions(transactions, info);
  }

  const provider = getAccountProvider();
  const txManager = TransactionManager.getInstance();
  const signedTransactions = await provider.signTransactions(transactions);
  const sentTransactions = await txManager.send(signedTransactions);
  return txManager.track(sentTransactions, { transactionsDisplayInfo });
};
