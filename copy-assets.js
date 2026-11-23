import { cpSync } from 'node:fs';

// keep folders
cpSync('assets', 'dist/assets', { recursive: true, dereference: true }); // include model textures and folders
