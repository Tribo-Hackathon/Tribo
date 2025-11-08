import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { BASE_CHAIN } from './contracts/config';

export const config = getDefaultConfig({
  appName: 'Creator DAO Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [BASE_CHAIN],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
