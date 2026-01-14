// ============================================================================
// Module: fruit_nft
// Description: Tradeable Fruit NFT system
// 
// Players can convert harvested fruits from inventory into tradeable NFTs
// NFTs can be transferred, sold, or collected
// ============================================================================
// SPDX-License-Identifier: Apache-2.0

module contract::fruit_nft {
    use std::string::{Self, String};
    use contract::utils;
    use contract::events;
    use contract::player::{Self, PlayerInventory};

    // ============================================================================
    // STRUCTS
    // ============================================================================

    /// Tradeable Fruit NFT
    public struct FruitNFT has key, store {
        id: UID,
        name: String,
        description: String,
        fruit_type: u8,
        rarity: u8,
        weight: u64,
        created_by: address,
        created_at: u64,
    }

    // ============================================================================
    // NFT MINTING
    // ============================================================================

    /// Mint NFT from inventory fruit
    /// Removes fruit from inventory and creates tradeable NFT
    entry fun mint_from_inventory(
        inventory: &mut PlayerInventory,
        fruit_index: u64,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        
        // Remove fruit from inventory
        let fruit = player::remove_fruit_from_inventory(inventory, fruit_index);
        
        // Create NFT
        let name = get_fruit_name(
            player::get_fruit_type(&fruit), 
            player::get_fruit_rarity(&fruit)
        );
        let description = get_fruit_description(
            player::get_fruit_type(&fruit),
            player::get_fruit_rarity(&fruit),
            player::get_fruit_weight(&fruit)
        );
        
        let nft = FruitNFT {
            id: object::new(ctx),
            name,
            description,
            fruit_type: player::get_fruit_type(&fruit),
            rarity: player::get_fruit_rarity(&fruit),
            weight: player::get_fruit_weight(&fruit),
            created_by: sender,
            created_at: 0, // Could use clock if needed
        };
        
        events::emit_fruit_nft_minted(
            object::id(&nft),
            nft.fruit_type,
            nft.rarity,
            nft.weight,
            sender
        );
        
        transfer::transfer(nft, sender);
    }

    /// Mint NFT directly (for testing/admin)
    entry fun mint_direct(
        fruit_type: u8,
        rarity: u8,
        weight: u64,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let name = get_fruit_name(fruit_type, rarity);
        let description = get_fruit_description(fruit_type, rarity, weight);
        
        let nft = FruitNFT {
            id: object::new(ctx),
            name,
            description,
            fruit_type,
            rarity,
            weight,
            created_by: sender,
            created_at: 0,
        };
        
        events::emit_fruit_nft_minted(
            object::id(&nft),
            fruit_type,
            rarity,
            weight,
            sender
        );
        
        transfer::transfer(nft, sender);
    }

    // ============================================================================
    // NFT OPERATIONS
    // ============================================================================

    /// Burn NFT
    entry fun burn(nft: FruitNFT, _ctx: &mut TxContext) {
        let nft_id = object::id(&nft);
        // Note: We can't get sender without using ctx, so use creator as owner
        let owner = nft.created_by;
        
        events::emit_fruit_nft_burned(nft_id, owner);
        
        let FruitNFT { 
            id, 
            name: _, 
            description: _,
            fruit_type: _, 
            rarity: _, 
            weight: _, 
            created_by: _,
            created_at: _,
        } = nft;
        object::delete(id);
    }

    /// Transfer NFT to another address
    entry fun transfer_nft(nft: FruitNFT, recipient: address, _ctx: &mut TxContext) {
        transfer::public_transfer(nft, recipient);
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /// Generate fruit name with rarity prefix
    fun get_fruit_name(fruit_type: u8, rarity: u8): String {
        let rarity_prefix = if (rarity == utils::rarity_legendary()) {
            b"Legendary "
        } else if (rarity == utils::rarity_epic()) {
            b"Epic "
        } else if (rarity == utils::rarity_rare()) {
            b"Rare "
        } else if (rarity == utils::rarity_uncommon()) {
            b"Uncommon "
        } else {
            b""
        };

        let fruit_name = get_fruit_base_name(fruit_type);

        let mut name = string::utf8(rarity_prefix);
        name.append(string::utf8(fruit_name));
        name
    }

    /// Get base fruit name
    fun get_fruit_base_name(fruit_type: u8): vector<u8> {
        if (fruit_type == utils::cherry()) {
            b"Cherry"
        } else if (fruit_type == utils::grape()) {
            b"Grape"
        } else if (fruit_type == utils::orange()) {
            b"Orange"
        } else if (fruit_type == utils::lemon()) {
            b"Lemon"
        } else if (fruit_type == utils::apple()) {
            b"Apple"
        } else if (fruit_type == utils::pear()) {
            b"Pear"
        } else if (fruit_type == utils::peach()) {
            b"Peach"
        } else if (fruit_type == utils::pineapple()) {
            b"Pineapple"
        } else if (fruit_type == utils::melon()) {
            b"Melon"
        } else {
            b"Watermelon"
        }
    }

    /// Generate fruit description
    fun get_fruit_description(fruit_type: u8, rarity: u8, weight: u64): String {
        let rarity_text = if (rarity == utils::rarity_legendary()) {
            b"legendary"
        } else if (rarity == utils::rarity_epic()) {
            b"epic"
        } else if (rarity == utils::rarity_rare()) {
            b"rare"
        } else if (rarity == utils::rarity_uncommon()) {
            b"uncommon"
        } else {
            b"common"
        };

        let fruit_name = get_fruit_base_name(fruit_type);
        
        // Build description
        let mut desc = string::utf8(b"A ");
        desc.append(string::utf8(rarity_text));
        desc.append(string::utf8(b" "));
        desc.append(string::utf8(fruit_name));
        desc.append(string::utf8(b" from Fruit Game"));
        
        // Suppress unused warning
        let _ = weight;
        
        desc
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    public fun get_name(nft: &FruitNFT): String {
        nft.name
    }

    public fun get_description(nft: &FruitNFT): String {
        nft.description
    }

    public fun get_type(nft: &FruitNFT): u8 {
        nft.fruit_type
    }

    public fun get_rarity(nft: &FruitNFT): u8 {
        nft.rarity
    }

    public fun get_weight(nft: &FruitNFT): u64 {
        nft.weight
    }

    public fun get_creator(nft: &FruitNFT): address {
        nft.created_by
    }

    public fun id(nft: &FruitNFT): ID {
        object::id(nft)
    }
}
