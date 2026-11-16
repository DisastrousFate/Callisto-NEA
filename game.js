/*------------INVENTORY--------------*/


export class Inventory {
    constructor() {
        this.iridium = 100; // starting value
    }

    add(value) {
        if(!Number.isFinite(value) || value <= 0){
            return false; // cannot add.
        } else{
            this.iridium += value;
            return true;
        }
    }

    spend(value) {
        if(!Number.isFinite(value) || value <= 0){
            return false; // cannot spend.
        } else if(this.iridium < value){
            return false; // not enough to spend.
        } else{
            this.iridium -= value;
            return true;
        }
    }

}

/*------------PLAYER--------------*/

export class Player {
    constructor(team, x, z) {
        this.team = team;
        this.x = x;
        this.z = z;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.respawnTimer = 0;
        this.attackTimer = 0;

        this.Inventory = new Inventory();
    }

    take_Damage(value){
        if(this.health <= 0 || !Number.isFinite(value) || value <= 0){
            return false; // cannot take damage.
        } else{
            this.health = Math.max(0, this.health - value);
            if(this.health === 0){
                this.respawnTimer = 5; // respawn in 5 seconds
            }
            return true;
        }
    }
}

/*------------SOLDIERS--------------*/

export class Soldier {
    constructor(team, x, z) {
        this.team = team;
        this.x = x;
        this.z = z;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.respawnTimer = 0;
        this.attackTimer = 1;
    }
}

/*------------GAME--------------*/

export class Game {
    constructor(gameData) { 
        this.buildItems = gameData.buildItems

        this.players = [ // set 2 players
            new Player(0,0,0),
            new Player(1,12,0)
        ]

        this.buildings = []
        this.soldiers = []

        this.resourceNodes = []
        for(const node of gameData.resourceNodes){
            this.resourceNodes.push({
                x: node.x,
                z: node.z,
                type: node.type,
                amount: node.amount
            })
        }

        this.activeTeam = 0; // team 0 starts first
        this.nextId = 1;
        this.message = 'Build a pump near a purple resource node to collect iridium.';
        

        // -- //

        this.add_building('respawn-beacon', 0, -12, -4);
        this.add_building('respawn-beacon', 1, 12, -4);


    }

    get player(){
        return this.players[this.activeTeam];
    }

    distance(first, second){
        return Math.hypot(first.x - second.x, first.z - second.z);
    }

    add_building(type, team, x, z){
        const building = {
            id: this.nextId,
            type: type,
            team: team,
            x: x,
            z: z,
            health: this.buildItems[type].health,
            productionTimer: 0

        }
        this.nextId++;
        this.buildings.push(building);
        return building;
    }

    /*------------PLACEMENT--------------*/

    placementError(type, x, z){
        // check if placement is valid
        const item = this.buildItems[type];
        const position = {x: x, z: z};
        if(!item || !Object.hasOwn(this.buildItems, type)){
            return 'unknown building';
        }
        if(this.player.health <= 0){
            return 'wait until you have respawned';
        }
        if(!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 47 || Math.abs(z) > 47){
            return 'place the building inside the map';
        }
        if(this.distance(this.player, position) > 15){
            return 'build within 15 units of your player';
        }

        for(const building of this.buildings){
            if(building.health > 0 && this.distance(building, position) < 2){
                return 'too close to another building';
            }
        }

        // Only pumps need a node. One nearby node is enough.
        if(item.production){
            let nearNode = false;
            for(const node of this.resourceNodes){
                if(this.distance(node, position) <= item.production.nodeRange){
                    nearNode = true;
                    break;
                }
            }
            if(!nearNode){
                return 'too far from a resource node';
            }
        }

        return null; // no error found
    }

    placeBuilding(type, x, z){
        const error = this.placementError(type, x, z);
        if(error){
            this.message = error;
            return false;
        }
        
        if(!this.player.Inventory.spend(this.buildItems[type].cost)){
            this.message = 'not enough iridium!';
            return false;
        }

        this.add_building(type, this.activeTeam, x, z);
        this.message = 'building placed!';
        return true;
    }

    /*------------COMBAT--------------*/

