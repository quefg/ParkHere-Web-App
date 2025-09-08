let map; // declare map globally

function displayFullScreenMap() {
  mapboxgl.accessToken = "pk.eyJ1IjoiYXl5cmllbCIsImEiOiJjbTZxNWFsYWwxbWlzMmpvdHlyenRiYzZ0In0.IWvVnIuTQ_NuNFjn06SOXg";

  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [103.8198, 1.3521], // Default center (Singapore)
    zoom: 11,
  });
}

async function displayCarparkPins() {
  const carparkData = await fetchCarparkData();
  const geojson = {
    type: "FeatureCollection",
    features: carparkData.map((carpark) => ({
      type: "Feature",
      properties: {
        id: carpark.carParkNo,
        availableLots: carpark.lotsAvailable ?? "N/A",
        totalLots: carpark.totalLots ?? "N/A",
        hourlyRate: carpark.hourlyRate ?? "N/A",
      },
      geometry: {
        type: "Point",
        coordinates: [carpark.xCoord, carpark.yCoord],
      },
    })),
  };


  // Add clustered source
  map.addSource("carparks", {
    type: "geojson",
    data: geojson,
    cluster: true,
    clusterMaxZoom: 14, // Clustering applies up to zoom 14
    clusterRadius: 50,
  });

  // Add cluster circles
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "carparks",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#6272A4",
        10,
        "#44475A",
        50,
        "#282A36",
      ],
      "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 50, 25],
    },
  });

  // Add cluster count labels
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "carparks",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,

    },paint: {
      "text-color": "#F8F8F2"
    }
  });

  // Add individual carpark markers (visible only when zoomed in)
  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "carparks",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#F8F8F2",
      "circle-radius": 8,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#fff",
    },
  });

  // Global markers array
  let markers = [];

  // Add individual markers that are currently visible on the map
  function addIndividualMarkers() {
    const bounds = map.getBounds(); // Current view bounds
  
    carparkData.forEach((carpark) => {
      const lng = carpark.xCoord;
      const lat = carpark.yCoord;
  
      // Only add marker if it's within the map bounds
      if (bounds.contains([lng, lat])) {
        const availableLots = carpark.lotsAvailable ?? "N/A";
        const totalLots = carpark.totalLots ?? "N/A";
        const hourlyRate = carpark.hourlyRate ?? "N/A";
  
        const markerElement = createMarkerElement({
          ...carpark,
          availableLots,
          totalLots,
          hourlyRate,
        });
  
        const markerWithHandler = createMarkerWithClickHandler(markerElement, {
          ...carpark,
          availableLots,
          totalLots,
          hourlyRate,
        });
  
        const marker = new mapboxgl.Marker({
          element: markerWithHandler,
          anchor: "bottom",
        })
          .setLngLat([lng, lat])
          .addTo(map);
  
        markers.push(marker);
      }
    });
  }
  
  // Remove all existing individual markers
  function removeIndividualMarkers() {
    markers.forEach((marker) => marker.remove());
    markers = [];
  }

  // Update marker visibility based on zoom level
  function updateMarkersOnZoom() {
    if (map.getZoom() >= 15) {
      // Show individual markers and hide clusters
      removeIndividualMarkers();
      addIndividualMarkers();
      map.setLayoutProperty("clusters", "visibility", "none");
      map.setLayoutProperty("cluster-count", "visibility", "none");
      map.setLayoutProperty("unclustered-point", "visibility", "none");
    } else {
      // Hide individual markers and show clusters
      removeIndividualMarkers();
      map.setLayoutProperty("clusters", "visibility", "visible");
      map.setLayoutProperty("cluster-count", "visibility", "visible");
      map.setLayoutProperty("unclustered-point", "visibility", "visible");
    }
  }

  // Refresh visible markers when map movement ends, only if zoom level is high enough
  function updateMarkersOnMove() {
    if (map.getZoom() >= 15) {
      removeIndividualMarkers();
      addIndividualMarkers();
    }
  }

  // Attach listeners
  map.on("zoom", updateMarkersOnZoom);
  map.on("moveend", updateMarkersOnMove);

  // Handle cluster click (zoom in)
  map.on("click", "clusters", (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["clusters"],
    });
    const clusterId = features[0].properties.cluster_id;
    map
      .getSource("carparks")
      .getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
        });
      });
  });

  // Handle individual carpark click
  map.on("click", "unclustered-point", (e) => {
    const feature = e.features[0];
    displayCarparkDetails({
      carParkNo: feature.properties.id,
      availableLots: feature.properties.availableLots,
      hourlyRate: feature.properties.hourlyRate,
      xCoord: feature.geometry.coordinates[0],
      yCoord: feature.geometry.coordinates[1],
    });
  });

  // Cursor change on hover
  map.on("mouseenter", "clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "clusters", () => {
    map.getCanvas().style.cursor = "";
  });
}


