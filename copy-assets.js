import { copyFileSync, cpSync } from 'node:fs';

// GLTF models refer to companion texture files, so keep their folder structure.
cpSync('assets', 'dist/assets', { recursive: true, dereference: true });

// The browser reads this file when the game starts.
copyFileSync('assets.json', 'dist/assets.json');
