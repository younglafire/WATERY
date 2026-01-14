// ============================================================================
// Module: land
// Description: Land management with farming slots, upgrades, and auto-harvest
// 
// FEATURES:
// - Players get first land automatically when creating account
// - Can buy additional lands with seeds
// - Can upgrade lands to get more slots
// - Fruits auto-harvest when ready (on next interaction)
// - Switch between lands
// ============================================================================
// SPDX-License-Identifier: Apache-2.0

module contract::land {
    use sui::random::{Random, new_generator};
    use sui::clock::Clock;
    use contract::utils;
    use contract::events;
    use contract::player::{Self, PlayerAccount, PlayerInventory};

    // ============================================================================
    // STRUCTS
    // ============================================================================

    /// A single planting slot on the land
    public struct PlantedFruit has store, copy, drop {
        fruit_type: u8,
        rarity: u8,
        weight: u64,
        seeds_used: u64,
        planted_at: u64,
    }

    /// Player's farming land with planting slots
    public struct PlayerLand has key, store {
        id: UID,
        owner: address,
        level: u64,                              // Land level (affects slots)
        slots: vector<Option<PlantedFruit>>,     // Planting slots
        max_slots: u64,                          // Current max slots
        land_index: u64,                         // Index in player's land collection
        created_at: u64,
    }

    // ============================================================================
    // LAND CREATION
    // ============================================================================

    /// Create first land for new player (called after create_player)
    entry fun create_first_land(
        player: &mut PlayerAccount,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let now = sui::clock::timestamp_ms(clock);
        let initial_slots = utils::initial_land_slots();
        
        // Initialize empty slots
        let mut slots = vector::empty<Option<PlantedFruit>>();
        let mut i = 0u64;
        while (i < initial_slots) {
            slots.push_back(option::none());
            i = i + 1;
        };

        let land = PlayerLand {
            id: object::new(ctx),
            owner: sender,
            level: 1,
            slots,
            max_slots: initial_slots,
            land_index: 0,  // First land
            created_at: now,
        };
        
        events::emit_land_created(object::id(&land), sender, initial_slots);
        
        // Set as active land
        player::set_active_land(player, 0);
        
        transfer::transfer(land, sender);
    }

    /// Buy a new land (costs seeds)
    entry fun buy_new_land(
        player: &mut PlayerAccount,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let now = sui::clock::timestamp_ms(clock);
        let land_count = player::get_land_count(player);
        
        // Check max lands limit
        assert!(land_count < utils::max_lands_per_player(), utils::e_max_lands_reached());
        
        // Spend seeds
        let cost = utils::new_land_cost();
        player::spend_seeds(player, cost, b"new_land");
        
        // Create new land
        let initial_slots = utils::initial_land_slots();
        let mut slots = vector::empty<Option<PlantedFruit>>();
        let mut i = 0u64;
        while (i < initial_slots) {
            slots.push_back(option::none());
            i = i + 1;
        };

        let land = PlayerLand {
            id: object::new(ctx),
            owner: sender,
            level: 1,
            slots,
            max_slots: initial_slots,
            land_index: land_count,
            created_at: now,
        };
        
        // Increment player's land count
        player::increment_land_count(player);
        
        events::emit_land_created(object::id(&land), sender, initial_slots);
        
        transfer::transfer(land, sender);
    }

    /// Upgrade land to get more slots (costs seeds)
    entry fun upgrade_land(
        player: &mut PlayerAccount,
        land: &mut PlayerLand,
        _ctx: &mut TxContext
    ) {
        // Check not at max
        assert!(land.max_slots < utils::max_land_slots(), utils::e_land_max_level());
        
        // Calculate cost and spend seeds
        let cost = utils::calculate_land_upgrade_cost(land.level);
        player::spend_seeds(player, cost, b"land_upgrade");
        
        // Upgrade land
        land.level = land.level + 1;
        let new_max = land.max_slots + 2; // Add 2 slots per level
        
        // Add new empty slots
        while (land.slots.length() < new_max) {
            land.slots.push_back(option::none());
        };
        land.max_slots = new_max;
        
        events::emit_land_upgraded(
            object::id(land),
            land.level,
            new_max,
            cost
        );
    }

    /// Switch active land
    entry fun switch_land(
        player: &mut PlayerAccount,
        land_index: u64,
        _ctx: &mut TxContext
    ) {
        let current = player::get_active_land_index(player);
        player::set_active_land(player, land_index);
        
        // Note: We emit event with placeholder IDs
        // In production, you'd track land IDs in player account
        events::emit_land_switched(
            player::get_owner(player),
            object::id_from_address(@0x0), // Placeholder
            object::id_from_address(@0x0)  // Placeholder
        );
        
        // Suppress unused variable warning
        let _ = current;
    }