function displayNavigationControls() {
  const directions = new MapboxDirections({
    accessToken: mapboxgl.accessToken,
    unit: 'metric',
    profile: 'mapbox/driving',
    controls: {
      inputs: true,
      instructions: true,
      profileSwitcher: false  // This removes the transportation mode options
    },
    styles: [{
      'id': 'directions-route-line',
      'type': 'line',
      'source': 'directions',
      'layout': {
        'line-cap': 'round',
        'line-join': 'round'
      },
      'paint': {
        'line-color': '#00FF66',
        'line-width': 4
      },
      'filter': [
        'all',
        ['in', '$type', 'LineString'],
        ['in', 'route', 'selected']
      ]
    }]
  });

  return directions;
}

displayFullScreenMap();
displayCarparkPins();
const directions = displayNavigationControls();


// instantiate a search box instance
const displaySearchBar = document.getElementById("search-js");
displaySearchBar.onload = function () {
  const searchBox = new mapboxsearch.MapboxSearchBox();

  // set the mapbox access token, search box API options
  searchBox.accessToken = mapboxgl.accessToken;
  searchBox.options = {
    language: "en",
    countries: "SG",
  };

  // set the mapboxgl library to use for markers and enable the marker functionality
  searchBox.mapboxgl = mapboxgl;

  // bind the search box instance to the map instance
  searchBox.bindMap(map);

  // add the search box instance to the DOM
  document.getElementById("search-bar").appendChild(searchBox);

  // Store result when selected
  searchBox.addEventListener("retrieve", (e) => {
    const result = e.detail.features[0];
    if (result) {
      window.searchDestination = {
        lat: result.geometry.coordinates[1],
        lng: result.geometry.coordinates[0],
        name: result.text,
        address: result.properties?.full_address ?? result.place_name,
      };

      // Add a marker for the search location
      if (window.searchMarker) {
        window.searchMarker.remove();
      }
      window.searchMarker = new mapboxgl.Marker({
        color: "#FF79C6"
      })
        .setLngLat([window.searchDestination.lng, window.searchDestination.lat])
        .addTo(map);

      // Update the panel if it's open
      const panel = document.getElementById("carparkPanel");
      if (panel.style.display === "block") {
        const locationName = document.getElementById("locationName").textContent;
        const currentCarpark = markers.find((marker) => {
          const carparkData = marker._element.carparkData;
          return carparkData && carparkData.carParkNo === locationName;
        });
        if (currentCarpark && currentCarpark._element.carparkData) {
          displayCarparkDetails(currentCarpark._element.carparkData);
        }
      }
    }
  });

  searchBox.addEventListener('suggest', (event) => {
    const suggestions = event.detail.suggestions;
  
    // Check if the message box already exists
    let noResultsBox = document.getElementById("no-results-box");
  
    if (suggestions.length === 0) {
      if (!noResultsBox) {
        // Create the box
        noResultsBox = document.createElement("div");
        noResultsBox.id = "no-results-box";
        noResultsBox.textContent = "No search results found";
  
        // Style the box
        Object.assign(noResultsBox.style, {
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: "8px",
          border: "1px solid #f5c6cb",
          borderRadius: "4px",
          fontSize: "14px",
          zIndex: "999",
        });
  
        // Position it under the search bar
        const searchBarContainer = document.getElementById("search-bar");
        if (searchBarContainer && searchBarContainer.parentNode) {
          searchBarContainer.parentNode.insertBefore(noResultsBox, searchBarContainer.nextSibling);
        }
      }
    } else {
      // If suggestions exist, remove the no results box if it exists
      if (noResultsBox) {
        noResultsBox.remove();
      }
    }
  });
  // Remove "No results" box on input change
searchBox.addEventListener('input', (event) => {
  if (event.target !== event.currentTarget) return;

  const noResultsBox = document.getElementById("no-results-box");
  if (noResultsBox) {
    noResultsBox.remove();
  }
});

// Remove "No results" box on clear
searchBox.addEventListener('clear', () => {
  const noResultsBox = document.getElementById("no-results-box");
  if (noResultsBox) {
    noResultsBox.remove();
  }
});

  
};

