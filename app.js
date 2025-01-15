// Initialize map variables
let map;
let markers = [];
let infoWindow;
let filteredSpas = [];
let cityCount; // Declare at top level

// Helper function to clean city names
function cleanCityName(city) {
    if (!city) return '';
    
    // If it's a location field (e.g., "Bend, OR")
    if (city.includes(', OR')) {
        return city.split(', OR')[0].trim();
    }
    
    // If it's already a clean city name
    if (!city.includes(',')) {
        return city.trim();
    }
    
    // Extract city from address
    const parts = city.split(',').map(part => part.trim());
    
    // For addresses, take the part before "OR"
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.includes('OR')) {
            const cityPart = part.split('OR')[0].trim();
            if (cityPart) return cityPart;
        }
    }
    
    // If no part contains "OR", use the second part if available
    if (parts.length >= 2) {
        return parts[1].trim();
    }
    
    return '';
}

// Define initMap before loading the Google Maps API
function initMap() {
    console.log('initMap called, data check:', typeof medSpas, Array.isArray(medSpas) ? medSpas.length : 'not an array');
    
    try {
        // Center on Oregon
        const oregonCenter = { lat: 44.0, lng: -120.5 };
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 6.5,
            center: oregonCenter,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });

        // Create info window for markers
        infoWindow = new google.maps.InfoWindow({
            maxWidth: 300
        });

        // Create bounds to fit all markers
        const bounds = new google.maps.LatLngBounds();
        let markersCount = 0;

        // Add markers for each spa
        medSpas.forEach((spa, index) => {
            // Get coordinates from address using Geocoding service
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: spa.address }, (results, status) => {
                if (status === 'OK' && results[0].geometry) {
                    const position = results[0].geometry.location;
                    
                    // Create marker
                    const marker = new google.maps.Marker({
                        position: position,
                        map: map,
                        title: spa.name,
                        animation: google.maps.Animation.DROP
                    });

                    // Store marker with reference to spa index and cleaned city name
                    const city = cleanCityName(spa.location || spa.address);
                    markers[index] = marker; // Store just the marker

                    // Extend bounds to include this marker
                    bounds.extend(position);
                    markersCount++;

                    // Create info window content
                    const content = `
                        <div class="map-info-window">
                            <h3>${spa.name}</h3>
                            <p><i class="fas fa-star"></i> ${Number(spa.rating).toFixed(1)} (${spa.reviews} reviews)</p>
                            <p><i class="fas fa-location-dot"></i> ${spa.address}</p>
                            <a href="spas/${spa.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html" class="button">Learn More</a>
                        </div>
                    `;

                    // Add click listener to marker
                    marker.addListener('click', () => {
                        infoWindow.setContent(content);
                        infoWindow.open(map, marker);
                    });

                    // After all markers are added, fit map to bounds and adjust zoom
                    if (markersCount === medSpas.length) {
                        map.fitBounds(bounds);
                        // Adjust zoom if too far out
                        const listener = google.maps.event.addListener(map, 'idle', function() {
                            if (map.getZoom() > 8) map.setZoom(8);
                            google.maps.event.removeListener(listener);
                        });
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error initializing map:', error);
        document.getElementById('map').innerHTML = 
            '<div style="padding: 20px; text-align: center;">Unable to load map. Please try again later.</div>';
    }
}

// Make initMap globally available
window.initMap = initMap;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    
    // Check if data is loaded
    if (typeof medSpas === 'undefined' || !Array.isArray(medSpas) || medSpas.length === 0) {
        console.error('Med spas data not loaded. Please check data.js file.');
        document.querySelector('.med-spa-grid').innerHTML = 
            '<div style="text-align: center; padding: 2rem; color: #ef4444;">Error: Unable to load med spas data. Please try refreshing the page.</div>';
        return;
    }

    // Log data for debugging
    console.log('Med spas data loaded successfully');
    console.log('Number of spas:', medSpas.length);
    console.log('Sample spa data:', {
        name: medSpas[0].name,
        location: medSpas[0].location,
        address: medSpas[0].address
    });

    // Initialize cityCount first
    cityCount = new Map();
    medSpas.forEach(spa => {
        // Prioritize using the location field as it's already in a clean format
        const city = cleanCityName(spa.location || spa.address);
        if (city) {
            cityCount.set(city, (cityCount.get(city) || 0) + 1);
            console.log(`Added city: ${city}, count: ${cityCount.get(city)}`);
        }
    });

    // Get all cities sorted alphabetically
    const allCities = Array.from(cityCount.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));
    
    console.log('Cities found:', allCities);
    
    // Store template and remove it from display
    const template = document.querySelector('.med-spa-card.template');
    template.style.display = 'none';
    
    const grid = document.querySelector('.med-spa-grid');
    
    // Sort med spas by rating (highest first)
    medSpas.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

    // Store the original med spas array and add cleaned city names
    medSpas.forEach(spa => {
        spa.cleanedCity = cleanCityName(spa.location || spa.address);
    });
    filteredSpas = [...medSpas];
    
    // Track selected cities
    const selectedCities = new Set();
    
    // Populate city tags
    const cityTags = document.getElementById('city-tags');
    if (!cityTags) {
        console.error('City tags container not found!');
        return;
    }

    // Clear existing tags first
    cityTags.innerHTML = '';
    
    // Add city tags
    allCities.forEach(([city, count]) => {
        if (city && count > 0) {
            const tag = document.createElement('button');
            tag.className = 'city-tag';
            tag.textContent = `${city} (${count})`;
            tag.dataset.city = city; // Store the exact city name as it appears in the Map
            tag.onclick = () => toggleCity(tag);
            tag.style.display = 'inline-block';
            tag.style.margin = '0.25rem';
            cityTags.appendChild(tag);
            console.log('Created city tag:', city); // Debug log
        }
    });
    
    function toggleCity(tag) {
        const city = tag.dataset.city; // Use the exact city name from the Map
        console.log('Toggling city:', city); // Debug log
        
        if (selectedCities.has(city)) {
            selectedCities.delete(city);
            tag.classList.remove('selected');
            console.log('Removed city:', city);
        } else {
            selectedCities.add(city);
            tag.classList.add('selected');
            console.log('Added city:', city);
        }
        
        console.log('Selected cities:', Array.from(selectedCities));
        updateDisplay();
    }
    
    // Collect and count services
    const serviceCount = new Map();
    medSpas.forEach(spa => {
        // Count services
        const services = spa.services || spa.subtypes || '';
        services.split(',').forEach(service => {
            const trimmedService = service.trim();
            if (trimmedService) {
                serviceCount.set(trimmedService, (serviceCount.get(trimmedService) || 0) + 1);
            }
        });
    });

    // Get top 20 most common services
    const topServices = Array.from(serviceCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    
    // Populate service tags
    const serviceTags = document.getElementById('service-tags');
    topServices.forEach(([service, count]) => {
        const tag = document.createElement('button');
        tag.className = 'service-tag';
        tag.textContent = `${service} (${count})`;
        tag.dataset.service = service;
        tag.onclick = () => toggleService(tag);
        serviceTags.appendChild(tag);
    });
    
    // Track selected services
    const selectedServices = new Set();
    
    function toggleService(tag) {
        const service = tag.dataset.service;
        if (selectedServices.has(service)) {
            selectedServices.delete(service);
            tag.classList.remove('selected');
        } else {
            selectedServices.add(service);
            tag.classList.add('selected');
        }
        updateDisplay();
    }
    
    // Clear all filters
    document.getElementById('clear-filters').onclick = () => {
        document.getElementById('search').value = '';
        document.getElementById('sort').selectedIndex = 0;
        selectedServices.clear();
        selectedCities.clear();
        document.querySelectorAll('.service-tag, .city-tag').forEach(tag => {
            tag.classList.remove('selected');
        });
        updateDisplay();
    };

    // Function to update display based on filters
    function updateDisplay() {
        console.log('Starting updateDisplay');
        console.log('Selected cities:', Array.from(selectedCities));

        // Filter spas based on selected cities
        filteredSpas = medSpas.filter(spa => {
            if (selectedCities.size === 0) {
                return true; // Show all spas when no cities are selected
            }
            const spaCity = cleanCityName(spa.location || spa.address);
            const matches = selectedCities.has(spaCity);
            console.log(`Filtering spa: ${spa.name}, City: ${spaCity}, Selected:`, matches);
            return matches;
        });

        console.log('Filtered spas count:', filteredSpas.length);

        // Sort filtered spas by rating (highest first)
        filteredSpas.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

        // Update spa cards
        const container = document.querySelector('.med-spa-grid');
        const template = document.querySelector('.med-spa-card.template');
        
        // Clear existing cards except template
        Array.from(container.children).forEach(child => {
            if (!child.classList.contains('template')) {
                container.removeChild(child);
            }
        });

        // Add filtered spa cards
        filteredSpas.forEach(spa => {
            const card = template.cloneNode(true);
            card.classList.remove('template');
            card.style.display = '';
            
            // Update card content
            card.querySelector('.spa-name').textContent = spa.name;
            card.querySelector('.spa-name').href = spa.website || '#';
            card.querySelector('.rating span').textContent = spa.rating;
            card.querySelector('.review-count span').textContent = spa.reviews;
            card.querySelector('.location span').textContent = spa.location || spa.address;
            card.querySelector('.services span').textContent = spa.services || '';
            
            container.appendChild(card);
        });

        // Update map markers
        if (map && markers.length) {
            const bounds = new google.maps.LatLngBounds();
            let visibleMarkersCount = 0;

            // Hide all markers first
            markers.forEach(marker => {
                if (marker) marker.setMap(null);
            });

            // Show only markers for filtered spas
            filteredSpas.forEach(spa => {
                const index = medSpas.indexOf(spa);
                const marker = markers[index];
                
                if (marker) {
                    marker.setMap(map);
                    bounds.extend(marker.getPosition());
                    visibleMarkersCount++;
                }
            });

            // Fit bounds if there are visible markers
            if (visibleMarkersCount > 0) {
                map.fitBounds(bounds);
                // Adjust zoom if too far out
                const listener = google.maps.event.addListener(map, 'idle', function() {
                    if (map.getZoom() > 8) map.setZoom(8);
                    google.maps.event.removeListener(listener);
                });
            }
        }

        // Debug logging
        console.log('Filtered spas:', filteredSpas.length);
        console.log('Selected cities:', Array.from(selectedCities));
        console.log('Sample spa cities:', filteredSpas.slice(0, 3).map(spa => spa.cleanedCity));
    }
    
    // Add event listeners
    document.getElementById('search').addEventListener('input', updateDisplay);
    document.getElementById('sort').addEventListener('change', updateDisplay);
    
    // Initial display
    updateDisplay();

    // For debugging: log all unique cities at startup
    const uniqueCitiesDebug = new Set();
    medSpas.forEach(spa => {
        const city = cleanCityName(spa.location || spa.address);
        if (city) uniqueCitiesDebug.add(city);
    });
    console.log('All unique cities:', Array.from(uniqueCitiesDebug).sort());
}); 