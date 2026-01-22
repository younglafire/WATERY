import { getFullnodeUrl } from '@mysten/sui/client'

type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet'

// Centralized Sui environment configuration with sensible defaults for local development.
const defaults = {
  PACKAGE_ID: '0x599868f3b4e190173c1ec1d3bd2738239461d617f74fe136a1a2f021fdf02503',
  CLOCK_OBJECT: '0x6',
  RANDOM_OBJECT: '0x8',
  SEED_ADMIN_CAP: '0x4d1847752f9470d9cd83a6c76b71801c32623b1c095c8d1f666500223cbfd5ac',
  LEADERBOARD_CONFIG_ID: '0xba8c7f6735c3f7d221c056a102be5afa413d444b4c296fb7db4a9f001397943c',
  SPONSOR_PRIVATE_KEY: 'suiprivkey1qzkejytknake27tl58q5ymnvdz63e6zq8cp69x0a3ng89rsvdamuz9kwvqn',
  SUI_NETWORK: 'testnet' as SuiNetwork,
}

type EnvValue = string | undefined
const env = import.meta.env as Record<string, EnvValue>

const getEnv = (key: string, fallback: string): string => env[key] ?? fallback

const network = (env.VITE_SUI_NETWORK as SuiNetwork | undefined) ?? defaults.SUI_NETWORK

export const PACKAGE_ID = getEnv('VITE_PACKAGE_ID', defaults.PACKAGE_ID)
export const CLOCK_OBJECT = getEnv('VITE_CLOCK_OBJECT_ID', defaults.CLOCK_OBJECT)
export const RANDOM_OBJECT = getEnv('VITE_RANDOM_OBJECT_ID', defaults.RANDOM_OBJECT)
export const SEED_ADMIN_CAP = getEnv('VITE_SEED_ADMIN_CAP', defaults.SEED_ADMIN_CAP)
export const LEADERBOARD_CONFIG_ID = getEnv('VITE_LEADERBOARD_CONFIG_ID', defaults.LEADERBOARD_CONFIG_ID)
export const SPONSOR_PRIVATE_KEY = getEnv('VITE_SPONSOR_PRIVATE_KEY', defaults.SPONSOR_PRIVATE_KEY)
export const SUI_NETWORK = network
export const SUI_FULLNODE_URL = getEnv('VITE_SUI_FULLNODE_URL', getFullnodeUrl(network))
