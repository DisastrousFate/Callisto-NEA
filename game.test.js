import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, Player, Inventory, Soldier } from './game.js';

const assetText = readFileSync(new URL('./gamedata.json', import.meta.url), 'utf8');
const assetData = JSON.parse(assetText);

test('inventories are separate and reject invalid spending', () => {
    const game = new Game(assetData);
    assert.equal(game.players[0].Inventory.spend(25), true);
    assert.equal(game.players[1].Inventory.iridium, 100);
    assert.equal(game.players[0].Inventory.spend(76), false);
    assert.equal(game.players[0].Inventory.spend(-1), false);
    assert.equal(game.players[0].Inventory.spend(NaN), false);
    assert.equal(new Inventory().add(Infinity), false);
});

test('placement validates cost, map, overlap and node range before charging', () => {
    const game = new Game(assetData);
    game.player.x = -12; // Walk from the spawn to the resource area.
    assert.equal(game.placeBuilding('jack-pump', -18, -8), true);
    assert.equal(game.player.Inventory.iridium, 75);
    for (const [x, z] of [[-18, -8], [-12, 8], [100, 0], [NaN, 0]]) {
        assert.equal(game.placeBuilding('jack-pump', x, z), false);
        assert.equal(game.player.Inventory.iridium, 75);
    }
    game.player.Inventory.iridium = 0;
    assert.equal(game.placeBuilding('barracks', -6, -4), false);
});

test('production preserves timer remainder and credits the owner', () => {
    const game = new Game(assetData);
    game.player.x = -12; // Walk from the spawn to the resource area.
    game.placeBuilding('jack-pump', -18, -8);
    game.activeTeam = 1;
    game.update(5);
    assert.equal(game.players[0].Inventory.iridium, 85);
    assert.equal(game.players[1].Inventory.iridium, 100);
    game.update(1);
    assert.equal(game.players[0].Inventory.iridium, 90);
});

test('fatal damage clamps health and respawns only at surviving infrastructure', () => {
    const game = new Game(assetData);
    game.player.take_Damage(150);
    assert.equal(game.player.health, 0);
    game.update(2);
    assert.equal(game.player.health, 0);
    game.update(3);
    assert.equal(game.player.health, 100);
    game.buildings = game.buildings.filter((building) => building.team !== 0);
    game.player.take_Damage(100);
    game.update(10);
    assert.equal(game.player.health, 0);
    assert.equal(game.placeBuilding('respawn-beacon', -8, 0), false);
});

test('player attacks respect team, range and cooldown', () => {
    const game = new Game(assetData);
    assert.equal(game.attack(), false);
    game.players[1].x = -7;
    assert.equal(game.attack(), true);
    assert.equal(game.players[1].health, 80);
    assert.equal(game.attack(), false);
    game.update(1);
    game.attack();
    assert.equal(game.players[1].health, 60);
    assert.equal(game.player.health, 100);
});

test('training needs a barracks, resources and army capacity', () => {
    const game = new Game(assetData);
    assert.equal(game.trainSoldier(), false);
    game.placeBuilding('barracks', -6, -4);
    assert.equal(game.trainSoldier(), true);
    assert.equal(game.player.Inventory.iridium, 45);
    game.player.Inventory.iridium = 19;
    assert.equal(game.trainSoldier(), false);
    game.player.Inventory.iridium = 100;
    game.soldiers = Array.from({length: 5}, () => new Soldier(0, 0, 0));
    assert.equal(game.trainSoldier(), false);
});

test('soldiers move, damage enemies and remove defeated units', () => {
    const game = new Game(assetData);
    const soldier = new Soldier(0, 8, 0);
    game.soldiers.push(soldier);
    game.update(1);
    assert.ok(soldier.x > 8);
    game.update(1);
    assert.equal(game.players[1].health, 90);
    assert.equal(game.players[0].health, 100);
    const enemy = new Soldier(1, soldier.x, soldier.z);
    enemy.health = 10;
    game.soldiers.push(enemy);
    game.update(1);
    assert.ok(!game.soldiers.includes(enemy));
});

test('recycling removes production and refunds half cost once', () => {
    const game = new Game(assetData);
    game.player.x = -12; // Walk from the spawn to the resource area.
    game.placeBuilding('jack-pump', -18, -8);
    game.player.x = -18;
    game.player.z = -8;
    assert.equal(game.recycleBuilding(), true);
    assert.equal(game.player.Inventory.iridium, 87);
    game.update(4);
    assert.equal(game.player.Inventory.iridium, 87);
    assert.equal(game.recycleBuilding(), false);
});