    // ============================================================================
    // PLANTING
    // ============================================================================

    /// Plant seeds in a specific slot
    /// Also triggers auto-harvest for any ready fruits
    entry fun plant_in_slot(
        player: &mut PlayerAccount,
        land: &mut PlayerLand,
        inventory: &mut PlayerInventory,
        slot_index: u64,
        seeds_to_use: u64,
        clock: &Clock,
        r: &Random,
        ctx: &mut TxContext
    ) {
        // First, auto-harvest any ready fruits
        auto_harvest_ready_fruits(land, inventory, clock);
        
        // Validate slot
        assert!(slot_index < land.max_slots, utils::e_invalid_slot());
        assert!(option::is_none(land.slots.borrow(slot_index)), utils::e_slot_occupied());
        assert!(seeds_to_use > 0, utils::e_invalid_seed_count());
        assert!(player::get_seeds(player) >= seeds_to_use, utils::e_insufficient_seeds());
        
        // Spend seeds
        player::spend_seeds(player, seeds_to_use, b"plant");
        
        // Generate random fruit attributes
        let mut generator = new_generator(r, ctx);
        let fruit_type = sui::random::generate_u8_in_range(&mut generator, 1, 10);
        let rarity_roll = sui::random::generate_u64_in_range(&mut generator, 1, 100);
        let rarity = utils::calculate_rarity(rarity_roll, seeds_to_use);
        let base_weight = sui::random::generate_u64_in_range(&mut generator, 100, 500);
        let weight = base_weight + (seeds_to_use * 5) + ((rarity as u64) * 50);
        
        let now = sui::clock::timestamp_ms(clock);
        
        let planted = PlantedFruit {
            fruit_type,
            rarity,
            weight,
            seeds_used: seeds_to_use,
            planted_at: now,
        };
        
        // Place in slot
        *land.slots.borrow_mut(slot_index) = option::some(planted);
        
        events::emit_fruit_planted(
            object::id(land),
            slot_index,
            fruit_type,
            rarity,
            weight,
            seeds_to_use
        );
    }

    /// Plant in all empty slots at once
    entry fun plant_all(
        player: &mut PlayerAccount,
        land: &mut PlayerLand,
        inventory: &mut PlayerInventory,
        seeds_per_slot: u64,
        clock: &Clock,
        r: &Random,
        ctx: &mut TxContext
    ) {
        // First, auto-harvest any ready fruits
        auto_harvest_ready_fruits(land, inventory, clock);
        
        assert!(seeds_per_slot > 0, utils::e_invalid_seed_count());
        
        // Count empty slots
        let mut empty_count = 0u64;
        let mut i = 0u64;
        while (i < land.max_slots) {
            if (option::is_none(land.slots.borrow(i))) {
                empty_count = empty_count + 1;
            };
            i = i + 1;
        };
        
        // Check we have enough seeds
        let total_seeds = empty_count * seeds_per_slot;
        assert!(player::get_seeds(player) >= total_seeds, utils::e_insufficient_seeds());
        
        // Spend all seeds at once
        player::spend_seeds(player, total_seeds, b"plant_batch");
        
        // Plant in all empty slots
        let mut generator = new_generator(r, ctx);
        let now = sui::clock::timestamp_ms(clock);
        
        i = 0;
        while (i < land.max_slots) {
            if (option::is_none(land.slots.borrow(i))) {
                // Generate random fruit
                let fruit_type = sui::random::generate_u8_in_range(&mut generator, 1, 10);
                let rarity_roll = sui::random::generate_u64_in_range(&mut generator, 1, 100);
                let rarity = utils::calculate_rarity(rarity_roll, seeds_per_slot);
                let base_weight = sui::random::generate_u64_in_range(&mut generator, 100, 500);
                let weight = base_weight + (seeds_per_slot * 5) + ((rarity as u64) * 50);
                
                let planted = PlantedFruit {
                    fruit_type,
                    rarity,
                    weight,
                    seeds_used: seeds_per_slot,
                    planted_at: now,
                };
                
                *land.slots.borrow_mut(i) = option::some(planted);
                
                events::emit_fruit_planted(
                    object::id(land),
                    i,
                    fruit_type,
                    rarity,
                    weight,
                    seeds_per_slot
                );
            };
            i = i + 1;
        };
    }

    // ============================================================================
    // HARVESTING
    // ============================================================================

