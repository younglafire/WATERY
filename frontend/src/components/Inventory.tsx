import { useState, useEffect, useCallback } from 'react'
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit'

const FRUITS = [
  { level: 1, emoji: '🍒', name: 'Cherry' },
  { level: 2, emoji: '🍇', name: 'Grape' },
  { level: 3, emoji: '🍊', name: 'Orange' },
  { level: 4, emoji: '🍋', name: 'Lemon' },
  { level: 5, emoji: '🍎', name: 'Apple' },
  { level: 6, emoji: '🍐', name: 'Pear' },
  { level: 7, emoji: '🍑', name: 'Peach' },
  { level: 8, emoji: '🍍', name: 'Pineapple' },
  { level: 9, emoji: '🍈', name: 'Melon' },
  { level: 10, emoji: '🍉', name: 'Watermelon' },
]

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']
const RARITY_COLORS = ['#95a5a6', '#3498db', '#9b59b6', '#e74c3c', '#f39c12']

interface InventoryFruit {
  fruitType: number
  rarity: number
  weight: number
  harvestedAt: number
}

interface InventoryProps {
  playerInventoryId: string | null
}

export default function Inventory({ playerInventoryId }: InventoryProps) {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const [inventory, setInventory] = useState<InventoryFruit[]>([])
  const [loading, setLoading] = useState(true)

  // Suppress unused variable warning
  void account

  // Fetch inventory data
  const fetchInventory = useCallback(async () => {
    if (!playerInventoryId) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const inventoryObj = await suiClient.getObject({
        id: playerInventoryId,
        options: { showContent: true }
      })
      
      if (inventoryObj.data?.content && 'fields' in inventoryObj.data.content) {
        const fields = inventoryObj.data.content.fields as Record<string, unknown>
        const fruitsData = fields.fruits as Array<{
          fields?: {
            fruit_type?: string | number
            rarity?: string | number
            weight?: string | number
            harvested_at?: string | number
          }
        }>
        
        const parsedFruits: InventoryFruit[] = fruitsData.map(f => ({
          fruitType: Number(f.fields?.fruit_type || 0),
          rarity: Number(f.fields?.rarity || 0),
          weight: Number(f.fields?.weight || 0),
          harvestedAt: Number(f.fields?.harvested_at || 0),
        }))
        
        // Sort by harvest time (newest first)
        parsedFruits.sort((a, b) => b.harvestedAt - a.harvestedAt)
        
        setInventory(parsedFruits)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }, [playerInventoryId, suiClient])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Group fruits by type
  const groupedFruits = inventory.reduce((acc, fruit) => {
    const key = fruit.fruitType
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(fruit)
    return acc
  }, {} as Record<number, InventoryFruit[]>)

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h2>🎒 My Fruit Inventory</h2>
        <p className="inventory-subtitle">
          Total Fruits: <strong>{inventory.length}</strong>
        </p>
      </div>

      {!playerInventoryId ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Inventory Found</h3>
          <p>Create your player account first to start collecting fruits!</p>
        </div>
      ) : loading ? (
        <div className="loading-state">
          <div className="spinner">⏳</div>
          <p>Loading inventory...</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌱</div>
          <h3>Your Inventory is Empty</h3>
          <p>Play the game or harvest fruits from your farm to fill your inventory!</p>
        </div>
      ) : (
        <div className="inventory-content">
          {/* Grouped view */}
          <div className="fruit-groups">
            {Object.entries(groupedFruits).map(([fruitTypeStr, fruits]) => {
              const fruitType = Number(fruitTypeStr)
              const fruit = FRUITS[fruitType - 1]
              
              return (
                <div key={fruitType} className="fruit-group-card">
                  <div className="fruit-group-header">
                    <div className="fruit-group-icon">{fruit?.emoji}</div>
                    <div className="fruit-group-info">
                      <h3>{fruit?.name || `Fruit ${fruitType}`}</h3>
                      <p className="fruit-count">{fruits.length} collected</p>
                    </div>
                  </div>
                  
                  <div className="fruit-items">
                    {fruits.map((item, idx) => (
                      <div key={idx} className="fruit-item">
                        <div className="fruit-item-image">
                          <div className="fruit-emoji">{fruit?.emoji}</div>
                        </div>
                        <div className="fruit-item-details">
                          <div className="fruit-rarity" style={{ color: RARITY_COLORS[item.rarity] }}>
                            ⭐ {RARITIES[item.rarity]}
                          </div>
                          <div className="fruit-weight">
                            ⚖️ {item.weight}g
                          </div>
                          <div className="fruit-date">
                            🕒 {formatDate(item.harvestedAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stats summary */}
          <div className="inventory-stats">
            <h3>📊 Collection Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Fruits</div>
                <div className="stat-value">{inventory.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Different Types</div>
                <div className="stat-value">{Object.keys(groupedFruits).length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Weight</div>
                <div className="stat-value">
                  {inventory.reduce((sum, f) => sum + f.weight, 0)}g
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Legendary Fruits</div>
                <div className="stat-value">
                  {inventory.filter(f => f.rarity === 4).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
