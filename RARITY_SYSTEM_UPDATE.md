# Weight-Based Rarity System Implementation

## Overview
The rarity system has been completely redesigned to be based on **weight relative to fruit type** rather than random rolls. This creates more intuitive and rewarding gameplay where:
- A big cherry (small fruit being heavy) = **Legendary** ✨
- A big watermelon (large fruit being heavy) = **Common** 🍉
- An exceptionally massive watermelon = **Legendary** ✨

## Changes Made

### 1. Updated `utils.move` Constants

#### Added Fruit Weight Ranges (in grams)
Each fruit type now has realistic expected weight ranges based on real fruits:

- **Cherry** (🍒): 5-15g
- **Grape** (🍇): 2-5g
- **Orange** (🍊): 130-200g
- **Lemon** (🍋): 60-100g
- **Apple** (🍎): 150-250g
- **Pear** (🍐): 180-280g
- **Peach** (🍑): 120-180g
- **Pineapple** (🍍): 900-1500g
- **Melon** (🍈): 1000-2000g
- **Watermelon** (🍉): 3000-6000g

### 2. New Helper Functions in `utils.move`

#### `get_fruit_weight_range(fruit_type: u8) -> (u64, u64)`
Returns the minimum and maximum expected weight for a given fruit type.

#### `generate_fruit_weight(fruit_type: u8, seeds_planted: u64, random_value: u64) -> u64`
Generates a realistic random weight for a fruit based on:
- The fruit type's normal range
- Number of seeds planted (increases weight potential)
- Randomness for variety

**Weight Generation Logic:**
```
base_weight = random value within normal range
seed_bonus = seeds_planted * range / 100 (each seed adds 1%)
extra_random = additional variance for legendary potential
final_weight = base_weight + seed_bonus + extra_random
```

#### `calculate_weight_based_rarity(fruit_type: u8, weight: u64) -> u8`
Calculates rarity based on how much the weight exceeds the normal range for that fruit type.

**Rarity Calculation:**
- If weight ≤ max_normal: **Common** (50%)
- If 20-50% over normal: **Uncommon** (25%)
- If 50-100% over normal: **Rare** (15%)
- If 100-200% over normal: **Epic** (8%)
- If >200% over normal: **Legendary** (2%)

**Key Feature: Weight Threshold Multiplier**
Different fruit types have different multipliers based on their size:
- Small fruits (cherry, grape): 1x multiplier - easy to become rare
- Medium-small fruits (orange, lemon): 2x multiplier
- Medium fruits (apple, pear, peach): 3x multiplier
- Large fruits (pineapple): 5x multiplier
- Very large fruits (melon, watermelon): 7x multiplier

This means:
- A 30g cherry (2x normal weight) is legendary ✨
- A 14kg watermelon (2x normal weight) is only rare, not legendary
- A 21kg watermelon (3.5x normal weight) would be legendary ✨

### 3. Updated `land.move` Planting Logic

#### `plant_in_slot()` Function
Changed generation order:
1. Generate random fruit_type
2. Generate weight using `generate_fruit_weight()` with seed count
3. Calculate rarity using `calculate_weight_based_rarity()`

#### `plant_all()` Function
Same updated logic applied to batch planting for all empty slots.

**Before:**
```move
fruit_type = random(1-10)
rarity = calculate_rarity(roll, seeds)  // Roll-based
weight = base_weight + seeds*5 + rarity*50  // Rarity affects weight
```

**After:**
```move
fruit_type = random(1-10)
weight = generate_fruit_weight(fruit_type, seeds, random_value)  // Weight-based
rarity = calculate_weight_based_rarity(fruit_type, weight)  // Rarity from weight
```

### 4. Backward Compatibility

The old `calculate_rarity()` function remains in `utils.move` for backward compatibility with existing code that might call it, but it's now deprecated. All new fruit generation uses the weight-based system.

## Game Design Impact

### Seed Economy
- Seeds now have a more direct impact: more seeds = heavier fruits = potential for higher rarity
- Encourages players to invest seeds strategically
- Each seed adds 1% to potential weight range

### Rarity Distribution
- **Common** (≤ normal weight): ~50% of fruits
- **Uncommon** (slightly heavy): ~25%
- **Rare** (significantly heavy): ~15%
- **Epic** (very heavy): ~8%
- **Legendary** (exceptionally heavy): ~2%

Distribution matches the difficulty of achieving each rarity tier.

### Gameplay Loop
1. Player plants fruit with N seeds
2. Fruit grows, weight is determined by randomness + seeds
3. Rarity calculated based on weight relative to fruit type
4. Player can see the relationship: heavier fruit = rarer
5. Encourages experimenting with different seed counts

## Testing Examples

### Cherry Test
```
Expected range: 5-15g
Normal weight: 12g → Common (yellow/gray)
Slightly heavy: 16g → Uncommon (blue)
Heavy: 20g → Rare (purple)
Very heavy: 26g → Epic (orange)
Exceptionally heavy: 40g+ → Legendary (gold)
```

### Watermelon Test
```
Expected range: 3000-6000g (3-6kg)
Normal weight: 5000g → Common (yellow/gray)
Slightly heavy: 7000g → Uncommon (blue)
Heavy: 8000g → Rare (purple)
Very heavy: 10000g → Epic (orange)
Exceptionally heavy: 14000g+ → Legendary (gold)
```

## Files Modified

1. **contract/sources/utils.move**
   - Added weight range constants for all fruit types
   - Added `get_fruit_weight_range()` function
   - Added `generate_fruit_weight()` function
   - Added `calculate_weight_based_rarity()` function
   - Kept old `calculate_rarity()` for backward compatibility

2. **contract/sources/land.move**
   - Updated `plant_in_slot()` to use weight-based generation
   - Updated `plant_all()` to use weight-based generation

3. **contract/Move.toml**
   - Fixed Sui framework dependencies

4. **contract/Move.lock**
   - Fixed path separators (Windows → Unix)

## Next Steps

1. **Deploy contract** to testnet with new logic
2. **Update frontend** to display weight-based rarity colors and messages
3. **Test gameplay** with different seed investments
4. **Monitor rarity distribution** to ensure it matches intended probabilities
5. **Gather player feedback** on the new rarity feel

## Notes

- Weight values are stored in the contract as u64 (grams)
- All calculations use integer arithmetic to avoid floating-point precision issues
- The system is deterministic: same fruit_type + weight always produces same rarity
- Seeds directly influence weight generation, creating a clear cause-and-effect relationship
