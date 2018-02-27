(function() {

    // Add Leaflet map object
    const map = L.map('map').setView([10, 0], 2);

    // Adding Voyager Basemap
    L.tileLayer('https://cartocdn_{s}.global.ssl.fastly.net/base-midnight/{z}/{x}/{y}.png', {
        maxZoom: 18
    }).addTo(map);

    // Add your API information
    var client = new carto.Client({
        apiKey: 'd7573ec5f513351fc6b35d0bb3ec4604908a5abc',
        username: 'thejoeblankenship'
    });

    // Define the layer data source
    const submarineLandingPointsData = new carto.source.SQL(`
        SELECT * FROM fusion_landing_points_201801231541
    `);

    // Define layer styling
    const submarineLandingPointsStyle = new carto.style.CartoCSS(`
        #layer {
            marker-width: 7;
            marker-fill: #EE4D5A;
            marker-fill-opacity: 0.9;
            marker-allow-overlap: true;
            marker-line-width: 1;
            marker-line-color: #FFFFFF;
            marker-line-opacity: 1;
            marker-comp-op: multiply;
        }
    `);

    // Create a layer object with the above data and styles
    const submarineLandingPoints = new carto.layer.Layer(submarineLandingPointsData, submarineLandingPointsStyle, {
        featureOverColumns: ['name', 'cable_id']
    });

    // Define the layer data source
    const submarineCablesData = new carto.source.SQL(`
        SELECT * FROM fusion_cables_201801231541
    `);

    // Define layer styling
    const submarineCablesStyle = new carto.style.CartoCSS(`
        #layer {
            line-width: 2;
            line-color: #fc9015;
            line-opacity: 1;
            line-comp-op: overlay;
        }
    `);

    // Create a layer object with the above data and styles
    const submarineCables = new carto.layer.Layer(submarineCablesData, submarineCablesStyle, {
        featureOverColumns: ['name', 'owners', 'rfs', 'length']
    });


    // Add the layer objects map interface (order matters!)
    client.addLayers([submarineLandingPoints, submarineCables]);

    // visualize the layer through Leaflet
    client.getLeafletLayer().addTo(map);

    // Add tooltip for cities
    const popup = L.popup({
        closeButton: false
    });

    submarineLandingPoints.on(carto.layer.events.FEATURE_OVER, featureEvent => {
        popup.setLatLng(featureEvent.latLng);
        if (!popup.isOpen()) {
            popup.setContent(`
                <b>
                Landing Point: ${featureEvent.data.name}<br>
                Cable ID: ${featureEvent.data.cable_id}<br>
                </b>
                `);
            popup.openOn(map);
        }
    });

    submarineLandingPoints.on(carto.layer.events.FEATURE_OUT, featureEvent => {
        popup.removeFrom(map);
    });

    submarineCables.on(carto.layer.events.FEATURE_OVER, featureEvent => {
        popup.setLatLng(featureEvent.latLng);
        if (!popup.isOpen()) {
            popup.setContent(`
                <b>
                Name: ${featureEvent.data.name}<br>
                Owner: ${featureEvent.data.owners}<br>
                RFS: ${featureEvent.data.rfs}<br>
                Length: ${featureEvent.data.length}<br>
                </b>
                `);
            popup.openOn(map);
        }
    });

    submarineCables.on(carto.layer.events.FEATURE_OUT, featureEvent => {
        popup.removeFrom(map);
    });

    // Defining a formula dataview for cables and landing points
    const countCables = new carto.dataview.Formula(submarineCablesData, 'cable_id', {
        operation: carto.operation.COUNT
    });

    const countPoints = new carto.dataview.Formula(submarineLandingPointsData, 'city_id', {
        operation: carto.operation.COUNT
    });

    // Refresh changes the dataview
    countCables.on('dataChanged', data => {
        const widgetDom = document.querySelector('#countWidget');
        const countCableDom = widgetDom.querySelector('.js-count-cables');
        countCableDom.innerText = Math.floor(data.result);
    });

    countPoints.on('dataChanged', data => {
        const widgetDom = document.querySelector('#countWidget');
        const countPointDom = widgetDom.querySelector('.js-count-points');
        countPointDom.innerText = Math.floor(data.result);
    });

    // Add the dataview to the client
    client.addDataview(countCables);
    client.addDataview(countPoints);

    // Add dataview for cable owners
    const ownersDataview = new carto.dataview.Category(submarineCablesData, 'owners', {
        limit: 400
    });

    ownersDataview.on('dataChanged', data => {
        const cableOwners = data.categories.map(category => category.name).sort();
        refreshOwnersWidget(cableOwners);
    });


    function refreshOwnersWidget(cableOwners) {
        const widgetDom = document.querySelector('#cableOwners');
        const ownersDom = widgetDom.querySelector('.js-cableOwners');

        ownersDom.onchange = event => {
            const owners = event.target.value;
            filterCablesByOwner(owners)
            filterLandingPointsByOwner(owners);
        };

        // Fill in the list of countries
        cableOwners.forEach(owners => {
            const option = document.createElement('option');
            option.innerHTML = owners;
            option.value = owners;
            ownersDom.appendChild(option);
        });
    }

    function filterCablesByOwner(owners) {
        let query = `
            SELECT *
            FROM fusion_cables_201801231541
            `;
        if (owners) {
            query = `
            SELECT *
            FROM fusion_cables_201801231541
            WHERE owners='${owners}'
            `;
        }
        submarineCablesData.setQuery(query);
    }


    function filterLandingPointsByOwner(owners) {
        let query = `
            SELECT *
            FROM fusion_landing_points_201801231541
            `;
        if (owners) {
            query = `
            SELECT *
            FROM fusion_landing_points_201801231541
            WHERE owners='${owners}'
            `;
        }
        submarineLandingPointsData.setQuery(query);
    }

    client.addDataview(ownersDataview);

})();
