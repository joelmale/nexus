#!/usr/bin/env node

/**
 * Generate manifest.json for default bundled assets
 * Scans public/assets/defaults/ and creates metadata
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULTS_DIR = path.join(__dirname, '../public/assets/defaults');
const OUTPUT_FILE = path.join(DEFAULTS_DIR, 'manifest.json');

// Token name patterns for classification
const TOKEN_PATTERNS = {
  pc: /^(Human|Elf|Dwarf|Halfling|Gnome|Dragonborn|Tiefling|HalfElf|HalfOrc|Orc).*?(Fighter|Wizard|Cleric|Rogue|Ranger|Paladin|Barbarian|Bard|Druid|Monk|Sorcerer|Warlock|Artificer)/i,
  monster:
    /^(Goblin|Orc|Dragon|Skeleton|Zombie|Troll|Giant|Demon|Devil|Beast)/i,
  npc: /^(Soldier|Guard|Merchant|Noble|Peasant|Priest|Cultist)/i,
};

const SIZE_PATTERNS = {
  tiny: /tiny/i,
  small: /(small|halfling|gnome|goblin)/i,
  medium:
    /(human|elf|dwarf|fighter|wizard|cleric|rogue|ranger|paladin|soldier)/i,
  large: /(large|ogre|troll)/i,
  huge: /(huge|giant)/i,
  gargantuan: /(gargantuan|dragon|colossal)/i,
};

const MAP_CATEGORY_PATTERNS = {
  dungeon: /(dungeon|cave|crypt|tomb|ruins|ancient|den|lair|underground)/i,
  indoor: /(tavern|inn|house|castle|temple|shop|interior|room|hall)/i,
  outdoor: /(forest|field|camp|wilderness|road|path|clearing|hillside|lakeside|seaside|beach|shore|ocean|sea|river|swamp|jungle|woodland|astral)/i,
  urban: /(city|town|street|alley|square|marketplace|dock)/i,
};

/**
 * Extract token metadata from filename
 */
function parseTokenName(filename) {
  const nameWithoutExt = path.basename(filename, path.extname(filename));

  // Determine category
  let category = 'pc';
  for (const [cat, pattern] of Object.entries(TOKEN_PATTERNS)) {
    if (pattern.test(nameWithoutExt)) {
      category = cat;
      break;
    }
  }

  // Determine size
  let size = 'medium';
  for (const [sz, pattern] of Object.entries(SIZE_PATTERNS)) {
    if (pattern.test(nameWithoutExt)) {
      size = sz;
      break;
    }
  }

  // Extract tags from name
  const tags = nameWithoutExt
    .replace(/([A-Z])/g, ' $1') // Split camelCase
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter((tag) => tag.length > 2);

  return {
    name: nameWithoutExt.replace(/([A-Z])/g, ' $1').trim(),
    category,
    size,
    tags: [...new Set(tags)],
  };
}

/**
 * Extract map metadata from filename
 */
function parseMapName(filename) {
  const nameWithoutExt = path.basename(filename, path.extname(filename));

  // Extract dimensions if present (e.g., "44x32")
  const dimensionMatch = nameWithoutExt.match(/(\d+)x(\d+)/);
  const gridSize = dimensionMatch
    ? {
        width: parseInt(dimensionMatch[1]),
        height: parseInt(dimensionMatch[2]),
      }
    : null;

  // Determine category
  let category = 'outdoor'; // default
  for (const [cat, pattern] of Object.entries(MAP_CATEGORY_PATTERNS)) {
    if (pattern.test(nameWithoutExt)) {
      category = cat;
      break;
    }
  }

  // Extract tags
  const tags = nameWithoutExt
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter((tag) => tag.length > 2 && !/^\d+x\d+$/.test(tag));

  return {
    name: nameWithoutExt.replace(/_/g, ' ').replace(/ - /g, ' - '),
    category,
    gridSize,
    tags: [...new Set(tags)],
  };
}

/**
 * Scan directory for image files
 */
function scanDirectory(dir, baseDir, type) {
  const items = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (file.startsWith('.')) continue;

    // Skip thumbnails directory and thumbnail files
    if (file === 'thumbnails' || file.includes('.thumb.')) continue;

    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      items.push(...scanDirectory(fullPath, baseDir, type));
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const ext = path.extname(file).toLowerCase().substring(1);

      let metadata;
      if (type === 'token') {
        metadata = parseTokenName(file);
      } else if (type === 'map') {
        metadata = parseMapName(file);
      }

      // Check for thumbnail
      const thumbnailFilename = file.replace(/\.(png|jpg|jpeg|webp)$/i, '.thumb.jpg');
      const thumbnailPath = path.join(path.dirname(fullPath), 'thumbnails', thumbnailFilename);
      const hasThumbnail = fs.existsSync(thumbnailPath);
      const thumbnailRelativePath = hasThumbnail
        ? path.relative(baseDir, thumbnailPath).replace(/\\/g, '/')
        : null;

      items.push({
        id: `default-${type}-${items.length + 1}`,
        type,
        ...metadata,
        path: `/assets/defaults/${relativePath}`,
        thumbnail: thumbnailRelativePath ? `/assets/defaults/${thumbnailRelativePath}` : undefined,
        format: ext,
        isDefault: true,
      });
    }
  }

  return items;
}

/**
 * Generate manifest
 */
function generateManifest() {
  console.log('Generating default asset manifest...');

  const tokensDir = path.join(DEFAULTS_DIR, 'tokens');
  const mapsDir = path.join(DEFAULTS_DIR, 'base_maps');

  const tokens = fs.existsSync(tokensDir)
    ? scanDirectory(tokensDir, DEFAULTS_DIR, 'token')
    : [];

  const maps = fs.existsSync(mapsDir)
    ? scanDirectory(mapsDir, DEFAULTS_DIR, 'map')
    : [];

  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalAssets: tokens.length + maps.length,
    tokens: {
      count: tokens.length,
      items: tokens,
    },
    maps: {
      count: maps.length,
      items: maps,
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

  console.log(`✅ Manifest generated successfully!`);
  console.log(`   Tokens: ${tokens.length}`);
  console.log(`   Maps: ${maps.length}`);
  console.log(`   Output: ${OUTPUT_FILE}`);
}

// Run
try {
  generateManifest();
} catch (error) {
  console.error('❌ Error generating manifest:', error);
  process.exit(1);
}
