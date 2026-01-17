import { useState, useEffect } from 'react'
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { useSponsoredTransaction } from '../hooks/useSponsoredTransaction'

// Fruit Assets (tái sử dụng)
import imgCherry from '../assets/fruit/Cherry.png'
import imgGrape from '../assets/fruit/Nho.png'
import imgOrange from '../assets/fruit/Cam.png'
import imgLemon from '../assets/fruit/Chanh.png'
import imgApple from '../assets/fruit/Táo.png'
import imgPear from '../assets/fruit/Lê.png'
import imgPeach from '../assets/fruit/Đào.png'
import imgPineapple from '../assets/fruit/Thơm.png'
import imgMelon from '../assets/fruit/Dưa lưới.png'
import imgWatermelon from '../assets/fruit/Dưa hấu.png'

const PACKAGE_ID = '0x599868f3b4e190173c1ec1d3bd2738239461d617f74fe136a1a2f021fdf02503'
const NFT_TYPE = `${PACKAGE_ID}::fruit_nft::FruitNFT`

const FRUITS = [
  { level: 1, image: imgCherry, name: 'Cherry' },
  { level: 2, image: imgGrape, name: 'Grape' },
  { level: 3, image: imgOrange, name: 'Orange' },
  { level: 4, image: imgLemon, name: 'Lemon' },
  { level: 5, image: imgApple, name: 'Apple' },
  { level: 6, image: imgPear, name: 'Pear' },
  { level: 7, image: imgPeach, name: 'Peach' },
  { level: 8, image: imgPineapple, name: 'Pineapple' },
  { level: 9, image: imgMelon, name: 'Melon' },
  { level: 10, image: imgWatermelon, name: 'Watermelon' },
]

interface FruitNFT {
  id: string
  name: string
  description: string
  fruit_type: number
  rarity: number
  weight: number
  created_by: string
}

