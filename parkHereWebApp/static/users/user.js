// Function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function saveCarpark() {
  // Check authentication first
  fetch("/user/check-auth/")
    .then((response) => response.json())
    .then((data) => {
      if (!data.is_authenticated) {
        window.location.href = "/user/login/";
        return;
      }

      const locationName = document.getElementById("locationName").textContent;
      const address = document.getElementById("address").textContent;
      const lots = document.getElementById("lots").textContent;
      const rate = document.getElementById("rate").textContent;
      const saveButton = document.querySelector(".save-carpark-btn");

      // Get existing saved carparks from localStorage or initialize empty array
      const savedCarparks = JSON.parse(localStorage.getItem("savedCarparks") || "[]");

      // Check if carpark is already saved
      const isAlreadySaved = savedCarparks.some(
        (carpark) => carpark.locationName === locationName
      );

      if (isAlreadySaved) {
        // Remove carpark from saved list
        const updatedCarparks = savedCarparks.filter(
          (carpark) => carpark.locationName !== locationName
        );
        localStorage.setItem("savedCarparks", JSON.stringify(updatedCarparks));

        // Update button appearance back to save state
        saveButton.textContent = "Save Carpark";
        saveButton.classList.remove("saved");
        saveButton.style.backgroundColor = "#44475A"; // Dracula theme grey
        saveButton.style.opacity = "0.7";
        saveButton.style.color = "#F8F8F2"; // Light text for dark background
      } else {
        // Add new carpark to saved list
        savedCarparks.push({
          locationName,
          address,
          lots,
          rate,
          savedAt: new Date().toISOString(),
        });

        // Save back to localStorage
        localStorage.setItem("savedCarparks", JSON.stringify(savedCarparks));

        // Update button appearance to saved state
        saveButton.textContent = "Saved";
        saveButton.classList.add("saved");
        saveButton.style.backgroundColor = "#50FA7B"; // Dracula theme green
        saveButton.style.opacity = "1";
        saveButton.style.color = "#282A36"; // Dark text for green background
      }
      saveButton.disabled = false;
    });
}

// Function to load saved locations
async function loadSavedLocations() {
    try {
      const response = await fetch("/user/saved-locations/");
      const data = await response.json();
      const container = document.getElementById("savedLocationsContainer");
      container.innerHTML = ""; // Clear existing buttons
  
      data.locations.forEach((location) => {
        const button = document.createElement("button");
        button.className = "saved-location-button";
        button.textContent = location.name;
        button.onclick = () => {
          // Remove all existing markers
          if (window.searchMarker) {
            window.searchMarker.remove();
          }
          markers.forEach((marker) => marker.remove());
          markers = []; // Clear the markers array
  
          // Remove any markers added by the search box
          const searchMarkers = document.querySelectorAll('.mapboxgl-marker');
          searchMarkers.forEach(marker => marker.remove());
  
          // Set the search destination
          window.searchDestination = {
            lat: location.latitude,
            lng: location.longitude,
            name: location.name,
            address: location.address,
          };
  
          // Add a marker for the saved location
          window.searchMarker = new mapboxgl.Marker({
            color: "#4668f2"
          })
            .setLngLat([location.longitude, location.latitude])
            .addTo(map);
  
          // Center map on the saved location
          map.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 16,
          });
  
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
        };
        container.appendChild(button);
        button.style.display = "block";
      });
    } catch (error) {
      console.error("Error loading saved locations:", error);
    }
}
  
// Check user authentication status
async function checkAuthStatus() {
    try {
      const response = await fetch("/user/check-auth/");
      const data = await response.json();
      const profileItem = document.getElementById("profileItem");
      const settingsItem = document.getElementById("settingsItem");
      const savedLocationsItem = document.getElementById("savedLocationsItem");
      const adminCarparkItem = document.getElementById("adminCarparkItem");
      const authItem = document.getElementById("authItem");
      const newButton = document.querySelector(".new-button");
  
      if (data.is_authenticated) {
        profileItem.style.display = "block";
        settingsItem.style.display = "block";
        savedLocationsItem.style.display = "block";
        newButton.style.display = "block";
        loadSavedLocations(); // Load saved locations when user is authenticated
        authItem.querySelector("a").textContent = "Logout";
        authItem.querySelector("a").href = "#";
        authItem.querySelector("a").onclick = async (e) => {
          e.preventDefault();
          await fetch("/user/logout/");
          window.location.reload();
        };
  
        // Show admin carpark item if user is admin
        if (data.is_admin) {
          adminCarparkItem.style.display = "block";
        } else {
          adminCarparkItem.style.display = "none";
        }
      } else {
        profileItem.style.display = "none";
        settingsItem.style.display = "none";
        savedLocationsItem.style.display = "none";
        adminCarparkItem.style.display = "none";
        newButton.style.display = "none";
        document.getElementById("savedLocationsContainer").innerHTML = ""; // Clear saved locations
        authItem.querySelector("a").textContent = "Login/Register";
        authItem.querySelector("a").href = "/user/login/";
        authItem.querySelector("a").onclick = null;
      }
    } catch (error) {
      console.log("Error:", error);
    }
}  

