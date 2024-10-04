const socket = io();

const bikeIcon = L.icon({
    iconUrl: '/assets/bike.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});


const map = L.map("map").setView([0, 0], 14); 

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

let bikeMarker = null;
let currentPosition = { latitude: 0, longitude: 0 };
let destination = null;
let destinationMarker = null;

function generateRandomDestination(lat, lon) {
    const radius = 0.018; // This should be around 2 km

    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;

    const newLat = lat + (distance * Math.sin(angle));
    const newLon = lon + (distance * Math.cos(angle)) / Math.cos((lat * Math.PI) / 180);

    return { latitude: newLat, longitude: newLon };
}

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            currentPosition = { latitude, longitude };
            socket.emit("send-location", { latitude, longitude });

            if (!bikeMarker) {
                bikeMarker = L.marker([latitude, longitude], { icon: bikeIcon }).addTo(map);
            } else {
                bikeMarker.setLatLng([latitude, longitude]);
            }

            if (!destination) {
                destination = generateRandomDestination(latitude, longitude);
                destinationMarker = L.marker([destination.latitude, destination.longitude]).addTo(map)
                    
                    .openPopup();
            }

            // Adjust map to fit both markers
            if (bikeMarker && destinationMarker) {
                const bounds = L.latLngBounds([bikeMarker.getLatLng(), destinationMarker.getLatLng()]);
                map.fitBounds(bounds);
            }

            checkWinCondition();
        },
        (error) => {
            console.error(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        }
    );
}

socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    if (bikeMarker) {
        bikeMarker.setLatLng([latitude, longitude]);
        
        // Adjust map to fit both markers
        if (destinationMarker) {
            const bounds = L.latLngBounds([bikeMarker.getLatLng(), destinationMarker.getLatLng()]);
            map.fitBounds(bounds);
        }
    }
});

document.addEventListener("keydown", (event) => {
    const speed = 0.0005; // Speed of the bike movement

    switch (event.key) {
        case "ArrowUp":
            currentPosition.latitude += speed;
            break;
        case "ArrowDown":
            currentPosition.latitude -= speed;
            break;
        case "ArrowLeft":
            currentPosition.longitude -= speed;
            break;
        case "ArrowRight":
            currentPosition.longitude += speed;
            break;
        default:
            return; 
    }

    // Update bike's position
    if (bikeMarker) {
        bikeMarker.setLatLng([currentPosition.latitude, currentPosition.longitude]);
        socket.emit("send-location", { latitude: currentPosition.latitude, longitude: currentPosition.longitude });

        // Adjust map to fit both markers
        if (destinationMarker) {
            const bounds = L.latLngBounds([bikeMarker.getLatLng(), destinationMarker.getLatLng()]);
            map.fitBounds(bounds);
        }

        checkWinCondition();
    }
});

function checkWinCondition() {
    const distance = calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        destination.latitude,
        destination.longitude
    );

    if (distance < 0.05) {
        alert("You have reached the destination!");

        destination = generateRandomDestination(currentPosition.latitude, currentPosition.longitude);
        destinationMarker.setLatLng([destination.latitude, destination.longitude]);
    }
}

// Haversine 
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}
