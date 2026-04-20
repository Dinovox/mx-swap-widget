import { useEffect, useState } from 'react';
import axios from 'axios';

export const useGetUserESDT = (
  identifier?: string,
  options?: {
    enabled?: boolean;
    address?: string;
    networkApiAddress?: string;
    refreshKey?: number;
  },
) => {
  const [esdtBalance, setEsdtBalance] = useState<any[]>([]);
  const address = options?.address;
  const apiAddress = options?.networkApiAddress;
  const enabled = options?.enabled ?? true;

  const getUserESDT = async () => {
    if (!enabled || !address || !apiAddress) return;

    try {
      const PAGE_SIZE = 1000;

      if (identifier) {
        const { data } = await axios.get<any[]>(`/accounts/${address}/tokens`, {
          baseURL: apiAddress,
          params: { size: PAGE_SIZE, identifier },
        });
        setEsdtBalance(data);
        return;
      }

      const all: any[] = [];
      let from = 0;
      while (true) {
        const { data } = await axios.get<any[]>(`/accounts/${address}/tokens`, {
          baseURL: apiAddress,
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
  }, [address, identifier, enabled, apiAddress, options?.refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return esdtBalance;
};
