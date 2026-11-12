import { cpSync } from 'node:fs';

// GLTF models refer to companion texture files, so keep their folder structure.
cpSync('assets', 'dist/assets', { recursive: true, dereference: true });
