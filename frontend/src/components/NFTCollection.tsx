import { useState, useEffect } from 'react'
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { useSponsoredTransaction } from '../hooks/useSponsoredTransaction'
import { PACKAGE_ID } from '../config/sui'

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

  const fetchNFTs = async () => {
    if (!account?.address) return
    setIsLoading(true)
    try {
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
    } catch (err) { console.error('Error fetching NFTs:', err) } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchNFTs() }, [account?.address, suiClient])

  const getRarityName = (rarity: number) => {
    switch (rarity) {
      case 1: return 'Common'; case 2: return 'Uncommon'; case 3: return 'Rare'; case 4: return 'Epic'; case 5: return 'Legendary'; default: return 'Common'
    }
  }

  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 1: return '#a0a0a0'; case 2: return '#2ecc71'; case 3: return '#3498db'; case 4: return '#9b59b6'; case 5: return '#f1c40f'; default: return '#a0a0a0'
    }
  }

  const handleTransfer = async () => {
    if (!selectedNft || !transferAddress || !account) return
    setTxStatus('⏳ Transferring NFT...')
    try {
      const tx = new Transaction()
      tx.moveCall({ target: `${PACKAGE_ID}::fruit_nft::transfer_nft`, arguments: [tx.object(selectedNft.id), tx.pure.address(transferAddress)] })
      signAndExecute({ transaction: tx }, {
        onSuccess: async (result) => {
          await suiClient.waitForTransaction({ digest: result.digest })
          setTxStatus('✅ Transfer Successful!'); setSelectedNft(null); setTransferAddress(''); fetchNFTs(); setTimeout(() => setTxStatus(''), 3000)
        },
        onError: (err) => { console.error(err); setTxStatus('❌ Transfer Failed'); setTimeout(() => setTxStatus(''), 3000) }
      })
    } catch (e) { console.error(e); setTxStatus('❌ Error creating transaction') }
  }

  return (
    <div className="nft-collection-container">
      <div className="header-section">
        <h2>💎 My Collection</h2>
        <p>Your unique blockchain artifacts</p>
      </div>

      {txStatus && <div className={`tx-status ${txStatus.includes('Failed') ? 'error' : 'success'}`}>{isPending && <span className="spinner">⏳</span>} {txStatus}</div>}

      {isLoading ? <div className="loading">Loading artifacts...</div> : nfts.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🖼️</div><h3>No NFTs yet</h3><p>Mint fruits from your inventory!</p></div>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft) => {
            const fruitInfo = FRUITS.find(f => f.level === nft.fruit_type)
            return (
              <div key={nft.id} className={`nft-card rarity-${nft.rarity}`} onClick={() => setSelectedNft(nft)}
                style={{ 
                  '--card-color': getRarityColor(nft.rarity),
                  borderColor: getRarityColor(nft.rarity),
                  background: `linear-gradient(135deg, ${getRarityColor(nft.rarity)}35 0%, ${getRarityColor(nft.rarity)}10 100%)`,
                  boxShadow: `0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px ${getRarityColor(nft.rarity)}40`
                } as any}
              >
                <div className="nft-image-container"><img src={fruitInfo?.image} alt={nft.name} className="nft-img" /></div>
                <div className="nft-content">
                  <div className="nft-badges">
                    <span className="nft-pill rarity" style={{ background: getRarityColor(nft.rarity) }}>{getRarityName(nft.rarity)}</span>
                    <span className="nft-pill weight">{nft.weight >= 1000 ? `${(nft.weight/1000).toFixed(2)}kg` : `${nft.weight}g`}</span>
                  </div>
                  <h3 className="nft-name-pill">{nft.name}</h3>
                  <div className="nft-id">#{nft.id.slice(0, 6)}...{nft.id.slice(-4)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedNft && (
        <div className="modal-overlay" onClick={() => setSelectedNft(null)}>
          <div className="modal-content nft-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedNft(null)}>×</button>
            <div className="modal-split">
              <div className="nft-preview-large" style={{ background: `radial-gradient(circle, ${getRarityColor(selectedNft.rarity)}40 0%, rgba(0,0,0,0) 70%)` }}>
                 <img src={FRUITS.find(f => f.level === selectedNft.fruit_type)?.image} alt={selectedNft.name} />
              </div>
              <div className="nft-info-panel">
                <h2 style={{ color: getRarityColor(selectedNft.rarity), textShadow: `0 0 15px ${getRarityColor(selectedNft.rarity)}60` }}>{selectedNft.name}</h2>
                <p className="nft-desc">{selectedNft.description}</p>
                <div className="stats-grid">
                  <div className="stat-box">
                    <label>Rarity</label>
                    <span style={{ color: getRarityColor(selectedNft.rarity), fontWeight: 900 }}>{getRarityName(selectedNft.rarity)}</span>
                  </div>
                  <div className="stat-box"><label>Weight</label><span>{selectedNft.weight}g</span></div>
                  <div className="stat-box"><label>Type</label><span>{FRUITS.find(f => f.level === selectedNft.fruit_type)?.name}</span></div>
                </div>
                <div className="transfer-section">
                  <h4>🎁 Gift / Transfer</h4>
                  <input type="text" placeholder="Recipient Address (0x...)" value={transferAddress} onChange={(e) => setTransferAddress(e.target.value)} disabled={isPending} />
                  <button className="transfer-btn" onClick={handleTransfer} disabled={!transferAddress || isPending}>{isPending ? 'Sending...' : 'Send NFT'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .nft-collection-container { padding: 20px; color: white; max-width: 1200px; margin: 0 auto; }
        .header-section { text-align: center; margin-bottom: 30px; }
        .header-section h2 { font-size: 2.5rem; text-transform: uppercase; background: linear-gradient(to right, #fff, #aaa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; }
        
        .nft-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 25px; }
        
        .nft-card {
          border-radius: 20px;
          border: 3px solid var(--card-color);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          position: relative;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          transform-style: preserve-3d;
        }
        .nft-card:hover {
          transform: translateY(-10px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 20px var(--card-color);
          z-index: 10;
        }
        
        .nft-image-container { height: 200px; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; }
        .nft-img { max-width: 90%; max-height: 90%; filter: drop-shadow(0 15px 15px rgba(0,0,0,0.4)); transition: transform 0.3s; }
        .nft-card:hover .nft-img { transform: scale(1.1) rotate(5deg); }
        
        .nft-content { padding: 15px; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); border-top: 1px solid rgba(255,255,255,0.1); }
        .nft-badges { display: flex; gap: 8px; margin-bottom: 10px; }
        .nft-pill { padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .nft-pill.weight { background: #34495e; border: 1px solid rgba(255,255,255,0.1); }
        
        .nft-name-pill {
          background: rgba(0,0,0,0.5);
          color: #fff;
          padding: 4px 12px;
          border-radius: 10px;
          display: inline-block;
          margin: 0 0 10px 0; 
          font-size: 1rem; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          text-transform: uppercase; 
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          width: 100%;
          text-align: center;
        }
        .nft-id { font-size: 0.75rem; color: #888; font-family: monospace; text-align: right; }
        
        /* Modal Styles */
        .nft-modal { max-width: 800px; width: 95%; background: #1a1a2e; border: 2px solid #444; box-shadow: 0 0 50px rgba(0,0,0,0.8); }
        .modal-split { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .nft-preview-large { border-radius: 16px; display: flex; align-items: center; justify-content: center; padding: 40px; border: 1px solid rgba(255,255,255,0.1); }
        .nft-preview-large img { width: 100%; max-width: 300px; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.6)); animation: float 6s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        
        .nft-info-panel h2 { font-size: 2rem; margin-bottom: 10px; }
        .nft-desc { color: #ccc; line-height: 1.6; font-style: italic; margin-bottom: 20px; font-size: 1rem; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .stat-box { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        .stat-box label { display: block; font-size: 0.8rem; color: #888; margin-bottom: 5px; text-transform: uppercase; }
        .stat-box span { font-size: 1.1rem; font-weight: bold; color: white; }
        
        .transfer-section { background: rgba(255,255,255,0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); }
        .transfer-section h4 { margin-top: 0; color: #aaa; }
        .transfer-section input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 10px; border: 1px solid #444; background: #0f0f1a; color: white; font-family: monospace; }
        .transfer-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #3498db, #2980b9); border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s; }
        .transfer-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4); }
        .transfer-btn:disabled { background: #444; transform: none; box-shadow: none; cursor: not-allowed; }
        
        @media (max-width: 768px) { .modal-split { grid-template-columns: 1fr; } .nft-preview-large { padding: 20px; } .nft-preview-large img { max-width: 150px; } }
      `}</style>
    </div>
  )
}
