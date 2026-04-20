import { createContext, useContext } from 'react';
import type { SwapView } from '../hooks/useSwapView';

type GoTo = (target: SwapView, searchParams?: Record<string, string>) => void;

const SwapViewContext = createContext<GoTo>(() => {});

export const SwapViewProvider = SwapViewContext.Provider;
export const useGoTo = () => useContext(SwapViewContext);
