const mapDiv = document.getElementById('map');
if (mapDiv) {
    mapDiv.style.height = '100vh';
}


const map = L.map('map').setView([29.7619, -106.4850], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

console.log('map initialized, fetching base data...');




// example from turf
// Place markers on the map for each point
// L.marker([point.geometry.coordinates[1], point.geometry.coordinates[0]]).addTo(map);
// L.geoJSON(buffered).addTo(map);

// aerostat geojson
fetch('aerostat.geojson')
    .then((r) => r.json())
    .then((geojson) => {
        // default buffer buff distance in MILES
        const bufferMiles = 100;
        const bufferStyle = {
            color: '#7e7e7e',
            weight: 2,
            fillColor: '#b5b5b55a',
            fillOpacity: 0.25,
        };
        // image icon 
        const imgIcon = L.icon({
            iconUrl: 'icons/aerostat.png',
            iconSize: [10, 10],

        });
        geojson.features.forEach((feat) => {
            if (feat.geometry && feat.geometry.type === 'Point') {
                const pt = turf.point(feat.geometry.coordinates);
                const buf = turf.buffer(pt, bufferMiles, { units: 'miles' });


                L.marker([feat.geometry.coordinates[1], feat.geometry.coordinates[0]], { icon: imgIcon }).addTo(map);
                L.geoJSON(buf, { style: () => bufferStyle }).addTo(map);
            }
        });
    });

// ugh this wouldnt work so i had to use AI. will credit in attributions
fetch('/api/cameras')
    .then((r) => r.json())
    .then((cams) => {
        console.log('loaded cameras from server (top-level):', cams);
        if (!cams || !Array.isArray(cams.features)) {
            console.warn('unexpected cameras payload, skipping render');
            return;
        }
        const camBufferMiles = 1; // small buffer for user-submitted cameras
        const camBufferStyle = { color: '#ff3300ff', weight: 1, fillColor: '#ff590040', fillOpacity: 0.25 };
        const camIcon = L.icon({ iconUrl: 'icons/unconfirmed.png', iconSize: [10, 10] });

        cams.features.forEach((feat, i) => {
            if (feat.geometry && feat.geometry.type === 'Point') {
                // defensive checks for coordinate array
                const coords = feat.geometry.coordinates;
                if (!Array.isArray(coords) || coords.length < 2) return;
                const lat = coords[1];
                const lng = coords[0];

                // log each feature for debugging
                console.log(`plotting camera #${i}`, { lat, lng, props: feat.properties });

                // draw a clear circle marker so missing icon files don't hide points
                const m = L.circleMarker([lat, lng], { radius: 2, color: '#ff3700ff', fillColor: '#ff4400ff', fillOpacity: 0.9 }).addTo(map);
                // attach a popup showing properties
                const title = (feat.properties && (feat.properties.filename || feat.properties.source)) ? `${feat.properties.source || ''} ${feat.properties.filename || ''}`.trim() : 'DB camera';
                m.bindPopup(`<strong>${title}</strong><br/>${lat.toFixed(6)}, ${lng.toFixed(6)}`);

                const pt = turf.point(coords);
                const buf = turf.buffer(pt, camBufferMiles, { units: 'miles' });
                L.geoJSON(buf, { style: () => camBufferStyle }).addTo(map);
            }
        });
    })
    .catch((err) => { console.error('failed to load cameras from server (top-level)', err); });

// end of AI-generated camera fetch code



map.on('click', function (e) {
    const { lat, lng } = e.latlng;

    // popup
    const tpl = document.getElementById('popup-template');
    let popupNode = null;
    if (tpl && tpl.content) {
        popupNode = tpl.content.firstElementChild.cloneNode(true);
        popupNode.querySelector('.lat').textContent = lat.toFixed(6);
        popupNode.querySelector('.lng').textContent = lng.toFixed(6);
    }
    const popup = L.popup({ maxWidth: 320 }).setLatLng([lat, lng]).setContent(popupNode ? popupNode.outerHTML : 'Submit new camera').openOn(map);

    // 
    setTimeout(() => {
        const pFinalize = document.getElementById('popup-finalize');
        if (pFinalize) pFinalize.addEventListener('click', (ev) => {
            ev.preventDefault();
            // check for attached file name
            const attachInput = document.getElementById('popup-attach');
            const attachedName = (attachInput && attachInput.files && attachInput.files[0]) ? attachInput.files[0].name : undefined;
            const feat = { type: 'Feature', properties: { source: 'user', filename: attachedName }, geometry: { type: 'Point', coordinates: [lng, lat] } };
            const collection = { type: 'FeatureCollection', features: [feat] };

            // POST to server
            fetch('/api/cameras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/geo+json' },
                body: JSON.stringify(collection),
            }).then((res) => res.json()).then((data) => {
                console.log('inserted', data);
                map.closePopup();
                // fallback: trigger download (commented)
                /*
                const dataStr = JSON.stringify(collection, null, 2);
                const blob = new Blob([dataStr], { type: 'application/geo+json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'camera.geojson'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                */
            });
        });
    }, 30);
});


// anduril tower geojson
fetch('anduril.geojson')
    .then((r) => r.json())
    .then((geojson) => {
        // default buffer buff distance in MILES
        const bufferMiles = 1.86;
        const bufferStyle = {
            color: '#9ca3af',
            weight: 1,
            fillColor: '#9ca3af21',
            fillOpacity: 0.25,
        };
        // image icon
        const imgIcon = L.icon({
            iconUrl: 'icons/anduril.png',
            iconSize: [10, 10],
        });
        geojson.features.forEach((feat) => {
            if (feat.geometry && feat.geometry.type === 'Point') {
                const pt = turf.point(feat.geometry.coordinates);
                const buf = turf.buffer(pt, bufferMiles, { units: 'miles' });




                L.marker([feat.geometry.coordinates[1], feat.geometry.coordinates[0]], { icon: imgIcon }).addTo(map);
                L.geoJSON(buf, { style: () => bufferStyle }).addTo(map);
            }
        });
    });


fetch('IST.geojson')
    .then((r) => r.json())
    .then((geojson) => {
        // default buffer buff distance in MILES
        const bufferMiles = 14;
        const bufferStyle = {
            color: '#9ca3af',
            weight: 1,
            fillColor: '#9ca3af21',
            fillOpacity: 0.15,
        };

        // icon for IST
        const imgIcon = L.icon({
            iconUrl: 'icons/Asset 7.png',
            iconSize: [10, 10],
        });

        // add IST features to the map
        geojson.features.forEach((feat) => {
            if (feat.geometry && feat.geometry.type === 'Point') {
                const pt = turf.point(feat.geometry.coordinates);
                const buf = turf.buffer(pt, bufferMiles, { units: 'miles' });

                L.marker([feat.geometry.coordinates[1], feat.geometry.coordinates[0]], { icon: imgIcon }).addTo(map);
                L.geoJSON(buf, { style: () => bufferStyle }).addTo(map);
            }
        });

    // IST block ends here; cameras fetch is handled globally below
    });

