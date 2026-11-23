export const buildItems = { // build rules
    'jack-pump': {
        name: 'Jack Pump',
        cost: 25,
        health: 80,
        model: './assets/jack_pump/scene.gltf',
        modelSize: 3,
        production: { iridium: 5, seconds: 2, nodeRange: 6 } // pump rates
    },
    'respawn-beacon': { name: 'Respawn Beacon', cost: 40, health: 100 },
    barracks: { name: 'Barracks', cost: 35, health: 100 }
};

const startingNodes = [ // fixed deposits
    { x: -18, z: -8, type: 'iridium', amount: 100 },
    { x: 18, z: -8, type: 'iridium', amount: 100 }
];

/*------------INVENTORY--------------*/


export class Inventory {
    constructor() {
        this.iridium = 100; // starting value
    }

    add(value) {
        if(!Number.isFinite(value) || value <= 0){
            return false; // invalid amount
        } else{
            this.iridium += value; // credit inventory
            return true;
        }
    }

    spend(value) {
        if(!Number.isFinite(value) || value <= 0){
            return false; // invalid amount
        } else if(this.iridium < value){
            return false; // low iridium
        } else{
            this.iridium -= value; // debit inventory
            return true;
        }
    }

}

/*------------PLAYER--------------*/

export class Player {
    constructor(team, x, z, Character) { // tests can skip character meshes
        if(team !== 0 && Character){
            this.character = new Character(null, x, 1, z, true); // red character
        }
        this.team = team;
        this.x = x;
        this.z = z;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.respawnTimer = 0;
        this.attackTimer = 0; // attack cooldown

        this.Inventory = new Inventory(); // one balance per player
    }

    // - subtract health and start the respawn timer if it reaches zero
    take_Damage(value){
        if(!Number.isFinite(value) || value <= 0){
            return false; // invalid damage
        } else{
            if(this.health === 0) return false; // already dead
            this.health = Math.max(0, this.health - value); // keep health at zero or above
            if(this.health <= 0){
                this.respawnTimer = 5; // respawn delay
            }
            return true;
        }
    }
}

/*------------SOLDIERS--------------*/

export class Solider {
    constructor(team, x, z) {
        this.team = team;
        this.x = x;
        this.z = z;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.respawnTimer = 0;
        this.attackTimer = 1; // attack delay
    }
}

/*------------GAME--------------*/

export class Game {
    constructor(gameData = { buildItems, resourceNodes: startingNodes }, Character) { // default data
        this.buildItems = gameData.buildItems
        console.log(this.buildItems)
        this.players = [ // two players
            new Player(0,-12,0),
            new Player(1,12,0, Character)
        ]

        this.buildings = []
        this.soldiers = []

        this.resourceNodes = []
        for(const node of gameData.resourceNodes){ // copy deposits
            this.resourceNodes.push({
                x: node.x,
                z: node.z,
                type: node.type,
                amount: node.amount
            })
        }

        this.activeTeam = 0; // blue first
        this.nextId = 1; // unique ids
        this.message = 'build something!';
        

        // -- //

        this.add_building('respawn-beacon', 0, -12, -4); // starting beacons
        this.add_building('respawn-beacon', 1, 12, -4);



    }

    get player(){
        return this.players[this.activeTeam]; // active player
    }

    distance(first, second){
        return Math.hypot(first.x - second.x, first.z - second.z); // ground distance
    }

    // - give the building an id and add it to the game
    add_building(type, team, x, z){
        const building = {
            id: this.nextId,
            type: type,
            team: team,
            x: x,
            z: z,
            health: this.buildItems[type].health, // starting health
            productionTimer: 0

        }
        this.nextId++; // save next id for later
        this.buildings.push(building); // track building
        return building;
    }

    /*------------PLACEMENT--------------*/

    // - return the first reason a spot is invalid or null if clear
    placementError(type, x, z){
        // placement checks

        if(!Object.hasOwn(this.buildItems, type)) return 'unknown building'; // known type
        const item = this.buildItems[type];
        if(this.player.health <= 0) return 'you are dead!'; // living player
        if(!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 49 || Math.abs(z) > 49) return 'outside the map'; // map bounds
        if(this.player.Inventory.iridium < item.cost) return 'not enough resources!'; // require funds

        for(const building of this.buildings){
            if(this.distance(building, {x, z}) < 2){ // building spacing
                return 'too close to another building';
            }
        }
        if(item.production && !this.resourceNodes.some(node => this.distance(node, {x, z}) <= item.production.nodeRange)){ // pumps need a deposit nearby
            return 'too far from a resource node';
        }
        return null; // valid placement
    }

    // - check the spot then spend iridium and add the building
    placeBuilding(type, x, z){
        const error = this.placementError(type, x, z);
        if(error){ // reject placement
            this.message = error;
            return false;
        }
        
        this.player.Inventory.spend(this.buildItems[type].cost); // deduct cost after placement checks

        const building = this.add_building(type, this.activeTeam, x, z); // save building
        this.message = 'building placed!';
        return true;
    }

