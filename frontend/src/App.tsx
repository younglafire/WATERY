import { useState, useEffect, useCallback } from 'react'
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import FruitGame from './components/FruitGame'
import PlayerLand from './components/PlayerLand'
import './App.css'

const PACKAGE_ID = '0x45e50719c020cc81a8d2953a9701119a4e71cc48cad819d456ab48579e19041e'
const CLOCK_OBJECT = '0x6'

type GameTab = 'game' | 'land'

function App() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const [activeTab, setActiveTab] = useState<GameTab>('game')
  
  // Player objects from the new contract structure
  const [playerAccountId, setPlayerAccountId] = useState<string | null>(null)
  const [playerInventoryId, setPlayerInventoryId] = useState<string | null>(null)
  const [landId, setLandId] = useState<string | null>(null)
  const [playerSeeds, setPlayerSeeds] = useState(0)
  const [txStatus, setTxStatus] = useState('')

  // Load player objects from chain
  const loadUserObjects = useCallback(async () => {
    if (!account?.address) {
      setPlayerAccountId(null)
      setPlayerInventoryId(null)
      setLandId(null)
      setPlayerSeeds(0)
      return
    }

    try {
      const objects = await suiClient.getOwnedObjects({
        owner: account.address,
        options: { showType: true, showContent: true },
      })

      let foundAccount: string | null = null
      let foundInventory: string | null = null
      let foundLand: string | null = null
      let seeds = 0

      for (const obj of objects.data) {
        // Only use objects from CURRENT package
        if (obj.data?.type?.includes(PACKAGE_ID)) {
          if (obj.data.type.includes('PlayerAccount')) {
            foundAccount = obj.data.objectId
            const content = obj.data?.content
            if (content && 'fields' in content) {
              seeds = Number((content.fields as { seeds: string }).seeds || 0)
            }
          }
          if (obj.data.type.includes('PlayerInventory')) {
            foundInventory = obj.data.objectId
          }
          if (obj.data.type.includes('PlayerLand')) {
            foundLand = obj.data.objectId
          }
        }
      }
      
      setPlayerAccountId(foundAccount)
      setPlayerInventoryId(foundInventory)
      setLandId(foundLand)
      setPlayerSeeds(seeds)
    } catch (error) {
      console.error('Error loading user objects:', error)
    }
  }, [account?.address, suiClient])

  useEffect(() => {
    loadUserObjects()
  }, [loadUserObjects])

  // Create player account (entry point for new players)
  const createPlayerAccount = async () => {
    setTxStatus('🎮 Creating player account...')
    const tx = new Transaction()
    tx.moveCall({
      target: `${PACKAGE_ID}::player::create_player`,
      arguments: [tx.object(CLOCK_OBJECT)],
    })

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          await suiClient.waitForTransaction({ digest: result.digest })
          setTxStatus('🎉 Account created! Now create your land.')
          await loadUserObjects()
          setTimeout(() => setTxStatus(''), 3000)
        },
        onError: (error) => {
          console.error('Error creating player:', error)
          setTxStatus('Error: ' + error.message)
          setTimeout(() => setTxStatus(''), 5000)
        },
      }
    )
  }

  const handleSeedsHarvested = (seeds: number) => {
    setPlayerSeeds(prev => prev + seeds)
    loadUserObjects()
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>🍉 SUI Fruit Merge</h1>
        <div className="header-right">
          {playerSeeds > 0 && (
            <span className="total-harvested">🌱 Seeds: {playerSeeds}</span>
          )}
          <ConnectButton />
        </div>
      </header>

      {/* Status Banner */}
      {txStatus && (
        <div className="tx-banner">
          {isPending && <span className="spinner">⏳</span>}
          {txStatus}
        </div>
      )}

      {/* Main content */}
      <main className="app-main">
        {/* Create Account Prompt - for new players */}
        {account && !playerAccountId && (
          <div className="create-account-banner">
            <h3>👋 Welcome to SUI Fruit Merge!</h3>
            <p>Create your player account to save seeds and farm!</p>
            <button onClick={createPlayerAccount} disabled={isPending}>
              {isPending ? '⏳ Creating...' : '🎮 Create Player Account'}
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="tab-nav">
          <button
            className={activeTab === 'game' ? 'active' : ''}
            onClick={() => setActiveTab('game')}
          >
            🎮 Game
          </button>
          <button
            className={activeTab === 'land' ? 'active' : ''}
            onClick={() => setActiveTab('land')}
          >
            🌍 Land
          </button>
        </nav>

        {/* Game Tab - ALWAYS playable */}
        {activeTab === 'game' && (
          <div className="game-container">
            <FruitGame
              playerAccountId={playerAccountId ?? undefined}
              onSeedsHarvested={handleSeedsHarvested}
            />
          </div>
        )}

        {/* Land Tab */}
        {activeTab === 'land' && (
          <div className="land-container">
            {account ? (
              <PlayerLand
                playerAccountId={playerAccountId}
                playerInventoryId={playerInventoryId}
                landId={landId}
                playerSeeds={playerSeeds}
                onDataChanged={loadUserObjects}
              />
            ) : (
              <div className="connect-prompt-small">
                <p>🔗 Connect wallet to manage your land</p>
                <ConnectButton />
              </div>
            )}
          </div>
        )}

        {/* Blockchain Info */}
        <div className="blockchain-info">
          <small>
            📦 Package: <a href={`https://suiscan.xyz/testnet/object/${PACKAGE_ID}`} target="_blank" rel="noopener noreferrer">
              {PACKAGE_ID.slice(0, 10)}...
            </a>
          </small>
        </div>
      </main>
    </div>
  )
}

export default App