export default function NFTCollection() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutate: signAndExecute, isPending } = useSponsoredTransaction()
  
  const [nfts, setNfts] = useState<FruitNFT[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNft, setSelectedNft] = useState<FruitNFT | null>(null)
  const [transferAddress, setTransferAddress] = useState('')
  const [txStatus, setTxStatus] = useState('')

  // Fetch NFTs
  const fetchNFTs = async () => {
    if (!account?.address) return
    setIsLoading(true)
    
    try {
      // Get all objects owned by user filtered by FruitNFT type
      const objects = await suiClient.getOwnedObjects({
        owner: account.address,
        filter: { StructType: NFT_TYPE },
        options: { showContent: true, showDisplay: true }
      })

      const loadedNfts: FruitNFT[] = []
      
      for (const obj of objects.data) {
        if (obj.data?.content?.dataType === 'moveObject') {
          const fields = obj.data.content.fields as any
          loadedNfts.push({
            id: obj.data.objectId,
            name: fields.name || 'Unknown Fruit',
            description: fields.description || '',
            fruit_type: Number(fields.fruit_type || 1),
            rarity: Number(fields.rarity || 1),
            weight: Number(fields.weight || 0),
            created_by: fields.created_by || ''
          })
        }
      }
      
      setNfts(loadedNfts)
    } catch (err) {
      console.error('Error fetching NFTs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNFTs()
  }, [account?.address, suiClient])

  const getRarityName = (rarity: number) => {
    switch (rarity) {
      case 1: return 'Common'
      case 2: return 'Uncommon'
      case 3: return 'Rare'
      case 4: return 'Epic'
      case 5: return 'Legendary'
      default: return 'Common'
    }
  }

  // Get rarity color
  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 1: return '#a0a0a0'
      case 2: return '#2ecc71'
      case 3: return '#3498db'
      case 4: return '#9b59b6'
      case 5: return '#f1c40f'
      default: return '#a0a0a0'
    }
  }

  // Handle Transfer NFT
  const handleTransfer = async () => {
    if (!selectedNft || !transferAddress || !account) return
    
    setTxStatus('⏳ Transferring NFT...')
    
    try {
      const tx = new Transaction()
      tx.moveCall({
        target: `${PACKAGE_ID}::fruit_nft::transfer_nft`,
        arguments: [
          tx.object(selectedNft.id),
          tx.pure.address(transferAddress)
        ]
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            await suiClient.waitForTransaction({ digest: result.digest })
            setTxStatus('✅ Transfer Successful!')
            setSelectedNft(null)
            setTransferAddress('')
            fetchNFTs() // Refresh list
            setTimeout(() => setTxStatus(''), 3000)
          },
          onError: (err) => {
            console.error(err)
            setTxStatus('❌ Transfer Failed')
            setTimeout(() => setTxStatus(''), 3000)
          }
        }
      )
    } catch (e) {
      console.error(e)
      setTxStatus('❌ Error creating transaction')
    }
  }

  return (
    <div className="nft-collection-container">
      <div className="header-section">
        <h2>💎 My Fruit Collection</h2>
        <p>Your unique fruit NFTs minted from the blockchain</p>
      </div>

      {txStatus && (
        <div className={`tx-status ${txStatus.includes('Failed') ? 'error' : 'success'}`}>
          {isPending && <span className="spinner">⏳</span>} {txStatus}
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading your precious fruits...</div>
      ) : nfts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🖼️</div>
          <h3>No NFTs yet</h3>
          <p>Go to your Inventory and mint some fruits!</p>
        </div>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft) => {
            const fruitInfo = FRUITS.find(f => f.level === nft.fruit_type)
            return (
              <div 
                key={nft.id} 
                className={`nft-card rarity-${nft.rarity}`} 
                style={{ 
                  borderColor: getRarityColor(nft.rarity),
                  background: `linear-gradient(135deg, ${getRarityColor(nft.rarity)}20 0%, ${getRarityColor(nft.rarity)}05 100%)`,
                  boxShadow: `0 8px 20px rgba(0,0,0,0.4), inset 0 0 15px ${getRarityColor(nft.rarity)}30`
                }}
                onClick={() => setSelectedNft(nft)}
              >
                <div className="nft-image-container">
                  <img src={fruitInfo?.image} alt={nft.name} className="nft-img" />
                  <div className="nft-badge" style={{ 
                    background: getRarityColor(nft.rarity),
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    boxShadow: `0 2px 0 rgba(0,0,0,0.2)`,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    {getRarityName(nft.rarity)}
                  </div>
                </div>
                <div className="nft-details">
                  <h3 style={{ color: nft.rarity > 1 ? getRarityColor(nft.rarity) : 'white' }}>{nft.name}</h3>
                  <div className="nft-stat">
                    <span>Weight:</span>
                    <strong>{nft.weight >= 1000 ? `${(fruit.weight / 1000).toFixed(2)}kg` : `${nft.weight}g`}</strong>
                  </div>
                  <div className="nft-id">#{nft.id.slice(0, 6)}...{nft.id.slice(-4)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedNft && (
        <div className="modal-overlay" onClick={() => setSelectedNft(null)}>
          <div className="modal-content nft-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedNft(null)}>×</button>
            
            <div className="modal-split">
              <div className="nft-preview-large">
                 <img 
                   src={FRUITS.find(f => f.level === selectedNft.fruit_type)?.image} 
                   alt={selectedNft.name} 
                 />
              </div>
              
              <div className="nft-info-panel">
                <h2 style={{ color: getRarityColor(selectedNft.rarity) }}>{selectedNft.name}</h2>
                <p className="nft-desc">{selectedNft.description}</p>
                
                <div className="stats-grid">
                  <div className="stat-box">
                    <label>Rarity</label>
                    <span style={{ 
                      backgroundColor: getRarityColor(selectedNft.rarity),
                      color: '#fff',
                      padding: '2px 10px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.2)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}>{getRarityName(selectedNft.rarity)}</span>
                  </div>
                  <div className="stat-box">
                    <label>Weight</label>
                    <span>{selectedNft.weight}g</span>
                  </div>
                  <div className="stat-box">
                    <label>Type</label>
                    <span>{FRUITS.find(f => f.level === selectedNft.fruit_type)?.name}</span>
                  </div>
                </div>

                <div className="transfer-section">
                  <h4>🎁 Gift / Transfer</h4>
                  <input 
                    type="text" 
                    placeholder="Recipient Address (0x...)"
                    value={transferAddress}
                    onChange={(e) => setTransferAddress(e.target.value)}
                    disabled={isPending}
                  />
                  <button 
                    className="transfer-btn"
                    onClick={handleTransfer}
                    disabled={!transferAddress || isPending}
                  >
                    {isPending ? 'Sending...' : 'Send NFT'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .nft-collection-container {
          padding: 20px;
          color: white;
          max-width: 1000px;
          margin: 0 auto;
        }
        .header-section {
          text-align: center;
          margin-bottom: 30px;
        }
        .nft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
        }
        .nft-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .nft-card:hover {
          transform: translateY(-5px);
        }
        .nft-image-container {
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
          position: relative;
          padding: 20px;
        }
        .nft-img {
          max-width: 100%;
          max-height: 100%;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
        }
        .nft-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          color: #000;
          text-transform: uppercase;
        }
        .nft-details {
          padding: 15px;
        }
        .nft-details h3 {
          margin: 0 0 10px 0;
          font-size: 1.1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nft-stat {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #ccc;
          margin-bottom: 5px;
        }
        .nft-id {
          font-size: 0.8rem;
          color: #666;
          text-align: right;
          font-family: monospace;
        }
        
        /* Modal Styles */
        .nft-modal {
          max-width: 700px;
          width: 90%;
        }
        .modal-split {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
        }
        .nft-preview-large {
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .nft-preview-large img {
          width: 100%;
          max-width: 250px;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 20px 0;
        }
        .stat-box {
          background: rgba(255,255,255,0.05);
          padding: 10px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-box label {
          display: block;
          font-size: 0.8rem;
          color: #888;
          margin-bottom: 4px;
        }
        .stat-box span {
          font-weight: bold;
          font-size: 1rem;
        }
        .nft-desc {
          color: #ccc;
          font-style: italic;
          line-height: 1.5;
        }
        .transfer-section {
          background: rgba(255,255,255,0.05);
          padding: 15px;
          border-radius: 12px;
          margin-top: 20px;
        }
        .transfer-section input {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border-radius: 8px;
          border: 1px solid #444;
          background: #222;
          color: white;
        }
        .transfer-btn {
          width: 100%;
          padding: 10px;
          background: linear-gradient(90deg, #3498db, #2980b9);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }
        .transfer-btn:disabled {
          background: #555;
          cursor: not-allowed;
        }
        
        @media (max-width: 600px) {
          .modal-split {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}