// Add Mapbox Geocoder (Search Bar)
const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  placeholder: "Search for a location",
  mapboxgl: mapboxgl,
  language: "en", // Force English language
  countries: "SG", // Limit to Singapore
  types: "address,poi,place", // Search for addresses, points of interest, and places
});

// Store destination coordinates when a location is selected
geocoder.on("result", function (e) {
  window.destination = {
    lat: e.result.center[1],
    lng: e.result.center[0],
    name: e.result.text,
    address: e.result.place_name,
  };
  window.searchDestination = window.destination; // Sync both destination objects
  
  // Add a marker for the search location
  if (window.searchMarker) {
    window.searchMarker.remove();
  }
  window.searchMarker = new mapboxgl.Marker({
    color: "#FF79C6"
  })
    .setLngLat([window.destination.lng, window.destination.lat])
    .addTo(map);
  
  // Update the panel if it's open
  const panel = document.getElementById("carparkPanel");
  if (panel.style.display === "block") {
    const locationName = document.getElementById("locationName").textContent;
    const currentCarpark = markers.find((marker) => {
      const carparkData = marker._element.carparkData;
      return carparkData && carparkData.carParkNo === locationName;
    });
    if (currentCarpark && currentCarpark._element.carparkData) {
      displayCarparkDetails(currentCarpark._element.carparkData);
    }
  }
});

let markers = []; // Store all markers for filtering
const clearButton = document.getElementById("clear-search");

function isWithinPeakHour(carpark, currentTime) {
  if (!carpark.peakHourStart || !carpark.peakHourEnd) return false;

  const [startHour, startMinute] = carpark.peakHourStart.split(':').map(Number);
  const [endHour, endMinute] = carpark.peakHourEnd.split(':').map(Number);

  const startTime = new Date(currentTime);
  startTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date(currentTime);
  endTime.setHours(endHour, endMinute, 0, 0);

  return currentTime >= startTime && currentTime <= endTime;
}


// Fetch carpark locations from Django backend
async function fetchCarparkLocations() {
  try {
    const response = await fetch("/map/api/carparks/");
    return await response.json();
  } catch (error) {
    console.error("Error fetching carpark locations:", error);
  }
}