    /*------------COMBAT--------------*/

    // - check barracks space and funds then spawn a soldier
    trainSoldier(){
        if(this.player.health <= 0){
            this.message = 'you are dead!';
            return false;
        }

        let barracks = null;
        for (const building of this.buildings){
            if(building.team === this.activeTeam && building.type === 'barracks'){ // owned barracks
                barracks = building;
                break; // use the first owned barracks
            }
        }
        
        if(!barracks){
            this.message = 'no barracks available!';
            return false;
        }
        
        let armySize = 0;
        for(const soldier of this.soldiers){
            if(soldier.team === this.activeTeam){ // allied soldiers
                armySize++;
            }
        }

        if(armySize >= 5){ // army cap
            this.message = 'army is full!';
            return false;
        }

        if(!this.player.Inventory.spend(20)){ // training cost
            this.message = 'not enough resources!';
            return false;
        }

        this.soldiers.push(new Solider(this.activeTeam, barracks.x, barracks.z + 2)); // spawn just outside the barracks
        this.message = 'soldier trained!';
        return true;

    }

    // - hit the closest enemy in range when the cooldown is clear
    attack(){
        const player = this.player;
        if(player.health <= 0 || player.attackTimer > 0){ // dead or still on cooldown
            return false;
        }
        const nearest = this.findEnemy(player, 8); // attack radius
        if(!nearest){
            this.message = 'no enemies in range!';
            return false;
        }
        if(nearest instanceof Player) nearest.take_Damage(20); // start respawn on lethal damage
        else nearest.health -= 20; // other damage
        player.attackTimer = 1; // reset cooldown
        this.message = 'attacked enemy!';
        return true;
    }

    // - find the nearest living enemy within range
    findEnemy(attacker, range){
        const targets = this.players.concat(this.soldiers, this.buildings); // check players soldiers and buildings
        let nearest = null;
        let nearestDistance = Infinity;

        for(const target of targets){
            if(target.team === attacker.team || target.health <= 0){ // skip allies and dead targets
                continue;
            }
            const distance = this.distance(attacker, target);
            if(distance < range && distance < nearestDistance){ // closer target
                nearest = target;
                nearestDistance = distance;
            }
        }
        return nearest;

    }

    /*------------UPDATE--------------*/

    // - tick respawns and pump payouts then move soldiers and resolve fights
    update(delta){
        // update timers

        if(!Number.isFinite(delta) || delta <= 0){ // invalid delta
            return;
        }

        for(const player of this.players){
            if(player.attackTimer > 0){
                player.attackTimer -= delta; // tick cooldown
            }

            let beacon = null;

            for(const building of this.buildings){
                if(building.team === player.team && building.type === 'respawn-beacon' && building.health > 0){ // surviving beacon
                    beacon = building;
                    break; // first beacon
                }
            }

            player.respawnTimer = Math.max(0, player.respawnTimer - delta); // count down without going negative
            if(player.respawnTimer === 0 && player.health <= 0 && beacon){ // respawn check
                player.x = beacon.x; // beacon spawn
                player.z = beacon.z;
                player.health = player.maxHealth; // restore health
                this.message = 'player respawned at beacon!';
            }

        }

        for(const building of this.buildings){
            const production = this.buildItems[building.type].production;
            if(production && building.health > 0){ // working producer
                building.productionTimer += delta;
                while(building.productionTimer >= production.seconds){ // pay for each full interval
                    building.productionTimer -= production.seconds; // carry leftover time forward
                    this.players[building.team].Inventory.add(production.iridium); // pay the team that owns it
                    this.message = 'resources produced!';
                }
            }
        }

        for(const soldier of this.soldiers){
            if(soldier.health <= 0){ // skip defeated
                continue;
            }

            soldier.attackTimer -= delta;
            const nearest = this.findEnemy(soldier, Infinity); // nearest enemy
            if(!nearest){
                continue;
            }
            const distance = this.distance(soldier, nearest);
            if(distance > 2){ // walk closer before attacking
                const directionX = nearest.x - soldier.x;
                const directionZ = nearest.z - soldier.z;
                const length = Math.hypot(directionX, directionZ); // used to normalise the direction
                soldier.x += (directionX / length) * delta * 2; // advance x
                soldier.z += (directionZ / length) * delta * 2; // advance z
            } else if(soldier.attackTimer <= 0){ // attack ready
                if(nearest instanceof Player) nearest.take_Damage(10);
                else nearest.health -= 10;
                soldier.attackTimer = 1; // reset cooldown
                this.message = 'soldier attacked!';
            }



        }


        this.soldiers = this.soldiers.filter(soldier => soldier.health > 0); // remove casualties
        this.buildings = this.buildings.filter(building => building.health > 0); // remove ruins
    }
}