    trainSoldier(){
        if(this.player.health <= 0){
            this.message = 'you are dead!';
            return false;
        }

        let barracks = null;
        for (const building of this.buildings){
            if(building.team === this.activeTeam && building.type === 'barracks' && building.health > 0){
                barracks = building;
                break;
            }
        }
        
        if(!barracks){
            this.message = 'no barracks available!';
            return false;
        }
        
        let armySize = 0;
        for(const soldier of this.soldiers){
            if(soldier.team === this.activeTeam && soldier.health > 0){
                armySize++;
            }
        }

        if(armySize >= 5){
            this.message = 'army is full!';
            return false;
        }

        if(!this.player.Inventory.spend(20)){
            this.message = 'not enough resources!';
            return false;
        }

        this.soldiers.push(new Soldier(this.activeTeam, barracks.x, barracks.z + 2));
        this.message = 'soldier trained!';
        return true;

    }

    attack(){
        const player = this.player;
        if(player.health <= 0 || player.attackTimer > 0){
            return false;
        }
        const nearest = this.findEnemy(player, 8);
        if(!nearest){
            this.message = 'no enemies in range!';
            return false;
        }
        this.damage(nearest, 20);
        player.attackTimer = 1;
        this.message = 'attacked enemy!';
        return true;
    }

    findEnemy(attacker, range){
        const targets = this.players.concat(this.soldiers, this.buildings);
        let nearest = null;
        let nearestDistance = Infinity;

        for(const target of targets){
            if(target.team === attacker.team || target.health <= 0){
                continue;
            }
            const distance = this.distance(attacker, target);
            if(distance < range && distance < nearestDistance){
                nearest = target;
                nearestDistance = distance;
            }
        }
        return nearest;

    }

    damage(target, amount){
        if(target instanceof Player){
            target.take_Damage(amount);
        } else{
            target.health = Math.max(0, target.health - amount);
        }
    }

    recycleBuilding(){
        if(this.player.health <= 0){
            return false;
        }
        for(const building of this.buildings){
            if(building.team === this.activeTeam && building.health > 0 && this.distance(building, this.player) <= 6){
                building.health = 0;
                this.player.Inventory.add(Math.floor(this.buildItems[building.type].cost / 2));
                this.removeDestroyed();
                this.message = 'building recycled!';
                return true;
            }
        }
        this.message = 'move closer to one of your buildings';
        return false;
    }

    removeDestroyed(){
        this.buildings = this.buildings.filter(building => building.health > 0);
        this.soldiers = this.soldiers.filter(soldier => soldier.health > 0);
    }

    /*------------UPDATE--------------*/

    update(delta){
        // update timers

        if(!Number.isFinite(delta) || delta <= 0){
            return;
        }

        for(const player of this.players){
            player.attackTimer = Math.max(0, player.attackTimer - delta);
            if(player.health > 0){
                continue;
            }
            player.respawnTimer = Math.max(0, player.respawnTimer - delta);

            let beacon = null;

            for(const building of this.buildings){
                if(building.team === player.team && building.type === 'respawn-beacon' && building.health > 0){
                    beacon = building;
                    break;
                }
            }

            if(player.respawnTimer === 0 && player.health <= 0 && beacon){
                player.x = beacon.x;
                player.z = beacon.z + 4; // leave space between player and beacon
                player.health = player.maxHealth;
                this.message = 'player respawned at beacon!';
            }

        }

        for(const building of this.buildings){
            const production = this.buildItems[building.type].production;
            if(production && building.health > 0){
                building.productionTimer += delta;
                while(building.productionTimer >= production.seconds){
                    building.productionTimer -= production.seconds;
                    this.players[building.team].Inventory.add(production.iridium);
                }
            }
        }

        for(const soldier of this.soldiers){
            if(soldier.health <= 0){
                continue;
            }

            soldier.attackTimer -= delta;
            const nearest = this.findEnemy(soldier, Infinity);
            if(!nearest){
                continue;
            }
            const distance = this.distance(soldier, nearest);
            if(distance > 2){
                const directionX = nearest.x - soldier.x;
                const directionZ = nearest.z - soldier.z;
                const step = Math.min(delta * 2, distance - 2);
                soldier.x += (directionX / distance) * step;
                soldier.z += (directionZ / distance) * step;
            } else if(soldier.attackTimer <= 0){
                this.damage(nearest, 10);
                soldier.attackTimer = 1;
                this.message = 'soldier attacked!';
            }
        }

        this.removeDestroyed();
    }
}
