#!/bin/bash
# Post-build script to copy index.html to subdirectories for GitHub Pages
# Assets use absolute paths, so only index.html needs to be copied

DIST_DIR="dist"

echo "Creating path copies for GitHub Pages..."

# /dev/ - Development version
mkdir -p "$DIST_DIR/dev"
cp "$DIST_DIR/index.html" "$DIST_DIR/dev/"

# /game/neo/ - Neo's version  
mkdir -p "$DIST_DIR/game/neo"
cp "$DIST_DIR/index.html" "$DIST_DIR/game/neo/"

# /luan/ - Luan's version
mkdir -p "$DIST_DIR/luan"
cp "$DIST_DIR/index.html" "$DIST_DIR/luan/"

echo "Done! Created index.html copies at /dev/, /game/neo/, and /luan/"
