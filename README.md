# Heat Atlas

**Heat Atlas** is an interactive, web-based visualization tool designed to explore global land surface temperatures and Urban Heat Island (UHI) anomalies. Built with Next.js and MapLibre GL, it efficiently renders massive global datasets using the PMTiles serverless archive format.

### Core Features

* **Dual Visualization Modes**
* **Absolute Temperature:** Displays raw land surface temperature data with a color gradient ranging from Cool (Blue) to Extreme Heat (Deep Red).
* **Heat Island Anomaly:** Highlights urban areas that are significantly hotter than their immediate surroundings, visualizing the intensity of the Urban Heat Island effect.


* **Interactive Filtering:** Users can dynamically adjust temperature thresholds to isolate extreme heat events or specific anomaly intensities.
* **High-Performance Rendering:** Utilizes vector tiles (PMTiles) to render global data smoothly in the browser without heavy server-side infrastructure.
* **Search & Navigation:** Integrated location search to quickly jump to specific cities or regions.

### Tech Stack

* **Framework:** Next.js 16 (React 19)
* **Language:** TypeScript
* **Maps:** MapLibre GL JS
* **Data Format:** PMTiles (Serverless Vector Tiles)
* **Styling:** Tailwind CSS v4
* **Icons:** Lucide React

---

### Data Pipeline

The project includes a custom data processing pipeline located in `app/data/`. These Bash scripts utilize **GDAL** and **Tippecanoe** to transform raw raster data into web-ready vector tiles.

#### 1. Absolute Temperature (`process_data.sh`)

* **Input:** MODIS Land Surface Temperature (GeoTIFF Float32).
* **Quantization:** Converts floating-point temperatures to integers to reduce file size.
* **Vectorization:** Converts raster pixels into polygons.
* **Tiling:** Generates a `planet_heat.pmtiles` archive using Tippecanoe.

#### 2. Heat Island Anomaly (`process_heat_island.sh`)

* **Sanitization:** Removes ocean and cloud data to prevent skewing regional averages.
* **Regional Baseline:** Calculates a "blurred" version of the temperature map to represent the expected regional background temperature.
* **Anomaly Calculation:** Subtracts the regional baseline from the actual temperature (`Actual - Regional = Anomaly`).
* **Urban Masking:** Filters data to only show anomalies within defined urban areas (using `ne_10m_urban_areas`).
* **Output:** Generates `planet_uhi_anomaly.pmtiles` containing only significant urban heat anomalies.

---

### Getting Started

#### Prerequisites

* Node.js (v20+)
* npm, pnpm, or yarn

#### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/heat-atlas.git
cd heat-atlas

```


2. Install dependencies:
```bash
npm install

```


3. Run the development server:
```bash
npm run dev

```


4. Open [https://nikhilp.online/heat-atlas) in your browser.

---

### Project Structure

* `app/components/HeatMap.tsx`: Main map component handling MapLibre initialization, PMTiles protocol registration, and layer rendering.
* `app/components/UIOverlay.tsx`: UI controls for switching modes and adjusting thresholds.
* `app/data/`: Contains shell scripts for data processing and raw asset management.
* `public/`: Static assets.

### Data Processing Requirements

If you intend to regenerate the map tiles from source data, you must have the following tools installed on your system:

* **GDAL** (`gdal_calc.py`, `gdal_translate`, `gdal_rasterize`, `gdal_polygonize.py`)
* **Tippecanoe**
* **Python 3**
