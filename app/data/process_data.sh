#!/bin/bash
set -e
set -o pipefail

# ==============================================================================
# 0. SETUP & DIRECTORY DETECTION
# ==============================================================================
# Switch to the directory where this script is located
cd "$(dirname "$0")"

INPUT_FILE="MOD_LSTD_M_2025-12-01_rgb_3600x1800.FLOAT.TIFF"
OUTPUT_PMTILES="planet_heat.pmtiles"
TEMP_TIFF="temp_quantized.tif"
LAYER_NAME="heat_layer"
FIELD_NAME="temp"

echo "📂 Working directory: $(pwd)"

# ==============================================================================
# 1. DEPENDENCY CHECKS
# ==============================================================================
if ! command -v gdal_calc.py &> /dev/null; then
    echo "❌ Error: gdal_calc.py not found. Install GDAL."
    exit 1
fi
if ! command -v tippecanoe &> /dev/null; then
    echo "❌ Error: tippecanoe not found. Install Tippecanoe."
    exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Input file '$INPUT_FILE' not found in $(pwd)."
    exit 1
fi

# ==============================================================================
# 2. QUANTIZE (Raster Step)
# ==============================================================================
echo "🔹 Step 1/3: Quantizing raster (Float -> Int16)..."

# Round values to nearest integer and set NoData to -9999
gdal_calc.py \
    -A "$INPUT_FILE" \
    --calc="numpy.where(A > 100, -9999, A)" \
    --outfile="$TEMP_TIFF" \
    --NoDataValue=-9999 \
    --type=Int16 \
    --quiet \
    --overwrite

# ==============================================================================
# 3. POLYGONIZE & TILE (Streamed)
# ==============================================================================
echo "🔹 Step 2/3 & 3/3: Converting to polygons and generating PMTiles..."

# We use a tiny embedded Python script to clean the JSON stream.
# This avoids 'sed' compatibility issues on macOS vs Linux.
# It removes trailing dots from numbers (e.g. "25." -> "25") which crash Tippecanoe.

gdal_polygonize.py "$TEMP_TIFF" -f "GeoJSONSeq" /vsistdout/ "$LAYER_NAME" "$FIELD_NAME" -q \
| python3 -c "
import sys, re
# Pattern: match a dot followed strictly by a comma, closing brace, or closing bracket
pattern = re.compile(r'\.([,}\]])')
for line in sys.stdin:
    # Remove the dot, keep the delimiter
    sys.stdout.write(pattern.sub(r'\1', line))
" \
| tippecanoe \
    --output="$OUTPUT_PMTILES" \
    --force \
    --layer="$LAYER_NAME" \
    -zg \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --no-simplification \
    --buffer=0 \
    --read-parallel

# ==============================================================================
# CLEANUP
# ==============================================================================
rm "$TEMP_TIFF"
echo "✅ Done! Created $OUTPUT_PMTILES"