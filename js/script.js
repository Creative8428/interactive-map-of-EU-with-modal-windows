"use strict";
let currentModal = null;

function openModal(root, flag, name, description, link, linkDesc) {
  if (currentModal) {
    currentModal.close();
  }

  const modal = am5.Modal.new(root, {});

  const closeBtnModal = document.createElement("input");
  closeBtnModal.type = "button";
  closeBtnModal.value = "X";
  closeBtnModal.style.position = "absolute";
  closeBtnModal.style.top = "10px";
  closeBtnModal.style.right = "10px";
  closeBtnModal.addEventListener("click", function () {
    modal.close();
  });

  const modalContent = modal.getPrivate("content");
  modalContent.style.position = "relative";
  modalContent.appendChild(closeBtnModal);

  currentModal = modal;

  // Update the modal content each time a country is clicked
  modal.getPrivate("content").innerHTML = `
      <img src="${flag}" alt="${name} ${"flag"}"/>
      <h3>${name}</h3>
      <p>${description}</p>
      <a href="${link}">${linkDesc}</a>`;
  modal.getPrivate("content").appendChild(closeBtnModal);

  modal.open();
}

am5.ready(async function () {
  const myInit = {
    method: "GET",
    headers: {
      "Content-type": "application/json",
    },
    mode: "same-origin",
    cache: "default",
  };

  const myRequest = new Request("js/data.json", myInit);

  async function getData() {
    try {
      const response = await fetch(myRequest);
      if (!response.ok) {
        throw new Error(`An error occurred with status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  // Data
  const groupData = await getData();

  // Create root and chart
  const root = am5.Root.new("chartdiv");

  // Set themes
  root.setThemes([am5themes_Responsive.new(root)]);
  root.setThemes([am5themes_Animated.new(root)]);

  let homeZoomLevel;
  let homeGeoPoint;
  homeZoomLevel = window.innerWidth <= 768 ? 6 : 3.8;
  homeGeoPoint =
    window.innerWidth <= 768 ? { longitude: 16, latitude: 55 } : { longitude: 20, latitude: 56 };

  // Create chart
  const chart = root.container.children.push(
    am5map.MapChart.new(root, {
      homeZoomLevel: homeZoomLevel,
      homeGeoPoint: homeGeoPoint,
      projection: am5map.geoMercator(),
      // projection: am5map.geoNaturalEarth1(),
    })
  );

  // Add zoom control and default view (home)
  // https://www.amcharts.com/docs/v5/charts/map-chart/map-pan-zoom/#Zoom_control
  const zoomControl = chart.set("zoomControl", am5map.ZoomControl.new(root, {}));
  [zoomControl.minusButton, zoomControl.plusButton].forEach((button) => {
    setupButtonStates(button, 0x001a4d, 0x000);
  });

  const homeButton = zoomControl.children.moveValue(
    am5.Button.new(root, {
      paddingTop: 10,
      paddingBottom: 10,
      icon: am5.Graphics.new(root, {
        svgPath: "M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8",
        fill: am5.color(0xffffff),
      }),
      background: am5.RoundedRectangle.new(root, {
        fill: am5.color(0x003399),
        fillOpacity: 0.7,
      }),
    }),
    0
  );

  // Function to set up states for a button
  function setupButtonStates(button, hoverColor, downColor) {
    button
      .get("background")
      .states.create("hover", {})
      .setAll({
        fill: am5.color(hoverColor),
        fillOpacity: 0.8,
      });

    button
      .get("background")
      .states.create("down", {})
      .setAll({
        fill: am5.color(downColor),
        fillOpacity: 0.8,
      });
  }

  // Use the function to set up states for home button
  setupButtonStates(homeButton, 0x001a4d, 0x000);

  homeButton.events.on("click", function () {
    chart.goHome();
  });

  // Create world polygon series
  const worldSeries = chart.series.push(
    am5map.MapPolygonSeries.new(root, {
      geoJSON: am5geodata_worldHigh,
      exclude: ["AQ"],
    })
  );

  worldSeries.mapPolygons.template.setAll({
    fill: am5.color(0xc0c0c0),
  });

  worldSeries.events.on("datavalidated", function () {
    chart.goHome();
  });

  // Create series for each group
  const colors = am5.ColorSet.new(root, {
    step: 2,
  });
  colors.next();

  am5.array.each(groupData, function (group) {
    const countries = [];
    console.log(countries);
    const color = am5.color(0xffcc00);

    am5.array.each(group.data, function (country) {
      countries.push(country.id);
    });

    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldHigh,
        include: countries,
        name: group.name,
        fill: color,
      })
    );

    polygonSeries.mapPolygons.template.setAll({
      tooltipText: "[bold]{name}",
      interactive: true,
      strokeWidth: 2,
      cursorOverStyle: "pointer",
    });

    polygonSeries.mapPolygons.template.states.create("hover", {
      fill: am5.color(0x003399),
    });

    // Create a lookup object from the groupData
    let lookup = {};
    groupData.forEach((group) => {
      group.data.forEach((country) => {
        lookup[country.id] = {
          flag: country.flag,
          description: country.description,
          linkDesc: country.linkDesc,
          link: country.link,
        };
      });
    });

    console.log(lookup);

    function handleClickEvent(ev) {
      const country = ev.target.dataItem.dataContext;
      const flag = lookup[country.id].flag;
      const description = lookup[country.id].description;
      const link = lookup[country.id].link;
      const linkDesc = lookup[country.id].linkDesc;
      openModal(root, flag, country.name, description, link, linkDesc);
    }

    polygonSeries.mapPolygons.template.events.on("click", handleClickEvent);

    // Set the data for the pointSeries

    const pointSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField: "latitude",
        longitudeField: "longitude",
      })
    );

    // Flatten the groupData to get an array of data points
    let dataPoints = groupData.flatMap((group) => group.data);

    // Set the data for the pointSeries
    pointSeries.data.setAll(dataPoints);

    // Configure the bullets for the series
    pointSeries.bullets.push(function () {
      const container = am5.Container.new(root, {
        cursorOverStyle: "pointer",
      });

      container.events.on("click", handleClickEvent);

      // create circles for the capitals
      function createCircle(container, circleProperties) {
        return container.children.push(am5.Circle.new(root, circleProperties));
      }

      const commonPropertiesCircles = {
        radius: 5,
        fill: am5.color(0x003399),
        strokeOpacity: 0,
      };

      const circle = createCircle(container, {
        ...commonPropertiesCircles,
      });

      const circle2 = createCircle(container, {
        ...commonPropertiesCircles,
        tooltipText: "{name}",
      });

      // Circles animation
      function animateCircle(circle, animationProperties) {
        circle.animate(animationProperties);
      }

      const commonProperties = {
        duration: 2000,
        easing: am5.ease.out(am5.ease.cubic),
        loops: Infinity,
      };

      animateCircle(circle, {
        ...commonProperties,
        key: "scale",
        from: 1,
        to: 2,
      });

      animateCircle(circle, {
        ...commonProperties,
        key: "opacity",
        from: 1,
        to: 0,
      });

      return am5.Bullet.new(root, {
        sprite: container,
      });
    });
  });

  // Input field
  const searchInput = document.getElementById("searchForCountries");
  const searchResults = document.getElementById("search-results");

  function displayCountries(countries) {
    // Clear the search results
    searchResults.innerHTML = "";

    // Sort the countries by name
    countries.sort((a, b) => a.name.localeCompare(b.name));

    // Display the countries
    countries.forEach((country) => {
      let li = document.createElement("li");

      // Create an img element for the flag
      let img = document.createElement("img");
      img.src = country.flag;
      img.alt = country.name + " flag";
      img.style.width = "50px";
      img.style.height = "50px";
      img.style.marginRight = "5px";

      // Create a text node for the country name
      let text = document.createTextNode(country.name);

      // Append the flag and the name to the list item
      li.appendChild(img);
      li.appendChild(text);

      // Add a click event listener to the list item
      li.addEventListener("click", function () {
        if (currentModal) {
          currentModal.close();
        }

        // Open the modal window and display the country information
        openModal(
          root,
          country.flag,
          country.name,
          country.description,
          country.link,
          country.linkDesc
        );
      });

      searchResults.appendChild(li);
    });
  }

  // Get all countries
  let allCountries = groupData.flatMap((group) => group.data);

  // Display all countries
  displayCountries(allCountries);

  function handleSearch() {
    // Get the search value
    let searchValue = searchInput.value.toLowerCase();

    // Filter the countries
    let filteredCountries = allCountries.filter((country) =>
      country.name.toLowerCase().includes(searchValue)
    );

    // Display the filtered countries
    displayCountries(filteredCountries);
  }

  searchInput.addEventListener("keyup", handleSearch);

  const clearSearch = document.getElementById("clear-search");

  // Show the clear button when the user starts typing
  searchInput.addEventListener("input", function () {
    clearSearch.style.display = searchInput.value !== "" ? "inline" : "none";
  });

  // Clear the search field and hide the clear button
  clearSearch.addEventListener("click", function () {
    searchInput.value = "";
    searchResults.innerHTML = "";
    clearSearch.style.display = "none";
    displayCountries(allCountries);
  });
});
