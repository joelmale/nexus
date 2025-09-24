#!/usr/bin/env node

/**
 * Asset Processing Script
 * 
 * This script processes your map assets and creates:
 * 1. Optimized thumbnails for quick browsing
 * 2. WebP versions for better compression
 * 3. A manifest.json with all asset metadata
 * 
 * Usage:
 * node scripts/process-assets.js /path/to/your/maps /path/to/output
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp'; // npm install sharp
import crypto from 'crypto';

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];
const THUMBNAIL_SIZE = 300;
const MAX_FULL_SIZE = 2048; // Max width/height for full images
const WEBP_QUALITY = 85;
const THUMBNAIL_QUALITY = 80;

class AssetProcessor {
  constructor(inputDir, outputDir) {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
    this.manifestPath = path.join(outputDir, 'manifest.json');
    this.assetsDir = path.join(outputDir, 'assets');
    this.thumbnailsDir = path.join(outputDir, 'thumbnails');
    
    // Ensure directories exist
    [this.assetsDir, this.thumbnailsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async processAssets() {
    console.log('🎨 Processing map assets...');
    console.log(`📁 Input: ${this.inputDir}`);
    console.log(`📁 Output: ${this.outputDir}`);
    
    const assets = [];
    const files = this.getImageFiles(this.inputDir);
    
    console.log(`📊 Found ${files.length} image files`);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📸 Processing ${i + 1}/${files.length}: ${path.basename(file)}`);
      
      try {
        const asset = await this.processAsset(file);
        if (asset) {
          assets.push(asset);
        }
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }
    
    // Generate manifest
    const manifest = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalAssets: assets.length,
      categories: [...new Set(assets.map(a => a.category))].sort(),
      assets: assets.sort((a, b) => a.name.localeCompare(b.name))
    };
    
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('✅ Asset processing complete!');
    console.log(`📊 Processed: ${assets.length} assets`);
    console.log(`📂 Categories: ${manifest.categories.join(', ')}`);
    console.log(`📄 Manifest: ${this.manifestPath}`);
    
    return manifest;
  }

  getImageFiles(dir) {
    const files = [];
    
    const scanDir = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath).toLowerCase();
          if (SUPPORTED_FORMATS.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    scanDir(dir);
    return files;
  }

  async processAsset(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    
    // Generate unique ID based on file path and modification time
    const id = crypto.createHash('md5')
      .update(filePath + stats.mtime.getTime())
      .digest('hex');
    
    // Determine category from folder structure
    const relativePath = path.relative(this.inputDir, filePath);
    const pathParts = relativePath.split(path.sep);
    const category = pathParts.length > 1 ? pathParts[0].toLowerCase() : 'general';
    
    try {
      // Get image metadata
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        console.warn(`⚠️  Skipping ${fileName}: Invalid image metadata`);
        return null;
      }
      
      // Generate optimized full image
      const fullImageName = `${id}.webp`;
      const fullImagePath = path.join(this.assetsDir, fullImageName);
      
      await this.createOptimizedImage(filePath, fullImagePath, MAX_FULL_SIZE);
      
      // Generate thumbnail
      const thumbnailName = `${id}_thumb.webp`;
      const thumbnailPath = path.join(this.thumbnailsDir, thumbnailName);
      
      await this.createThumbnail(filePath, thumbnailPath);
      
      // Generate tags from filename
      const tags = this.generateTags(fileName, category);
      
      const asset = {
        id,
        name: fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        category,
        tags,
        thumbnail: `thumbnails/${thumbnailName}`,
        fullImage: `assets/${fullImageName}`,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        fileSize: stats.size,
        format: ext.replace('.', '')
      };
      
      return asset;
      
    } catch (error) {
      console.error(`Error processing ${fileName}:`, error);
      return null;
    }
  }

  async createOptimizedImage(inputPath, outputPath, maxSize) {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    let resizeOptions = {};
    
    if (metadata.width > maxSize || metadata.height > maxSize) {
      resizeOptions = {
        width: maxSize,
        height: maxSize,
        fit: 'inside',
        withoutEnlargement: true
      };
    }
    
    await image
      .resize(resizeOptions)
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);
  }

  async createThumbnail(inputPath, outputPath) {
    await sharp(inputPath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toFile(outputPath);
  }

  generateTags(fileName, category) {
    const tags = [category];
    
    // Extract common map types from filename
    const mapTypes = [
      'dungeon', 'cave', 'forest', 'castle', 'tower', 'tavern', 'temple',
      'city', 'village', 'road', 'mountain', 'desert', 'swamp', 'beach',
      'underground', 'ruins', 'manor', 'fortress', 'bridge', 'ship'
    ];
    
    const lowerFileName = fileName.toLowerCase();
    mapTypes.forEach(type => {
      if (lowerFileName.includes(type)) {
        tags.push(type);
      }
    });
    
    return [...new Set(tags)];
  }
}

// CLI execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [,, inputDir, outputDir] = process.argv;
  
  if (!inputDir || !outputDir) {
    console.log('Usage: node process-assets.js <input-directory> <output-directory>');
    console.log('');
    console.log('Example:');
    console.log('  node process-assets.js /Volumes/PS2000w/DnD_Assets/maps ./public/map-assets');
    process.exit(1);
  }
  
  if (!fs.existsSync(inputDir)) {
    console.error('❌ Input directory does not exist:', inputDir);
    process.exit(1);
  }
  
  const processor = new AssetProcessor(inputDir, outputDir);
  processor.processAssets()
    .then(() => {
      console.log('🎉 All done! Your assets are ready to use.');
    })
    .catch(error => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}

export { AssetProcessor };
