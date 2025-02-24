var studyarea = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-114.17135993239748, 43.613984735541656],
          [-114.17326396457935, 43.5960299495184],
          [-114.1683322378397, 43.591851775343],
          [-114.1702674465019, 43.57673211713234],
          [-114.17654009908591, 43.56937285707979],
          [-114.17485303291653, 43.549882894203186],
          [-114.16561626350989, 43.537121036548676],
          [-114.1587665575662, 43.52961962065106],
          [-114.16496319210148, 43.52037543495571],
          [-114.13832695473928, 43.50509268659041],
          [-114.148015642762, 43.49670501199722],
          [-114.15564316881103, 43.49006020801385],
          [-114.14977264221511, 43.459000463407214],
          [-114.1229514240967, 43.435747521505526],
          [-114.0930816395616, 43.43852733144619],
          [-114.0683616551068, 43.43331450630705],
          [-114.04776204008061, 43.43256161024908],
          [-114.03677612735498, 43.44688673578252],
          [-114.0237309171008, 43.445057172551266],
          [-114.01068488356935, 43.4507038162672],
          [-114.0020556214568, 43.458253276279244],
          [-114.00235057979529, 43.470038574440835],
          [-113.98616185765354, 43.47023695197068],
          [-113.95829929241415, 43.472424367596815],
          [-113.9578341240321, 43.48178771293734],
          [-113.98094600477316, 43.487218053762405],
          [-114.003891248007, 43.491939538000395],
          [-114.01632231516339, 43.495299246616476],
          [-114.01502109136112, 43.498658685355416],
          [-114.00692460787411, 43.5036341827229],
          [-114.00043045958648, 43.508395467403325],
          [-113.98809941241728, 43.50618418076313],
          [-113.96412213784328, 43.509977212973226],
          [-113.92816996527102, 43.52776236263089],
          [-113.9215365038657, 43.55583077626367],
          [-113.91798774001467, 43.58390062184242],
          [-113.92656703080854, 43.59166337334622],
          [-113.9420156770376, 43.598430226201344],
          [-113.96296850783091, 43.60922740625559],
          [-113.97842271254314, 43.62981387431057],
          [-114.02237628677426, 43.62921547498433],
          [-114.05903149723832, 43.61844513598425],
          [-114.08881548556087, 43.620589002431316],
          [-114.126492963636, 43.61402599049424],
          [-114.14219614877624, 43.61690193327008]]]),
    s2_collection = ee.ImageCollection("COPERNICUS/S2");

//////////////////////////////////////////////////////////////////////////
//Retrieve images from different dates and filter by cloud cover
//////////////////////////////////////////////////////////////////////////
var s2_2016 = s2_collection.filterDate('2016-08-01','2016-08-17')
  .filter(ee.Filter.lt('CLOUD_COVERAGE_ASSESSMENT',10))
  .filterBounds(studyarea);
var s2_2017 = s2_collection.filterDate('2017-08-01','2017-08-17')
  .filter(ee.Filter.lt('CLOUD_COVERAGE_ASSESSMENT',10))
  .filterBounds(studyarea);
var s2_2018 = s2_collection.filterDate('2018-08-01','2018-08-17')
  .filter(ee.Filter.lt('CLOUD_COVERAGE_ASSESSMENT',10))
  .filterBounds(studyarea);

//////////////////////////////////////////////////////////////////////////
// Select out just the bands we're interested in
//////////////////////////////////////////////////////////////////////////
var s2_2016_bands = s2_2016.select(['B2','B3','B4','B5','B6','B7','B8','B11','B12']);
var s2_2017_bands = s2_2017.select(['B2','B3','B4','B5','B6','B7','B8','B11','B12']);
var s2_2018_bands = s2_2018.select(['B2','B3','B4','B5','B6','B7','B8','B11','B12']);

//////////////////////////////////////////////////////////////////////////
//Clip each image to study area and mosaic images in the Image Collection
// to a single Image
//////////////////////////////////////////////////////////////////////////
var s2_2018_clip = s2_2018_bands.map(function(image) { return image.clip(studyarea); });
var s2_2018_mosaic = s2_2018_clip.mosaic();
var s2_2017_clip = s2_2017_bands.map(function(image) { return image.clip(studyarea); });
var s2_2017_mosaic = s2_2017_clip.mosaic();
var s2_2016_clip = s2_2016_bands.map(function(image) { return image.clip(studyarea); });
var s2_2016_mosaic = s2_2016_clip.mosaic();

/////////////////////////////////////////////////////////////////////////////
/// Add layers to map ///////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

//SENTINEL-2 data contain 13 UINT16 spectral bands representing TOA reflectance scaled by 10000:
//Band 	Use 	Wavelength 	Resolution
//B1 	Aerosols 	443nm 	60m
//B2 	Blue 	490nm 	10m
//B3 	Green 	560nm 	10m
//B4 	Red 	665nm 	10m
//B5 	Red Edge 1 	705nm 	20m
//B6 	Red Edge 2 	740nm 	20m
//B7 	Red Edge 3 	783nm 	20m
//B8 	NIR 	842nm 	10m
//B8a 	Red Edge 4 	865nm 	20m
//B9 	Water vapor 	940nm 	60m
//B10 	Cirrus 	1375nm 	60m
//B11 	SWIR 1 	1610nm 	20m
//B12 	SWIR 2 	2190nm 	20m

