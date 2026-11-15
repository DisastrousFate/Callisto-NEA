/*---------------------------//
      PLAYER INVENTORY
//---------------------------*/

// Inventory notes:
// Only iridium for now, so just store a number.
// Build something -> subtract cost
// Pump produces something -> add it back
// Blue and red need separate copies.

export class Inventory {
    constructor(){
        this.iridium = 100;
    }

    add(amount){
        if (!Number.isFinite(amount) || amount <= 0) return false;
        this.iridium += amount;
        return true;
    }

    // e.g. 100 iridium - 25 for a pump = 75 left
    // Check first, otherwise the balance could go below zero.
    spend(amount){
        // Do not change the balance if the amount is invalid or too expensive.
        if (!Number.isFinite(amount) || amount < 0 || amount > this.iridium){
            return false;
        }
        this.iridium -= amount;
        return true;
    }
}

/*---------------------------//
       PLAYER HEALTH
//---------------------------*/

// Player bits to store:
// team, position, health, timers and inventory
// The mesh is elsewhere - these are just the values behind it.
// Both players use this class, but each gets their own inventory.
export class Player {
    constructor(team, x, z){
        this.team = team;
        this.x = x;
        this.z = z;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.respawnTimer = 0;
        this.attackTimer = 0;
        this.inventory = new Inventory();
    }

    takeDamage(amount){
        if (this.health <= 0 || !Number.isFinite(amount) || amount <= 0) return false;
        // A large hit should leave health at 0, not a negative number.
        this.health = Math.max(0, this.health - amount);
        // Health reaches zero -> start waiting for a respawn.
        // The beacon check happens further down in update(), not here.
        if (this.health === 0) this.respawnTimer = 3;
        return true;
    }
}

/*---------------------------//
        SOLDIER DATA
//---------------------------*/

// Positions here are numbers. main.js puts the meshes in these positions.
export class Soldier {
    constructor(team, x, z){
        this.team = team;
        this.x = x;
        this.z = z;
        this.health = 40;
        this.attackTimer = 1;
    }
}

/*---------------------------//
       MAIN GAME DATA
//---------------------------*/

// Keep the game rules

export class Game {
    // entry point
    constructor(assetData){
        this.buildItems = assetData.buildItems;

        // Team 0 is blue, team 1 is red. Start them on opposite sides.
        this.players = [new Player(0, -12, 0), new Player(1, 12, 0)]; // pos a, pos b
        this.buildings = [];
        this.soldiers = [];
        // Copy the node positions so each game has its own list.
        this.resourceNodes = [];
        for (const node of assetData.resourceNodes) {
            this.resourceNodes.push({ x: node.x, z: node.z });
        }
        this.activeTeam = 0;
        this.nextId = 1;
        this.message = 'Build a pump near a purple resource node to collect iridium.';
        this.addBuilding('respawn-beacon', 0, -12, -4);
        this.addBuilding('respawn-beacon', 1, 12, -4);
    }

    // This gives the player currently being controlled with WASD.
    get player(){
        return this.players[this.activeTeam];
    }

    // Just distance across the ground. No y value needed for this flat map.
    // x difference and z difference -> distance between the two positions
    distance(first, second){
        return Math.hypot(first.x - second.x, first.z - second.z);
    }

    addBuilding(type, team, x, z){
        const building = {
            id: this.nextId,
            type: type,
            team: team,
            x: x,
            z: z,
            health: this.buildItems[type].health,
            productionTimer: 0,
        };
        this.nextId++;
        this.buildings.push(building);
        return building;
    }

    /*---------------------------//
         BUILDING PLACEMENT
    //---------------------------*/