    /// Auto-harvest all ready fruits (internal function)
    /// Called automatically before planting or can be called manually
    fun auto_harvest_ready_fruits(
        land: &mut PlayerLand,
        inventory: &mut PlayerInventory,
        clock: &Clock,
    ) {
        let now = sui::clock::timestamp_ms(clock);
        
        let mut i = 0u64;
        while (i < land.max_slots) {
            if (option::is_some(land.slots.borrow(i))) {
                let fruit = option::borrow(land.slots.borrow(i));
                
                // Check if fruit is ready
                if (utils::is_fruit_ready(fruit.planted_at, now)) {
                    // Extract fruit data
                    let fruit_type = fruit.fruit_type;
                    let rarity = fruit.rarity;
                    let weight = fruit.weight;
                    
                    // Add to inventory
                    player::add_fruit_to_inventory(
                        inventory,
                        fruit_type,
                        rarity,
                        weight,
                        clock
                    );
                    
                    // Clear slot
                    *land.slots.borrow_mut(i) = option::none();
                    
                    events::emit_fruit_harvested(
                        object::id(land),
                        i,
                        fruit_type,
                        rarity,
                        weight,
                        true  // auto_harvested = true
                    );
                };
            };
            i = i + 1;
        };
    }

    /// Manually trigger auto-harvest (entry point)
    entry fun harvest_ready(
        land: &mut PlayerLand,
        inventory: &mut PlayerInventory,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        auto_harvest_ready_fruits(land, inventory, clock);
    }

    /// Harvest a specific slot manually
    entry fun harvest_slot(
        land: &mut PlayerLand,
        inventory: &mut PlayerInventory,
        slot_index: u64,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(slot_index < land.max_slots, utils::e_invalid_slot());
        assert!(option::is_some(land.slots.borrow(slot_index)), utils::e_slot_empty());
        
        let fruit = option::borrow(land.slots.borrow(slot_index));
        let now = sui::clock::timestamp_ms(clock);
        
        assert!(utils::is_fruit_ready(fruit.planted_at, now), utils::e_fruit_not_ready());
        
        // Extract fruit data
        let fruit_type = fruit.fruit_type;
        let rarity = fruit.rarity;
        let weight = fruit.weight;
        
        // Add to inventory
        player::add_fruit_to_inventory(inventory, fruit_type, rarity, weight, clock);
        
        // Clear slot
        *land.slots.borrow_mut(slot_index) = option::none();
        
        events::emit_fruit_harvested(
            object::id(land),
            slot_index,
            fruit_type,
            rarity,
            weight,
            false  // auto_harvested = false (manual)
        );
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    public fun get_level(land: &PlayerLand): u64 {
        land.level
    }

    public fun get_max_slots(land: &PlayerLand): u64 {
        land.max_slots
    }

    public fun get_owner(land: &PlayerLand): address {
        land.owner
    }

    public fun get_land_index(land: &PlayerLand): u64 {
        land.land_index
    }

    public fun get_slot(land: &PlayerLand, index: u64): &Option<PlantedFruit> {
        land.slots.borrow(index)
    }

    public fun is_slot_empty(land: &PlayerLand, index: u64): bool {
        option::is_none(land.slots.borrow(index))
    }

    public fun get_fruit_type(fruit: &PlantedFruit): u8 {
        fruit.fruit_type
    }

    public fun get_fruit_rarity(fruit: &PlantedFruit): u8 {
        fruit.rarity
    }

    public fun get_fruit_weight(fruit: &PlantedFruit): u64 {
        fruit.weight
    }

    public fun get_planted_at(fruit: &PlantedFruit): u64 {
        fruit.planted_at
    }

    public fun is_fruit_ready_to_harvest(fruit: &PlantedFruit, clock: &Clock): bool {
        let now = sui::clock::timestamp_ms(clock);
        utils::is_fruit_ready(fruit.planted_at, now)
    }

    /// Count empty slots
    public fun count_empty_slots(land: &PlayerLand): u64 {
        let mut count = 0u64;
        let mut i = 0u64;
        while (i < land.max_slots) {
            if (option::is_none(land.slots.borrow(i))) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }

    /// Count ready-to-harvest fruits
    public fun count_ready_fruits(land: &PlayerLand, clock: &Clock): u64 {
        let now = sui::clock::timestamp_ms(clock);
        let mut count = 0u64;
        let mut i = 0u64;
        while (i < land.max_slots) {
            if (option::is_some(land.slots.borrow(i))) {
                let fruit = option::borrow(land.slots.borrow(i));
                if (utils::is_fruit_ready(fruit.planted_at, now)) {
                    count = count + 1;
                };
            };
            i = i + 1;
        };
        count
    }

    public fun id(land: &PlayerLand): ID {
        object::id(land)
    }
}