function openDialog() {
    document.getElementById("newLocationDialog").style.display = "flex";
  
    const dialogSearchContainer = document.getElementById("dialogSearch");
    dialogSearchContainer.innerHTML = ""; // Clear any existing search box
  
    const searchBox = new MapboxSearchBox();
    searchBox.accessToken = mapboxgl.accessToken;
    searchBox.options = {
      language: "en",
      country: ["SG"],
      types: ["address", "poi", "place"],
    };
  
    // Append the new search input box
    dialogSearchContainer.appendChild(searchBox);
  
    // Store result when selected
    searchBox.addEventListener("retrieve", (e) => {
      const result = e.detail.features[0];
      if (result) {
        window.dialogDestination = {
          lat: result.geometry.coordinates[1],
          lng: result.geometry.coordinates[0],
          name: result.text,
          address: result.properties?.full_address ?? result.place_name,
        };
      }
    });
}
  
  function closeDialog() {
    document.getElementById("newLocationDialog").style.display = "none";
    document.getElementById("dialogSearch").innerHTML = ""; // Clears SearchBox
    window.dialogDestination = null;
}
  
  // Function to save location
  async function saveLocation() {
    const name = document.getElementById("locationName").value;
    if (!name) {
      alert("Please enter a location name");
      return;
    }
  
    if (!window.dialogDestination) {
      alert("Please select a location first");
      return;
    }
  
    try {
      const response = await fetch("/user/save-location/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
          name: name,
          latitude: window.dialogDestination.lat,
          longitude: window.dialogDestination.lng,
          address: window.dialogDestination.address,
        }),
      });
  
      const data = await response.json();
      if (data.status === "success") {
        alert("Location saved successfully!");
        closeDialog();
        loadSavedLocations(); // Refresh the saved locations list
      } else {
        alert("Error saving location: " + data.message);
      }
    } catch (error) {
      console.error("Error saving location:", error);
      alert("Error saving location. Please try again.");
    }
}  

// Add sidebar toggle function
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const menuButton = document.querySelector(".menu-button");
  
    if (!sidebar.classList.contains("open")) {
      sidebar.classList.add("open");
      menuButton.classList.add("hidden");
    } else {
      sidebar.classList.remove("open");
      menuButton.classList.remove("hidden");
    }
}

