# Callisto

Run `npm install` if dependencies are not installed, then `npm run dev` and open the local address printed by Vite. `npm test` runs the eight game-logic checks. `npm run build` creates `dist` with the required model and texture files.

WASD moves the player, dragging orbits the camera and scrolling zooms. Open Build, select an item and choose Place. Move the pointer over the terrain, press E to confirm, or Escape to cancel. Invalid positions display an explanation and do not spend iridium.

Each local team starts with 100 iridium and a respawn beacon. A pump costs 25 and must be within six units of a purple node; it generates five iridium every two seconds. A barracks costs 35; Train soldier spends 20 and produces an automatic soldier. A new respawn beacon costs 40. Buildings need two units of spacing and must be within 15 units of your player. The Inventory menu shows your balance and buildings.

F or Attack damages the nearest enemy within eight units by 20, with a one-second cooldown. Soldiers approach enemies and cause 10 damage each second within two units. Players and soldiers have 100 health. Each team can train five soldiers. A dead player respawns after five seconds if their team still owns a surviving beacon. Recycle removes a nearby owned building and refunds half its cost, rounded down.

Switch local team lets you control the opposing player on this computer. It is a local demonstration, not network multiplayer. To demonstrate combat, build a barracks and train a soldier, or move one player towards the other and press F. Build a pump first to fund further recruitment. Reload to reset the match.

`game.js` stores simulation data without graphics dependencies. `main.js` connects it to Three.js, `hud.js` displays menus and values, and `input.js` handles controls. `character.js` keeps the existing astronaut and camera. `game.test.js` verifies inventory, placement, production, health, attacks, recruitment, soldiers and recycling.

Current limits: one resource, fixed nodes, flat map, direct production into inventory, direct soldier movement, no obstacle avoidance, persistence, network multiplayer or win/loss system. The existing Clock deprecation and GLTF material-extension warnings remain; neither prevented the browser checks. The production build warns about the main bundle size.

The additions were produced with AI coding assistance. Review and understand the code and follow your centre's rules for acknowledgement before using it in assessed work.
