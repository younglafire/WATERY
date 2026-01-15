// ============================================================================
// Module: game
// Description: Core game mechanics for Fruit Merge Game
// 
// GAME FLOW:
// 1. Player starts game session
// 2. Player drops fruits (random level 1-3)
// 3. Fruits merge when same level collide → earn seeds
// 4. When ready to harvest: player calls start_claim()
// 5. Player MUST complete exactly 5 more drops to finish claim
// 6. After 5 drops, player calls complete_harvest() to get seeds
// 7. If game over during claim → lose pending seeds
//
// KEY FIX: Once claiming mode starts, player CAN'T drop after 5 drops
// The drops_remaining counter blocks additional drops
// ============================================================================
// SPDX-License-Identifier: Apache-2.0

module contract::game {
    use sui::random::{Random, new_generator};
    use contract::utils;
    use contract::events;
    use contract::player::{Self, PlayerAccount};
    use contract::seed::{Self, SeedAdminCap};

    // ============================================================================
    // STRUCTS
    // ============================================================================

    /// Game Session - tracks current game state
    public struct GameSession has key, store {
        id: UID,
        player: address,
        score: u64,
        seeds_pending: u64,           // Seeds collected, waiting to be harvested
        is_claiming: bool,            // Player pressed "Claim" button
        drops_remaining: u64,         // Drops needed to complete claim (starts at 5)
        claim_completed: bool,        // Whether claim drops are done
        game_over: bool,
        current_fruits: vector<u8>,   // Active fruit levels on board
    }

    // ============================================================================
    // GAME SESSION MANAGEMENT
    // ============================================================================

    /// Start a new game session
    public fun start_game(
        player_account: &mut PlayerAccount,
        ctx: &mut TxContext
    ): GameSession {
        let sender = ctx.sender();
        
        // Increment games played
        player::increment_games_played(player_account);
        
        let session = GameSession {
            id: object::new(ctx),
            player: sender,
            score: 0,
            seeds_pending: 0,
            is_claiming: false,
            drops_remaining: 0,
            claim_completed: false,
            game_over: false,
            current_fruits: vector::empty(),
        };
        
        events::emit_game_started(sender, object::id(&session));
        
        session
    }

    /// Start game and transfer to player (entry point)
    entry fun start_game_entry(
        player_account: &mut PlayerAccount,
        ctx: &mut TxContext
    ) {
        let session = start_game(player_account, ctx);
        transfer::transfer(session, ctx.sender());
    }

    // ============================================================================
    // CORE GAME MECHANICS
    // ============================================================================

    /// Drop a random fruit (level 1-3 for balance)
    /// 
    /// CRITICAL: If in claiming mode:
    /// - Can only drop if drops_remaining > 0
    /// - Each drop decrements drops_remaining
    /// - When drops_remaining hits 0, claim_completed = true
    /// - No more drops allowed after claim_completed
    entry fun drop_fruit(
        session: &mut GameSession,
        r: &Random,
        ctx: &mut TxContext
    ) {
        // Check game is not over
        assert!(!session.game_over, utils::e_game_over());
        
        // CRITICAL FIX: If claim is completed, BLOCK all drops
        if (session.claim_completed) {
            events::emit_drops_blocked(
                object::id(session), 
                b"claim_completed_must_harvest"
            );
            abort utils::e_no_drops_remaining()
        };
        
        // If in claiming mode, check we have drops remaining
        if (session.is_claiming) {
            assert!(session.drops_remaining > 0, utils::e_no_drops_remaining());
        };
        
        // Generate random fruit type (1-3 for smaller fruits)
        let mut generator = new_generator(r, ctx);
        let fruit_type = sui::random::generate_u8_in_range(&mut generator, 1, 3);
        
        // Add fruit to board
        session.current_fruits.push_back(fruit_type);
        
        // If in claiming mode, decrement drops and check completion
        if (session.is_claiming) {
            session.drops_remaining = session.drops_remaining - 1;
            
            // When drops hit 0, mark claim as completed
            if (session.drops_remaining == 0) {
                session.claim_completed = true;
            };
        };
        
        events::emit_fruit_dropped(
            object::id(session), 
            fruit_type,
            session.drops_remaining,
            session.is_claiming
        );
    }

