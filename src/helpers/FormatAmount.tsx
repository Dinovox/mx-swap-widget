import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useGetNetworkConfig } from '@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig';
import BigNumber from 'bignumber.js';
import bigToHex from './bigToHex';

const useGetEsdtInfo = (identifier: string) => {
  const { network } = useGetNetworkConfig();
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    if (!identifier || identifier === 'EGLD') return;
    const id = identifier === 'EGLD' ? 'EGLD-000000' : identifier;
    const cacheKey = `esdt_${id}`;
    const cached = localStorage.getItem(cacheKey);
    const expire = Number(localStorage.getItem(`${cacheKey}_expire`));
    if (cached && Date.now() < expire) { setInfo(JSON.parse(cached)); return; }
    axios.get(`/tokens/${id}`, { baseURL: network.apiAddress })
      .then(({ data }) => {
        setInfo(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_expire`, String(Date.now() + 3_600_000));
      })
      .catch(() => setInfo({}));
  }, [identifier, network.apiAddress]);

  return info;
};

interface FormatAmountProps {
  amount: string | number | BigNumber | null | undefined;
  identifier: string;
  decimals?: number;
  displayDecimals?: number;
  showIdentifier?: boolean;
  nonce?: number;
}

export const FormatAmount: React.FC<FormatAmountProps> = ({
  amount, identifier, decimals: decimalsOverride, displayDecimals, showIdentifier = true, nonce,
}) => {
  const info = useGetEsdtInfo(nonce && nonce > 0 ? '' : identifier);
  const ticker = identifier === 'EGLD' ? 'EGLD' : info?.ticker || identifier;
  const decimals = decimalsOverride !== undefined ? decimalsOverride : identifier === 'EGLD' ? 18 : (info?.decimals || 0);

  if (amount === null || amount === undefined || isNaN(Number(amount))) return <>{`0 ${ticker}`}</>;

  const bnAmount = new BigNumber(amount);
  const value = bnAmount.div(new BigNumber(10).pow(decimals));

  let formatted: string;
  if (displayDecimals !== undefined) {
    formatted = value.toFixed(displayDecimals, BigNumber.ROUND_DOWN);
  } else {
    let dp = decimals < 2 ? decimals : 2;
    if (value.gt(0) && value.lt(0.01)) {
      const magnitude = Math.floor(Math.log10(value.toNumber()));
      dp = Math.min(-magnitude - 1 + 2, decimals);
    }
    formatted = value.toNumber().toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  return (
    <>
      {`${formatted}${showIdentifier ? ' ' + ticker : ''}${showIdentifier && nonce && nonce > 0 ? `-${bigToHex(BigInt(nonce))}` : ''}`}
    </>
  );
};
