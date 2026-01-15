// ============================================================================
// Module: seed
// Description: SEED coin - the main currency of Fruit Merge Game
// 
// SEED is earned by merging fruits in the game and can be used to:
// - Buy new lands
// - Upgrade lands
// - Upgrade inventory
// - Plant seeds for better fruit drops
// ============================================================================
// SPDX-License-Identifier: Apache-2.0

module contract::seed {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url;

    // ============================================================================
    // STRUCTS
    // ============================================================================

    /// One-time witness for the SEED coin
    public struct SEED has drop {}

    /// Admin capability to mint seeds (given to game module)
    public struct SeedAdminCap has key, store {
        id: UID,
        treasury_cap: TreasuryCap<SEED>,
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /// Initialize the SEED coin - called once on module publish
    #[allow(deprecated_usage)]
    fun init(witness: SEED, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,                                          // 9 decimals like SUI
            b"SEED",                                    // Symbol
            b"Seed",                                    // Name
            b"The currency of Fruit Merge Game. Earn seeds by merging fruits!", // Description
            option::some(url::new_unsafe_from_bytes(b"https://fruit-merge.game/seed.png")), // Icon URL
            ctx
        );

        // Make metadata immutable (publicly frozen)
        transfer::public_freeze_object(metadata);

        // Create admin cap with treasury
        let admin_cap = SeedAdminCap {
            id: object::new(ctx),
            treasury_cap,
        };

        // Share the admin cap so game module can mint seeds
        transfer::share_object(admin_cap);
    }

    // ============================================================================
    // MINTING FUNCTIONS
    // ============================================================================

    /// Mint seeds to a player (called by game module after harvest)
    public fun mint(
        admin_cap: &mut SeedAdminCap,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SEED> {
        coin::mint(&mut admin_cap.treasury_cap, amount, ctx)
    }

    /// Mint seeds and transfer directly to recipient
    public fun mint_to(
        admin_cap: &mut SeedAdminCap,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coins = mint(admin_cap, amount, ctx);
        transfer::public_transfer(coins, recipient);
    }

    /// Entry function to mint seeds (for testing/admin)
    entry fun mint_seeds(
        admin_cap: &mut SeedAdminCap,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        mint_to(admin_cap, amount, recipient, ctx);
    }

    // ============================================================================
    // BURNING FUNCTIONS
    // ============================================================================

    /// Burn seeds (when spending on upgrades, etc.)
    public fun burn(
        admin_cap: &mut SeedAdminCap,
        coins: Coin<SEED>,
    ) {
        coin::burn(&mut admin_cap.treasury_cap, coins);
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /// Get the total supply of SEED coins
    public fun total_supply(admin_cap: &SeedAdminCap): u64 {
        coin::total_supply(&admin_cap.treasury_cap)
    }

    /// Split coins - take a portion out of a coin
    public fun split(
        coin: &mut Coin<SEED>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SEED> {
        coin::split(coin, amount, ctx)
    }

    /// Merge coins together
    public fun join(
        coin: &mut Coin<SEED>,
        other: Coin<SEED>,
    ) {
        coin::join(coin, other);
    }

    /// Get the value of a coin
    public fun value(coin: &Coin<SEED>): u64 {
        coin::value(coin)
    }

    /// Zero coin
    public fun zero(ctx: &mut TxContext): Coin<SEED> {
        coin::zero(ctx)
    }

    /// Destroy zero coin
    public fun destroy_zero(coin: Coin<SEED>) {
        coin::destroy_zero(coin);
    }
}
