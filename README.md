# Sentinel-2 Burn Area Analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Google Earth Engine script for detecting and analyzing burn areas using multi-temporal Sentinel-2 imagery and the Normalized Burn Ratio (NBR).

## Overview

This tool uses Sentinel-2 satellite imagery to detect and quantify areas affected by wildfire. By calculating the Normalized Burn Ratio (NBR) and comparing it across different years, the script identifies burn scars, classifies burn severity, and exports vector polygons of the affected areas.

![Burn Area Analysis Example](https://via.placeholder.com/800x400?text=Burn+Area+Analysis+Example)

## Features

- Automated processing of Sentinel-2 imagery for specified time periods
- Calculation of Normalized Burn Ratio (NBR) for burn severity assessment
- Multi-temporal change detection to identify burn scars
- Classification of burn severity into different zones
- Vector polygon generation of burn areas for further GIS analysis
- Area calculations for burn extents and hotspots

## How It Works

The script implements the following workflow:

1. **Data Acquisition**: Filters Sentinel-2 imagery by date range, cloud cover, and geographic bounds
2. **Band Selection**: Extracts relevant spectral bands for NBR calculation (NIR and SWIR2)
3. **NBR Calculation**: Computes the normalized burn ratio using the formula: NBR = (NIR - SWIR2) / (NIR + SWIR2)
4. **Change Detection**: Calculates the difference in NBR between pre-fire and post-fire images
5. **Burn Severity Classification**: Applies thresholds to identify burn severity zones (low, moderate, high)
6. **Vectorization**: Converts raster burn classes to vector polygons
7. **Area Calculation**: Computes the area of burn scars in hectares

## Requirements

- Google Earth Engine account
- Basic understanding of remote sensing and burn indices
- Access to the Google Earth Engine Code Editor

## Usage

1. Open the script in the [Google Earth Engine Code Editor](https://code.earthengine.google.com/)
2. Adjust the study area geometry to your area of interest
3. Modify the date ranges to capture pre-fire and post-fire conditions
4. Run the script to visualize the results
5. Uncomment the export sections to save results as raster images or vector shapefiles

```javascript
// Example: Modifying the date ranges
var s2_prefire = s2_collection.filterDate('YYYY-MM-DD', 'YYYY-MM-DD')
  .filter(ee.Filter.lt('CLOUD_COVERAGE_ASSESSMENT',10))
  .filterBounds(studyarea);
  
var s2_postfire = s2_collection.filterDate('YYYY-MM-DD', 'YYYY-MM-DD')
  .filter(ee.Filter.lt('CLOUD_COVERAGE_ASSESSMENT',10))
  .filterBounds(studyarea);
```

## Customization

### Adjusting Burn Severity Thresholds

Modify these thresholds to better match your specific fire conditions:

```javascript
// Define thresholds
var mainBurn = change_nbr.gt(0.1);  // Adjust for different sensitivity
var zones = change_nbr.gt(0.1).add(change_nbr.gt(0.65)).add(change_nbr.gt(0.8));
var hotspots = change_nbr.gt(0.65);  // Adjust for different hotspot detection
```

### Filtering by Area Size

Change the minimum area thresholds to exclude small polygons:

```javascript
// filter by area
var largeMainBurnVector = mainBurnVector.filter(ee.Filter.gt('areaHa', 10000));  // 10,000 Ha minimum
var hotspotsVector = hotspotsVector.filter(ee.Filter.gt('areaHa', 2));  // 2 Ha minimum
```

## Exporting Results

Uncomment these sections to export your results:

```javascript
// Export the NBR change raster
Export.image.toDrive({
  image: change_nbr,
  description: 'change_nbr_clip',
  scale: 10,
  region: studyarea,
  maxPixels: 2E8
});

// Export the burn area vectors as shapefile
Export.table.toDrive({
  collection: largeMainBurnVector,
  description: 'mainBurn',
  fileFormat: 'SHP'
});
```

## Theory and Background

### Normalized Burn Ratio (NBR)

The Normalized Burn Ratio (NBR) uses near-infrared (NIR) and short-wave infrared (SWIR) wavelengths to highlight burned areas:

```
NBR = (NIR - SWIR2) / (NIR + SWIR2)
```

Healthy vegetation shows high reflectance in NIR and low reflectance in SWIR, resulting in positive NBR values. Burned areas show the opposite pattern, resulting in negative or lower NBR values. By calculating the difference between pre-fire and post-fire NBR (dNBR), burn scars can be effectively detected and classified by severity.

### Burn Severity Classification

The difference in NBR (dNBR) values can be interpreted as follows:

| dNBR Range | Burn Severity |
|------------|---------------|
| < 0.1      | Unburned      |
| 0.1 - 0.27 | Low Severity  |
| 0.27 - 0.66| Moderate Severity |
| > 0.66     | High Severity |

## Applications

This script can be used for:
- Rapid post-fire assessment
- Burn severity mapping
- Forest management planning
- Ecological impact studies
- Fire history documentation
- Climate change research

## Limitations

- Cloud cover can affect image quality and results
- Seasonal variations may influence NBR values
- Validation with ground data is recommended for operational use
- Processing large areas may require optimization of the script

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- European Space Agency for Sentinel-2 data
- Google Earth Engine team for the platform
- The remote sensing community for developing burn indices methodology
