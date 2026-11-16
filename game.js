/*------------INVENTORY--------------*/


export class Inventory {
    constructor() {
        this.iridium = 100; // starting value
    }

    add(value) {
        if(value <= 0){
            return false; // cannot add.
        } else{
            this.iridium += value;
            return true;
        }
    }

    spend(value) {
        if(value <= 0){
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
        if(value <= 0){
            return false; // cannot take damage.
        } else{
            this.health -= value;
            if(this.health <= 0){
                this.respawnTimer = 5; // respawn in 5 seconds
                this.health = 100; // reset health
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
        this.attackTimer = 1;
    }
}

/*------------GAME--------------*/

export class Game {
    constructor(gameData) { 
        this.buildItems = gameData.buildItems

        this.players = [ // set 2 players
            new Player(0,-12,0),
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
        this.message = 'build something!';
        

        // -- //

        this.add_building('respawn-beaacon', 0, -12, -4);
        this.add_building('respawn-beaacon', 1, 12, -4);


        // add shit.

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
            health: this.gameData.buildItems[type].health,
            productionTimer: 0

        }
        this.nextId++;
        this.buildings.push(building);
        return building;
    }

    /*------------PLACEMENT--------------*/

    placementError(type, x, z){
        // check if placement is valid

        for(const building of this.buildings){
            if(this.distance(building, {x:x, z:z}) < 2){
                return 'too close to another building';
            }
        }
        
        for(const node of this.resourceNodes){
            if(this.distance(node, {x:x, z:z}) > 15){
                return 'too far to a resource node';
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
        
        this.player.Inventory.spend(this.buildItems[type].cost);

        const building = this.add_building(type, this.activeTeam, x, z);
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
            if(building.team === this.activeTeam && building.type === 'barracks'){
                barracks = building;
                break;
            }
        }
        
        if(!barracks){
            this.message = 'no barracks available!';
            return false;
        }
        
        const armySize = 0;
        for(const soldier of this.soldiers){
            if(soldier.team === this.activeTeam){
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

        this.soldiers.push(new Solider(this.activeTeam, barracks.x, barracks.z + 2));
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
        nearest.health -= 20;
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

    /*------------UPDATE--------------*/

    update(delta){
        // update timers

        if(delta <= 0){
            return;
        }

        for(const player of this.players){
            if(player.respawnTimer > 0){
                player.respawnTimer -= delta;
                if(player.respawnTimer <= 0){
                    player.health = player.maxHealth;
                    this.message = 'player respawned!';
                }
            }

            if(player.attackTimer > 0){
                player.attackTimer -= delta;
            }

            let beacon = null;

            for(const building of this.buildings){
                if(building.team === player.team && building.type === 'respawn-beaacon' && building.health > 0){
                    beacon = building;
                    break;
                }
            }

            if(player.respawnTimer === 0 && player.health <= 0 && beacon){
                player.x = beacon.x;
                player.z = beacon.z;
                player.health = player.maxHealth;
                this.message = 'player respawned at beacon!';
            }

        }

        for(const building of this.buildings){
            const production = this.gamedata.buildItems[building.type].production;
            if(production && building.health > 0){
                building.productionTimer += delta;
                if(building.productionTimer >= production.time){
                    building.productionTimer = 0;
                    this.players[building.team].Inventory.add(production.amount);
                    this.message = 'resources produced!';
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
                const length = Math.hypot(directionX, directionZ);
                soldier.x += (directionX / length) * delta * 2;
                soldier.z += (directionZ / length) * delta * 2;
            } else if(soldier.attackTimer <= 0){
                nearest.health -= 10;
                soldier.attackTimer = 1;
                this.message = 'soldier attacked!';
            }



        }


    }


}