    /// Merge two same-level fruits into a bigger one
    /// Called when physics engine detects collision
    entry fun merge_fruits(
        session: &mut GameSession,
        fruit_index_1: u64,
        fruit_index_2: u64,
        _ctx: &mut TxContext
    ) {
        assert!(!session.game_over, utils::e_game_over());
        assert!(fruit_index_1 != fruit_index_2, utils::e_invalid_fruit_level());
        
        let fruit1 = *session.current_fruits.borrow(fruit_index_1);
        let fruit2 = *session.current_fruits.borrow(fruit_index_2);
        
        // Must be same type to merge
        assert!(fruit1 == fruit2, utils::e_invalid_fruit_level());
        
        // Remove the two fruits (remove higher index first to avoid index shift)
        if (fruit_index_1 > fruit_index_2) {
            session.current_fruits.remove(fruit_index_1);
            session.current_fruits.remove(fruit_index_2);
        } else {
            session.current_fruits.remove(fruit_index_2);
            session.current_fruits.remove(fruit_index_1);
        };
        
        // Create new bigger fruit (cap at max level)
        let max_level = utils::max_fruit_level();
        let new_type = if (fruit1 < max_level) {
            fruit1 + 1
        } else {
            max_level
        };
        
        session.current_fruits.push_back(new_type);
        
        // Calculate and add seeds
        let seeds = utils::calculate_seeds(new_type);
        session.seeds_pending = session.seeds_pending + seeds;
        session.score = session.score + (new_type as u64) * 10;
        
        events::emit_fruits_merged(
            object::id(session),
            fruit1,
            new_type,
            seeds
        );
    }

    // ============================================================================
    // CLAIM & HARVEST SYSTEM
    // ============================================================================

    /// Start claiming seeds - initiates the 5-drop countdown
    /// After calling this, player MUST complete 5 more drops to harvest
    entry fun start_claim(session: &mut GameSession, _ctx: &mut TxContext) {
        assert!(!session.game_over, utils::e_game_over());
        assert!(!session.is_claiming, utils::e_already_in_claim_mode());
        assert!(session.seeds_pending > 0, utils::e_insufficient_seeds());
        
        session.is_claiming = true;
        session.drops_remaining = utils::drops_required(); // Set to 5
        session.claim_completed = false;
        
        events::emit_claim_started(
            object::id(session),
            session.seeds_pending,
            session.drops_remaining
        );
    }

    /// Complete harvest after 5 drops - mints SEED coins to player
    entry fun complete_harvest(
        session: &mut GameSession,
        player_account: &mut PlayerAccount,
        admin_cap: &mut SeedAdminCap,
        ctx: &mut TxContext
    ) {
        assert!(!session.game_over, utils::e_game_over());
        assert!(session.is_claiming, utils::e_not_in_claim_mode());
        assert!(session.claim_completed, utils::e_drops_remaining());
        assert!(session.drops_remaining == 0, utils::e_drops_remaining());
        
        let harvested = session.seeds_pending;
        
        // Mint SEED coins to player
        if (harvested > 0) {
            seed::mint_to(admin_cap, harvested, ctx.sender(), ctx);
        };
        
        // Update player stats
        player::add_seeds_earned(player_account, harvested);
        
        // Reset session state
        session.seeds_pending = 0;
        session.is_claiming = false;
        session.claim_completed = false;
        
        events::emit_harvest_completed(object::id(session), harvested);
    }

    // ============================================================================
    // GAME END STATES
    // ============================================================================

    /// Game over - player lost, lose all pending seeds
    entry fun trigger_game_over(session: &mut GameSession, _ctx: &mut TxContext) {
        let lost = session.seeds_pending;
        session.seeds_pending = 0;
        session.game_over = true;
        session.is_claiming = false;
        session.claim_completed = false;
        session.drops_remaining = 0;
        
        events::emit_game_over(object::id(session), lost);
    }

    /// Reset game to play again (keeps same session)
    entry fun reset_game(session: &mut GameSession, _ctx: &mut TxContext) {
        session.score = 0;
        session.seeds_pending = 0;
        session.is_claiming = false;
        session.drops_remaining = 0;
        session.claim_completed = false;
        session.game_over = false;
        session.current_fruits = vector::empty();
        
        events::emit_game_reset(object::id(session));
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    public fun get_score(session: &GameSession): u64 {
        session.score
    }

    public fun get_pending_seeds(session: &GameSession): u64 {
        session.seeds_pending
    }

    public fun is_claiming(session: &GameSession): bool {
        session.is_claiming
    }

    public fun get_drops_remaining(session: &GameSession): u64 {
        session.drops_remaining
    }

    public fun is_claim_completed(session: &GameSession): bool {
        session.claim_completed
    }

    public fun is_game_over(session: &GameSession): bool {
        session.game_over
    }

    public fun get_player(session: &GameSession): address {
        session.player
    }

    public fun get_fruits_count(session: &GameSession): u64 {
        session.current_fruits.length()
    }

    /// Check if player can drop a fruit
    public fun can_drop(session: &GameSession): bool {
        if (session.game_over) { return false };
        if (session.claim_completed) { return false };
        if (session.is_claiming && session.drops_remaining == 0) { return false };
        true
    }

    /// Check if player can harvest
    public fun can_harvest(session: &GameSession): bool {
        session.is_claiming && session.claim_completed && !session.game_over
    }

    public fun id(session: &GameSession): ID {
        object::id(session)
    }
}