function displayCarparkDetails(carparkData) {
    const panel = document.getElementById("carparkPanel");
  
    // Store coordinates in data attributes
    panel.dataset.xCoord = carparkData.xCoord;
    panel.dataset.yCoord = carparkData.yCoord;
  
    // Update location name
    document.getElementById("locationName").textContent = carparkData.carParkNo;
  
    // Calculate total cost if times are selected
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
      costDetails = `Duration: ${durationHours.toFixed(1)} hours\nRate: $${rate.toFixed(2)}/hour\nTotal Cost: $${totalCost}`;
    }
  
    // Update info section
    const headerEl = document.getElementById("carParkNo");
    const addressEl = document.getElementById("address");
    const lotsEl = document.getElementById("lots");
    const rateEl = document.getElementById("rate");
    const distanceEl = document.getElementById("distance");
    const typeParkingEl = document.getElementById("typeParking");
    const freeParkingEl = document.getElementById("freeParking");
    const saveButton = document.getElementById("saveBtn");
  

    headerEl.textContent = carparkData.carParkNo;
    addressEl.textContent = carparkData.address;
    lotsEl.textContent = `${carparkData.availableLots}`;
    rateEl.innerHTML = costDetails ? costDetails.replace(/\n/g, "<br>") : `$${carparkData.hourlyRate}0/hour`;
    typeParkingEl.textContent = carparkData.carParkType;
    freeParkingEl.textContent = carparkData.freeParking;
  
    // Update distance display
    const searchDest = window.searchDestination || window.destination;
    if (carparkData.distance && searchDest) {
      distanceEl.textContent = carparkData.distance;
    } else {
      distanceEl.textContent = searchDest ? 
        "Click carpark again to see distance" : 
        "Search for a location to see distance";
    }
  
    // Check authentication status and update save button
    fetch("/user/check-auth/")
      .then((response) => response.json())
      .then((data) => {
        if (data.is_authenticated) {
          // Show save button for authenticated users
          saveButton.style.display = "block";
  
          // Check if carpark is already saved
          const savedCarparks = JSON.parse(localStorage.getItem("savedCarparks") || "[]");
          const isAlreadySaved = savedCarparks.some(
            (carpark) => carpark.locationName === carparkData.carParkNo
          );
  
          // Update save button state
          if (isAlreadySaved) {
            saveButton.textContent = "Saved";
            saveButton.classList.add("saved");
            saveButton.style.backgroundColor = "#50FA7B"; // Dracula theme green
            saveButton.style.opacity = "1";
            saveButton.style.color = "#282A36"; // Dark text for green background
          } else {
            saveButton.textContent = "Save Carpark";
            saveButton.classList.remove("saved");
            saveButton.style.backgroundColor = "#44475A"; // Dracula theme grey
            saveButton.style.opacity = "0.7";
            saveButton.style.color = "#F8F8F2"; // Light text for dark background
          }
          saveButton.disabled = false;
        } else {
          // Hide save button for non-authenticated users
          saveButton.style.display = "none";
        }
      });
  
    // Show the panel
    panel.style.display = "block";
  
    // Handle navigation button
    const navigateButton = document.getElementById("navigate-btn");
    navigateButton.onclick = null;
    if (navigateButton) {
      navigateButton.onclick = () => {
        closePanel(); // close current panel
        document.getElementById("exitDirectionsBtn").style.display = "inline"; // show exit button
  
        const destination = [carparkData.xCoord, carparkData.yCoord];
  
        // Clear previous directions UI
        const directionsContainer = document.getElementById("directions-container");
        directionsContainer.innerHTML = "";
        directionsContainer.style.display = "inline";
  
        // Add directions control to container
        directionsContainer.appendChild(directions.onAdd(map));
  
        // Set destination
        directions.setDestination(destination);
  
        // Optional: Auto-set origin to user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            directions.setOrigin([
              position.coords.longitude,
              position.coords.latitude,
            ]);
          });
        }
      };
    }
  }
  
  function closePanel() {
    document.getElementById("carparkPanel").style.display = "none";
  }
  
  // Add event listeners for time inputs to update panel if it's open
  document
    .getElementById("startTime")
    .addEventListener("input", updatePanelIfOpen);
  document.getElementById("endTime").addEventListener("input", updatePanelIfOpen);
  
  function updatePanelIfOpen() {
    const panel = document.getElementById("carparkPanel");
    updateMarkersOnMove();
    if (panel.style.display === "block") {
      // Get the currently displayed carpark data
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
  
// Check auth status when page loads
checkAuthStatus();

// Add click handler to the new button
document.querySelector(".new-button").addEventListener("click", openDialog);

// Close dialog when clicking outside
document
  .getElementById("newLocationDialog")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      closeDialog();
    }
  });

// Close sidebar when clicking outside
document.addEventListener("click", function (event) {
    const sidebar = document.getElementById("sidebar");
    const menuButton = document.querySelector(".menu-button");
  
    if (
      !sidebar.contains(event.target) &&
      !menuButton.contains(event.target) &&
      sidebar.classList.contains("open")
    ) {
      sidebar.classList.remove("open");
      menuButton.classList.remove("hidden");
    }
});
  
// Export the functions to make them available globally
window.getCookie = getCookie;
window.saveCarpark = saveCarpark;
window.checkAuthStatus = checkAuthStatus;
window.loadSavedLocations = loadSavedLocations;
window.openDialog = openDialog;
window.closeDialog = closeDialog;
window.saveLocation = saveLocation;
window.toggleSidebar = toggleSidebar;
