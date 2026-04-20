import { useEffect, useState } from 'react';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { useGetNetworkConfig } from '@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig';
import { useGetPendingTransactions } from '@multiversx/sdk-dapp/out/react/transactions/useGetPendingTransactions';
import axios from 'axios';

export const useGetUserESDT = (
  identifier?: string,
  options?: { enabled?: boolean },
) => {
  const { network } = useGetNetworkConfig();
  const [esdtBalance, setEsdtBalance] = useState<any[]>([]);
  const { address } = useGetAccount();
  const enabled = options?.enabled ?? true;

  const transactions = useGetPendingTransactions();
  const hasPendingTransactions = transactions.length > 0;

  const getUserESDT = async () => {
    if (!enabled || hasPendingTransactions || !address) return;

    try {
      const PAGE_SIZE = 1000;

      if (identifier) {
        const { data } = await axios.get<any[]>(`/accounts/${address}/tokens`, {
          baseURL: network.apiAddress,
          params: { size: PAGE_SIZE, identifier },
        });
        setEsdtBalance(data);
        return;
      }

      const all: any[] = [];
      let from = 0;
      while (true) {
        const { data } = await axios.get<any[]>(`/accounts/${address}/tokens`, {
          baseURL: network.apiAddress,
          params: { size: PAGE_SIZE, from },
        });
        all.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      setEsdtBalance(all);
    } catch {
      setEsdtBalance([]);
    }
  };

  useEffect(() => {
    if (!enabled || !address) {
      setEsdtBalance([]);
      return;
    }
    getUserESDT();
  }, [address, hasPendingTransactions, identifier, enabled]);

  return esdtBalance;
};
