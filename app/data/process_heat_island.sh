#!/bin/bash
set -e
set -o pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================
cd "$(dirname "$0")"

INPUT_FILE="MOD_LSTD_M_2025-12-01_rgb_1440x720.FLOAT.TIFF"
OUTPUT_PMTILES="planet_uhi_anomaly.pmtiles"
CLEAN_INPUT="temp_clean.tif"       # Input with oceans removed
REGIONAL_REF="temp_regional_blur.tif"
TEMP_LOWRES="temp_lowres.tif"
DELTA_TIFF="temp_anomaly.tif"
QUANTIZED_TIFF="temp_quantized.tif"
LAYER_NAME="heat_island_layer"
FIELD_NAME="anomaly"

echo "📂 Working directory: $(pwd)"

# ==============================================================================
# 0. DEPENDENCY CHECKS
# ==============================================================================
if ! command -v gdal_calc.py &> /dev/null || ! command -v tippecanoe &> /dev/null; then
    echo "❌ Error: Missing tools. Install GDAL and Tippecanoe."
    exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Input file '$INPUT_FILE' not found."
    exit 1
fi

# ==============================================================================
# 1. SANITIZE INPUT (Remove Oceans/Clouds)
# ==============================================================================
# We must remove the 9999 values BEFORE blurring, otherwise the "Regional Avg"
# will be skewed massively by the fake hot ocean data.
echo "🔹 Step 1/5: Cleaning input data (removing > 100 values)..."

gdal_calc.py \
    -A "$INPUT_FILE" \
    --calc="numpy.where(A > 100, -9999, A)" \
    --outfile="$CLEAN_INPUT" \
    --NoDataValue=-9999 \
    --type=Float32 \
    --quiet \
    --overwrite

# ==============================================================================
# 2. CALCULATE REGIONAL BASELINE (The "Blur" Step)
# ==============================================================================
echo "🔹 Step 2/5: Calculating regional baseline..."

# 1. Downsample (Average) - Uses the CLEAN input now
gdal_translate \
    -outsize 2% 2% \
    -r average \
    "$CLEAN_INPUT" \
    "$TEMP_LOWRES" \
    -q

# 2. Upscale (Smooth Gradient)
# Using 'bilinear' creates a smooth "expected temperature" map
DIMS=$(gdalinfo "$INPUT_FILE" | grep "Size is" | awk '{print $3, $4}' | tr -d ',')
WIDTH=$(echo $DIMS | awk '{print $1}')
HEIGHT=$(echo $DIMS | awk '{print $2}')

gdal_translate \
    -outsize "$WIDTH" "$HEIGHT" \
    -r bilinear \
    "$TEMP_LOWRES" \
    "$REGIONAL_REF" \
    -q

# ==============================================================================
# 3. CALCULATE ANOMALY
# ==============================================================================
# Logic: Real Temp (A) - Regional Avg (B) = Anomaly
echo "🔹 Step 3/5: Calculating anomalies..."

gdal_calc.py \
    -A "$CLEAN_INPUT" \
    -B "$REGIONAL_REF" \
    --calc="A - B" \
    --outfile="$DELTA_TIFF" \
    --NoDataValue=-9999 \
    --type=Float32 \
    --quiet \
    --overwrite

# ==============================================================================
# 4. QUANTIZE & FILTER
# ==============================================================================
# Keep only places that are significantly hotter than their surroundings (> 1°C).
# We convert to Int16 to save space.
echo "🔹 Step 4/5: Quantizing anomalies (Rounding)..."

gdal_calc.py \
    -A "$DELTA_TIFF" \
    --calc="numpy.where(A > 1, round(A), 0)" \
    --outfile="$QUANTIZED_TIFF" \
    --NoDataValue=0 \
    --type=Int16 \
    --quiet \
    --overwrite

# ==============================================================================
# 5. POLYGONIZE & TILE (High Fidelity Pipeline)
# ==============================================================================
echo "🔹 Step 5/5: generating PMTiles..."

# Using the exact same pipeline as process_data.sh:
# - Python regex to fix JSON stream
# - No Simplification to keep pixel-art look
# - Buffer 0 to prevent tile clipping

gdal_polygonize.py "$QUANTIZED_TIFF" -f "GeoJSONSeq" /vsistdout/ "$LAYER_NAME" "$FIELD_NAME" -q \
| python3 -c "
import sys, re
pattern = re.compile(r'\.([,}\]])')
for line in sys.stdin:
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
rm "$CLEAN_INPUT" "$TEMP_LOWRES" "$REGIONAL_REF" "$DELTA_TIFF" "$QUANTIZED_TIFF"

echo "✅ Done! Created $OUTPUT_PMTILES"
echo "👉 This map shows how much hotter a spot is compared to its surroundings."