//Map.addLayer(s2_2016_mosaic, {bands: ['B4','B3','B2'], max:3000},"S2 2018");
//Map.addLayer(s2_2017_mosaic, {bands: ['B4','B3','B2'], max:3000},"S2 2018");
Map.addLayer(s2_2018_mosaic, {bands: ['B4','B3','B2'], max:3000},"S2 2018");

Map.centerObject(studyarea);

// Calculate Normalized Burn Ratio
// NBR = nir-swir2 / nir+swir2

var nir_2018 = s2_2018_mosaic.select('B8');
var sir2_2018 = s2_2018_mosaic.select('B12');
var nbr_2018 = nir_2018.subtract(sir2_2018).divide(nir_2018.add(sir2_2018)).rename('NBR');

var nir_2017 = s2_2017_mosaic.select('B8');
var sir2_2017 = s2_2017_mosaic.select('B12');
var nbr_2017 = nir_2017.subtract(sir2_2017).divide(nir_2017.add(sir2_2017)).rename('NBR');

var nir_2016 = s2_2016_mosaic.select('B8');
var sir2_2016 = s2_2016_mosaic.select('B12');
var nbr_2016 = nir_2016.subtract(sir2_2016).divide(nir_2016.add(sir2_2016)).rename('NBR');

//Map.addLayer(nbr_2016, {min: -1, max: 1, palette: ['red', 'white', 'green'], bands: 'NBR'}, 'NBR 2016');
//Map.addLayer(nbr_2017, {min: -1, max: 1, palette: ['red', 'white', 'green'], bands: 'NBR'}, 'NBR 2017');
//Map.addLayer(nbr_2018, {min: -1, max: 1, palette: ['red', 'white', 'green'], bands: 'NBR'}, 'NBR 2018');

// Calculate difference between years
var change_nbr = nbr_2016.subtract(nbr_2018);
Map.addLayer(change_nbr, {palette: ['white', 'red'], bands: 'NBR'}, 'NBR change');

// Uncomment to export raster
/*
// Export change_nbr
Export.image.toDrive({
  image: change_nbr ,
  description: 'change_nbr_clip',
  scale: 10,
  region: studyarea,
  maxPixels: 2E8
});
*/

// Define thresholds
var mainBurn = change_nbr.gt(0.1);
mainBurn = mainBurn.updateMask(mainBurn.gt(0.1));

var zones = change_nbr.gt(0.1).add(change_nbr.gt(0.65)).add(change_nbr.gt(0.8));
zones = zones.updateMask(zones.gt(0.1));

var hotspots = change_nbr.gt(0.65);
hotspots = hotspots.updateMask(hotspots.gt(0.65));


// Convert the thresholded zones to vectors.
var mainBurnVector = mainBurn.addBands(change_nbr).reduceToVectors({
  geometry: studyarea,
  crs: change_nbr.projection(),
  scale: 30, // for higher resolution need to export
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'zone',
  reducer: ee.Reducer.mean()
});

var hotspotsVector = hotspots.addBands(change_nbr).reduceToVectors({
  geometry: studyarea,
  crs: change_nbr.projection(),
  scale: 30, // for higher resolution need to export
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'zone',
  reducer: ee.Reducer.mean()
});


// Display the thresholds.
//Map.addLayer(mainBurn, {palette: 'blue'}, 'Main Burn Raster');
Map.addLayer(zones, {min: 1, max: 3, palette: ['0000FF', '00FF00', 'FF0000']}, 'Zones Raster');

// Create function to compute area and add it as a property.
var errorMargin = 100;
var addArea = function(feature) {
  return feature.set({areaHa: feature.geometry().area(errorMargin).divide(100 * 100)});
};

// Map the area function over the FeatureCollection.
var mainBurnVector = mainBurnVector.map(addArea);
var hotspotsVector = hotspotsVector.map(addArea);

// filter by area
var largeMainBurnVector = mainBurnVector.filter(ee.Filter.gt('areaHa', 10000));
var hotspotsVector = hotspotsVector.filter(ee.Filter.gt('areaHa', 2));

print('Estimated total burn size (Ha): ', largeMainBurnVector.first().get('areaHa'));
print('Estimated total hotspot size (Ha): ', hotspotsVector.reduceColumns({reducer: ee.Reducer.sum(), selectors: ['areaHa']}).get('sum'));


// Make a display image for the vectors, add it to the map.
var largeMainBurnVectorDisplay = ee.Image(0).updateMask(0).paint(largeMainBurnVector, '000000', 1);
var hotspotsVectorDisplay = ee.Image(0).updateMask(0).paint(hotspotsVector, '000000', 3);

Map.addLayer(largeMainBurnVectorDisplay, {palette: 'black'}, 'Main Burn Vector');
Map.addLayer(hotspotsVectorDisplay, {palette: 'red'}, 'Hot Spots Vector');

// Uncomment to export table
/*
// Export the FeatureCollection to a SHP file.
Export.table.toDrive({
  collection: largeMainBurnVector,
  description:'mainBurn',
  fileFormat: 'SHP'
});
*/