async function fetchCarparkData() {
  try {
    // Fetch live availability data from LTA
    const response = await fetch("https://api.data.gov.sg/v1/transport/carpark-availability");
    const availabilityData = await response.json();
    const liveAvailability = availabilityData.items[0].carpark_data;

    // Fetch static carpark metadata
    const carparkLocations = await fetchCarparkLocations();
    const currentTime = new Date();

    // Create a map for quick lookup of live data
    const liveDataMap = {};
    for (const item of liveAvailability) {
      liveDataMap[item.carpark_number] = {
        info: item.carpark_info?.[0] || null,
        update_datetime: item.update_datetime,
      };
    }

    const missingLiveData = [];

    const processedCarparks = carparkLocations.map((location) => {
      const carparkID = location.carParkNo;
      const liveEntry = liveDataMap[carparkID];
      const liveData = liveEntry?.info ?? null;

      if (!liveData) {
        missingLiveData.push({ carParkNo: carparkID, address: location.address });
      }

      // Determine peak hour and central area
      const isCentral = location.centralArea ?? false;
      const isPeak = location.peakHour ? isWithinPeakHour(location, currentTime) : false;

      // Calculate hourly rate
      let hourlyRate = 0.6;
      if (isCentral) {
        hourlyRate = isPeak ? 1.4 : 0.6;
      } else {
        hourlyRate = isPeak ? 0.8 : 0.6;
      }

      return {
        carParkNo: carparkID,
        updateDatetime: liveEntry?.update_datetime ?? null,

        // Live info (may be null)
        totalLots: liveData?.total_lots ?? null,
        lotType: liveData?.lot_type ?? null,
        lotsAvailable: liveData?.lots_available ?? null,

        // Static metadata
        address: location.address,
        xCoord: location.xCoord,
        yCoord: location.yCoord,
        carParkType: location.carParkType,
        typeOfParkingSystem: location.typeOfParkingSystem,
        shortTermParking: location.shortTermParking,
        freeParking: location.freeParking,
        nightParking: location.nightParking,
        carParkDecks: location.carParkDecks,
        gantryHeight: location.gantryHeight,
        carParkBasement: location.carParkBasement,
        centralArea: isCentral,
        peakHour: location.peakHour,
        peakHourStart: location.peakHourStart,
        peakHourEnd: location.peakHourEnd,
        hourlyRate
      };
    });

    // Log missing carparks as a single JSON object
    if (missingLiveData.length > 0) {
      console.warn("🚫 Carparks with no live availability data:");
      console.log(JSON.stringify(missingLiveData, null, 2));
    }

    return processedCarparks;
  } catch (error) {
    console.error("❌ Error fetching carpark data:", error);
    return [];
  }
}


// Function to start auto-refresh every 5 minutes
function startCarparkDataPolling() {
  // Fetch every 5 minutes (300000 milliseconds)
  setInterval(fetchCarparkData, 5 * 60 * 1000);
}

// Start polling
startCarparkDataPolling();


// Function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  // Convert string coordinates to numbers
  lat1 = parseFloat(lat1);
  lon1 = parseFloat(lon1);
  lat2 = parseFloat(lat2);
  lon2 = parseFloat(lon2);

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Returns distance in kilometers
}

// Format distance for display
function formatDistance(distanceInKm) {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  }
  return `${distanceInKm.toFixed(1)}km`;
}

const AVAILABILITY_THRESHOLDS = {
  low: 25,
  medium: 50,
};

const COLORS = {
  unknown: "#282A36",
  low: "#FF5555",
  medium: "#F1FA8C",
  high: "#50FA7B",
};

const FONT_COLORS = {
  unknown: "#CCCCCC",
  dark: "#44475A",
  light: "#FFFFFF",
};

function getMarkerColor(availableLots) {
  const lots = parseInt(availableLots);
  if (isNaN(lots)) return COLORS.unknown;
  if (lots <= AVAILABILITY_THRESHOLDS.low) return COLORS.low;
  if (lots <= AVAILABILITY_THRESHOLDS.medium) return COLORS.medium;
  return COLORS.high;
}

function getFontColor(availableLots) {
  const lots = parseInt(availableLots);
  if (isNaN(lots)) return FONT_COLORS.unknown;
  if (lots <= AVAILABILITY_THRESHOLDS.low) return FONT_COLORS.light;
  if (lots <= AVAILABILITY_THRESHOLDS.medium) return FONT_COLORS.dark;
  return FONT_COLORS.dark;
}

