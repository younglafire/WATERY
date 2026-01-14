# 🍉 SUI Fruit Merge Game

A fun merge game built on the SUI blockchain where players drop fruits, merge them into bigger ones, and earn seeds (the main currency) to plant on their farm land.

## Project Structure

```
├── contract/          # SUI Move smart contracts
│   ├── sources/       # Contract source files
│   │   ├── types.move       # Shared types, constants, errors
│   │   ├── events.move      # Event definitions
│   │   ├── utils.move       # Utility functions
│   │   ├── game.move        # Core game mechanics
│   │   ├── land.move        # Land & inventory management
│   │   └── fruit_nft.move   # NFT functionality
│   └── tests/         # Contract tests
├── frontend/          # React frontend
│   └── src/
│       └── components/
│           ├── FruitGame.tsx    # Game component
│           └── PlayerLand.tsx   # Farm management
```

## Game Mechanics

### Main Game (Fruit Merge)
1. **Drop fruits** - Click to drop random fruits (level 1-3)
2. **Merge fruits** - Same fruits merge into bigger ones (up to level 10 Watermelon 🍉)
3. **Earn seeds** - Merging larger fruits earns seeds (the main currency)
4. **Claim process** - Press "Claim" then complete 5 more drops to harvest seeds
5. **No more drops after claim** - Once claim is complete, you must harvest or reset

### Farm System
1. **Create account** - Creates land (6 slots) AND inventory automatically
2. **Plant seeds** - Use seeds to plant in land slots
3. **Auto-harvest** - Fruits are auto-harvested to inventory when mature
4. **Upgrade land** - Add more slots using seeds
5. **Buy new lands** - Purchase additional lands using seeds
6. **Upgrade inventory** - Increase storage capacity using seeds

## Building and Publishing Contracts

### Prerequisites
- Install SUI CLI: https://docs.sui.io/guides/developer/getting-started/sui-install

### Build Contracts
```bash
cd contract
sui move build
```

### Run Tests
```bash
cd contract
sui move test
```

### Publish to Testnet
```bash
# Switch to testnet
sui client switch --env testnet

# Ensure you have testnet SUI tokens
sui client faucet

# Publish
cd contract
sui client publish --gas-budget 100000000

# Note the Package ID from the output
```

### Update Package ID in Frontend
After publishing, update the `PACKAGE_ID` constant in:
- `frontend/src/App.tsx`
- `frontend/src/components/FruitGame.tsx`
- `frontend/src/components/PlayerLand.tsx`

```typescript
const PACKAGE_ID = 'YOUR_NEW_PACKAGE_ID'
```

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

## Key Features

- ✅ Seeds as main currency (not SUI tokens)
- ✅ Claim mechanism requires 5 additional drops before harvest
- ✅ Cannot drop after claim is complete (must harvest or reset)
- ✅ Auto-create inventory and land on account creation
- ✅ Auto-harvest to inventory when planting (no extra transaction)
- ✅ Land switching and upgrades using seeds
- ✅ Well-structured contracts following Move best practices

## License

Apache-2.0
