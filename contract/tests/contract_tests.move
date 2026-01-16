// ============================================================================
// Module: contract_tests
// Description: Unit tests for Fruit Game smart contracts
// ============================================================================
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module contract::contract_tests {
    use contract::utils;

    // ============================================================================
    // UTILS TESTS
    // ============================================================================

    #[test]
    fun test_calculate_seeds() {
        // Small fruits (1-3) give no seeds
        assert!(utils::calculate_seeds(1) == 0, 0);
        assert!(utils::calculate_seeds(2) == 0, 1);
        assert!(utils::calculate_seeds(3) == 0, 2);
        
        // Medium fruits (4-5) give 1-2 seeds
        assert!(utils::calculate_seeds(4) == 1, 3);
        assert!(utils::calculate_seeds(5) == 2, 4);
        
        // Large fruits (6-7) give 4-5 seeds
        assert!(utils::calculate_seeds(6) == 4, 5);
        assert!(utils::calculate_seeds(7) == 5, 6);
        
        // Biggest fruits (8-10) give 8-10 seeds
        assert!(utils::calculate_seeds(8) == 8, 7);
        assert!(utils::calculate_seeds(9) == 9, 8);
        assert!(utils::calculate_seeds(10) == 10, 9);
    }

    #[test]
    fun test_calculate_rarity() {
        // Low roll = common
        assert!(utils::calculate_rarity(1, 0) == utils::rarity_common(), 0);
        assert!(utils::calculate_rarity(50, 0) == utils::rarity_common(), 1);
        
        // Higher roll = uncommon
        assert!(utils::calculate_rarity(60, 0) == utils::rarity_uncommon(), 2);
        
        // With seed bonus
        // 50 + (20/2) = 60 -> uncommon
        assert!(utils::calculate_rarity(50, 20) == utils::rarity_uncommon(), 3);
    }

    #[test]
    fun test_land_upgrade_cost() {
        // Base cost doubles with each level
        assert!(utils::calculate_land_upgrade_cost(1) == 200, 0);
        assert!(utils::calculate_land_upgrade_cost(2) == 400, 1);
        assert!(utils::calculate_land_upgrade_cost(3) == 800, 2);
    }

    #[test]
    fun test_constants() {
        // Verify important constants
        assert!(utils::drops_required() == 5, 0);
        assert!(utils::max_fruit_level() == 10, 1);
        assert!(utils::initial_land_slots() == 6, 2);
        assert!(utils::max_lands_per_player() == 5, 3);
    }
}