    // Rough order for these checks:
    // alive? -> inside map? -> near player? -> clear space? -> node? -> money?
    // Return text for the HUD if one fails.
    // Empty text at the end means all the checks got through.
    placementError(type, x, z){
        const item = this.buildItems[type];
        if (!item) return 'Unknown building.';
        if (this.player.health <= 0) return 'Wait until you have respawned.';
        if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 47 || Math.abs(z) > 47) {
            return 'Place the building inside the map.';
        }
        const position = { x, z };
        if (this.distance(position, this.player) > 15) return 'Build within 15 units of your player.';
        // Check each building, so they cannot be placed on top of each other.
        for (const building of this.buildings) {
            if (this.distance(position, building) < 4) {
                return 'Leave at least 4 units between buildings.';
            }
        }
        // Only the pump needs a resource node. The other buildings can go elsewhere.
        if (item.production) {
            const nodeRange = item.production.nodeRange;
            let nearNode = false;
            for (const node of this.resourceNodes) {
                if (this.distance(position, node) <= nodeRange) nearNode = true;
            }
            if (!nearNode) return 'Pumps must be within ' + nodeRange + ' units of a purple resource node.';
        }
        if (this.player.inventory.iridium < item.cost) return 'Not enough iridium.';
        return '';
    }

    placeBuilding(type, x, z){
        // Check again here. The balance or player position may have changed since the preview.
        const error = this.placementError(type, x, z);
        if (error) {
            this.message = error;
            return false;
        }
        this.player.inventory.spend(this.buildItems[type].cost);
        this.addBuilding(type, this.activeTeam, x, z);
        this.message = this.buildItems[type].name + ' built.';
        return true;
    }

    /*---------------------------//
        TRAINING AND COMBAT
    //---------------------------*/

    trainSoldier(){
        if (this.player.health <= 0) {
            this.message = 'Wait until you have respawned.';
            return false;
        }
        let barracks = null;
        for (const building of this.buildings) {
            if (building.team === this.activeTeam && building.type === 'barracks') {
                barracks = building;
                break; // One barracks is enough to allow training.
            }
        }
        if (!barracks) {
            this.message = 'Build a barracks first.';
            return false;
        }
        let armySize = 0;
        for (const soldier of this.soldiers) {
            if (soldier.team === this.activeTeam) armySize++;
        }
        if (armySize >= 12) {
            this.message = 'Your army is full (12 soldiers).';
            return false;
        }
        if (!this.player.inventory.spend(20)) {
            this.message = 'Training a soldier costs 20 iridium.';
            return false;
        }
        this.soldiers.push(new Soldier(this.activeTeam, barracks.x, barracks.z + 2));
        this.message = 'Soldier trained. It will approach and attack the opposing team.';
        return true;
    }

    attack(){
        const player = this.player;
        if (player.health <= 0 || player.attackTimer > 0) return false;
        const nearest = this.findEnemy(player, 8);
        if (!nearest) {
            this.message = 'No opposing player, soldier or building within 8 units.';
            return false;
        }
        this.damage(nearest, 20);
        player.attackTimer = 0.6;
        this.message = 'Hit the nearest enemy for 20 damage.';
        return true;
    }

    // Players and soldiers both need the nearest enemy, so use the same search.
    // Search notes:
    // ignore our own team
    // ignore anything already dead
    // remember the closest one found so far
    findEnemy(attacker, range){
        // concat puts these lists together for the search; it does not move the objects.
        const targets = this.players.concat(this.soldiers, this.buildings);
        let nearest = null;
        let nearestDistance = range;

        for (const target of targets) {
            if (target.team === attacker.team || target.health <= 0) continue;
            const distance = this.distance(attacker, target);
            if (distance <= range && (nearest === null || distance < nearestDistance)) {
                nearest = target;
                nearestDistance = distance;
            }
        }
        return nearest;
    }

    damage(target, amount){
        // Players need takeDamage because it also starts their respawn timer.
        if (target instanceof Player) {
            target.takeDamage(amount);
        } else {
            target.health = Math.max(0, target.health - amount);
        }
    }

    /*---------------------------//
         REMOVING BUILDINGS
    //---------------------------*/

    recycleBuilding(){
        let building = null;
        for (const item of this.buildings) {
            if (item.team === this.activeTeam && this.distance(item, this.player) <= 6) {
                building = item;
                break;
            }
        }
        if (this.player.health <= 0 || !building) {
            this.message = 'Move within 6 units of one of your buildings to recycle it.';
            return false;
        }
        building.health = 0;
        // Round down, so a pump costing 25 refunds 12 rather than 12.5.
        this.player.inventory.add(Math.floor(this.buildItems[building.type].cost / 2));
        this.removeDestroyed();
        this.message = 'Building recycled for half its iridium cost.';
        return true;
    }

    // filter keeps the objects which still have health left.
    removeDestroyed(){
        this.buildings = this.buildings.filter((building) => building.health > 0);
        this.soldiers = this.soldiers.filter((soldier) => soldier.health > 0);
    }

    /*---------------------------//
            GAME UPDATE
    //---------------------------*/

    update(delta){
        if (!Number.isFinite(delta) || delta <= 0) return;
        // delta is the time since the last frame, in seconds.
        // First deal with attack cooldowns and players waiting to respawn.
        for (const player of this.players) {
            player.attackTimer = Math.max(0, player.attackTimer - delta);
            if (player.health > 0) continue;
            player.respawnTimer = Math.max(0, player.respawnTimer - delta);
            let beacon = null;
            for (const building of this.buildings) {
                if (building.team === player.team && building.type === 'respawn-beacon' && building.health > 0) {
                    beacon = building;
                    break;
                }
            }
            // No beacon means the player stays dead, even after the timer finishes.
            if (player.respawnTimer === 0 && beacon) {
                player.health = player.maxHealth;
                player.x = beacon.x;
                player.z = beacon.z + 4;
            }
        }

        // Pump timings for now:
        // 2 seconds = 5 iridium
        // 4 seconds = 10 iridium, etc.
        // Add it to the pump OWNER, not whichever team is being controlled.
        for (const building of this.buildings) {
            const production = this.buildItems[building.type].production;
            if (!production || building.health <= 0) continue;
            building.productionTimer += delta;
            while (building.productionTimer >= production.seconds) {
                this.players[building.team].inventory.add(production.iridium);
                // Keep the leftover time instead of setting the timer back to zero.
                building.productionTimer -= production.seconds;
            }
        }

        // Soldier movement is still basic here.
        // Find enemy -> walk straight towards it -> stop near it -> attack.
        // Possible later: route around buildings instead of walking through them.
        for (const soldier of this.soldiers) {
            if (soldier.health <= 0) continue;
            soldier.attackTimer = Math.max(0, soldier.attackTimer - delta);
            // Infinity means the soldier can look anywhere on the map for a target.
            const nearest = this.findEnemy(soldier, Infinity);
            if (!nearest) continue;
            const distance = this.distance(soldier, nearest);
            if (distance > 2) {
                // Stop at the attack distance rather than walking through the target.
                const step = Math.min(3 * delta, distance - 2);
                // Difference / distance gives the direction, then step gives how far to move.
                // Without dividing, far-away targets would make soldiers move faster.
                soldier.x += (nearest.x - soldier.x) / distance * step;
                soldier.z += (nearest.z - soldier.z) / distance * step;
            } else if (soldier.attackTimer === 0) {
                this.damage(nearest, 10);
                soldier.attackTimer = 1;
            }
        }
        this.removeDestroyed();
    }
}