// Create the marker
function createMarkerElement(carparkData) {
  let costDetails = "";
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;

  if (startTime && endTime) {
    const start = new Date(`2000/01/01 ${startTime}`);
    const end = new Date(`2000/01/01 ${endTime}`);
    if (end < start) end.setDate(end.getDate() + 1);

    const durationHours = (end - start) / (1000 * 60 * 60);
    const halfHours = Math.ceil(durationHours * 2);
    const rate = parseFloat(carparkData.hourlyRate);

    const totalCost = ((rate * halfHours) / 2).toFixed(2);
    costDetails = `$${totalCost}`;
  }

  const el = document.createElement("div");
  el.className = "speech-bubble-marker";

  const color = getMarkerColor(carparkData.availableLots);
  const fontColor = getFontColor(carparkData.availableLots);
  const rateText = costDetails
    ? costDetails.replace(/\n/g, "<br>")
    : `$${carparkData.hourlyRate}/hour`;

  el.innerHTML = `
    <div class="speech-bubble" style="border-color: ${color}; background: ${color}; height:60px;">
      <div class="speech-bubble-content">
        <div class="lots-info" style="color: ${fontColor};">${carparkData.availableLots} / ${carparkData.totalLots} lots</div>
        <div class="rate-info"style="color: ${fontColor};">${rateText}</div>
      </div>
      <div class="speech-pointer" style="border-top-color: ${color};"></div>
    </div>
  `;

  return el;
}

// Function to format time to 24-hour format
function formatTime24Hour(timeStr) {
  if (!timeStr) return "";
  return timeStr;
}

// Global init once (outside displayCarparkDetails)
const navigateButton = document.getElementById("navigate-btn");
const exitBtn = document.getElementById("exitDirectionsBtn");
const directionsContainer = document.getElementById("directions-container");

// Assign exit logic once
if (exitBtn) {
  exitBtn.onclick = () => {
    directions.removeRoutes(); // clear map directions
    map.removeControl(directions);
    directionsContainer.innerHTML = ""; // remove UI
    exitBtn.style.display = "none"; // hide button
  };
}

// Modify the createMarkerWithClickHandler function
function createMarkerWithClickHandler(markerElement, carparkData) {
  // Store the carpark data on the marker element for later use
  markerElement.carparkData = carparkData;

  markerElement.addEventListener("click", (e) => {
    e.stopPropagation();

    // Calculate distance from search location if it exists
    let distance = "";
    const searchDest = window.searchDestination || window.destination;
    
    if (searchDest) {
      // Use search destination coordinates
      const distanceInKm = calculateDistance(
        carparkData.yCoord,
        carparkData.xCoord,
        searchDest.lat,
        searchDest.lng
      );
      
      // Format distance based on length
      if (distanceInKm < 1) {
        distance = `${Math.round(distanceInKm * 1000)}m`;
      } else {
        distance = `${distanceInKm.toFixed(1)}km`;
      }
    }

    // Pass the complete data including distance to displayCarparkDetails
    const panelData = {
      ...carparkData,
      distance: distance
    };
    
    displayCarparkDetails(panelData);
  });
  return markerElement;
}



function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function handleAutoNavigationFromParams() {
  const lat = getQueryParam("lat");
  const lng = getQueryParam("lng");
  if (lat && lng) {
    const destination = [parseFloat(lng), parseFloat(lat)];

    // Add directions UI if not already present
    if (!map.hasControl(directions)) {
      directionsContainer.innerHTML = "";
      directionsContainer.appendChild(directions.onAdd(map));
    }

    directions.setDestination(destination);

    // Set origin to current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        directions.setOrigin([
          position.coords.longitude,
          position.coords.latitude,
        ]);
      });
    }

    // Show the exit button
    document.getElementById("exitDirectionsBtn").style.display = "inline";

    // Optional: Clear query from URL after processing
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

handleAutoNavigationFromParams();

// Add script reference to user.js
const userScript = document.createElement('script');
userScript.src = '/static/users/user.js';
document.head.appendChild(userScript);