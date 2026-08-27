// This whole map-setup block (through the end of the DOMContentLoaded handler
// below it) only applies on pages with a #map element (currently index.html).
// Guarded so app-part1.js can also load safely on pages like evenimente.html
// that need its other shared globals/functions but have no map on them.
if (document.getElementById('map')) {

mapboxgl.accessToken = 'pk.eyJ1IjoiYWxleGFuZHJ1Y20iLCJhIjoiY2x5OG12MGZ4MGtrejJrc2JoeDJwam9nMSJ9.qacp8v2WqXV_48dG9O1gng';

var transformRequest = (url, resourceType) => {
    var isMapboxRequest =
      url.slice(8, 22) === "api.mapbox.com" ||
      url.slice(10, 26) === "tiles.mapbox.com";
    return {
      url: isMapboxRequest
        ? url.replace("?", "?pluginName=sheetMapper&")
        : url
    };
};

// Bucharest coordinates
const bucharestCoordinates = [26.1025, 44.4268]; // [lng, lat]

// Initialize the map with minimum and maximum zoom levels
var map = new mapboxgl.Map({
    container: 'map', // container ID
    center: bucharestCoordinates, // starting position [lng, lat]
    zoom: 12, // starting zoom
    minZoom: 11,
    maxZoom: 16,
    maxBounds: [
      [20.261, 43.618], // SW coordinates
      [29.699, 48.265]  // NE coordinates
    ], // Sets the geographical bounds as the whole world
    style: 'mapbox://styles/alexandrucm/cls9a4yni009a01qz96zm6mh5',
    transformRequest: transformRequest,
    doubleClickZoom: false,
});

// Add geolocate control to the map.

var geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: {
      enableHighAccuracy: true
  },
  // When active the map will receive updates to the device's location as it changes.
  trackUserLocation: true,
  fitBoundsOptions: {maxZoom:map.getZoom()},
  showUserHeading: window.matchMedia("(max-width: 550px)").matches ? true : false,
})
map.addControl(geolocateControl);

if (!window.matchMedia("(max-width: 550px)").matches) {
  // Disable camera change
  geolocateControl._updateCamera = function(position) { };
}

document.addEventListener('DOMContentLoaded', function () {
  // --- Baserow config: fill these in with your own values ---
  // Table ID: open your Baserow table, look at the URL - .../database/123/table/456 - 456 is the table ID.
  // Token: Baserow workspace settings > API tokens > create a token scoped to this
  // database with READ-ONLY permission (this token is publicly visible in the page source).
  const BASEROW_TABLE_ID = '1095357';
  const BASEROW_TOKEN = '4vDdxD3bsSuJycladWU5gQMesLQ0ko3S';
  const BASEROW_API_URL = `https://api.baserow.io/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&size=200`;

  const maxRetries = 5;
  const retryDelay = 500;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchAllBaserowRows(url) {
    let rows = [];
    let nextUrl = url;

    while (nextUrl) {
      let response = null;
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          response = await fetch(nextUrl, {
            headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }
          });
          if (!response.ok) throw new Error(`Baserow request failed: ${response.status}`);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) await sleep(retryDelay);
        }
      }

      if (lastError) throw lastError;

      const page = await response.json();
      rows = rows.concat(page.results);
      nextUrl = page.next;
    }

    return rows;
  }

  function rowsToGeoJSON(rows) {
    return {
      type: 'FeatureCollection',
      features: rows
        .filter(row => row.Latitude && row.Longitude)
        .map(row => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(row.Longitude), parseFloat(row.Latitude)]
          },
          properties: {
            Name: row.Name || '',
            Categories_ro: row.Categories_ro || '',
            Categories_en: row.Categories_en || '',
            Orgs_ro: row.Orgs_ro || '',
            Orgs_en: row.Orgs_en || '',
            Classification_ro: row.Classification_ro || '',
            Classification_en: row.Classification_en || '',
            Period_ro: row.Period_ro || '',
            Period_en: row.Period_en || '',
            Style_ro: row.Style_ro || '',
            Style_en: row.Style_en || '',
            Descriere_ro: row.Descriere_ro || '',
            Descriere_en: row.Descriere_en || '',
            Address: row.Address || '',
            FB: row.FB || '',
            Site: row.Site || '',
            Insta: row.Insta || '',
            Gmaps: row.Gmaps || ''
          }
        }))
    };
  }

  function processBaserowData(rows) {
    const data = rowsToGeoJSON(rows);

    let loadedImg = {}
    // Load icons into Mapbox, considering normal and clicked states
    Object.keys(iconPaths).forEach(category => {
      const baseName = iconPaths[category];  // Directly use the simplified name from iconPaths
      if (baseName in loadedImg) {
        return;
      }
      ['normal', 'clicked'].forEach(state => {
          const iconName = `${baseName}_${state}`;  // Construct the icon name using baseName and state
          const path = `pins/${iconName}.png`;  // Construct the file path via GitHub/jsDelivr
          map.loadImage(path, function(error, image) {
              if (error) throw error;
              map.addImage(iconName, image);
          });
      });
      loadedImg[baseName] = true;
    });

    initializeMapWithFeatures(data);
  }

  fetchAllBaserowRows(BASEROW_API_URL)
    .then(processBaserowData)
    .catch(error => console.error('Failed to load locations from Baserow:', error));

  setupArticleHeaderScroll();
});

} // end of the #map-only guard opened above

var uniqueCategories = new Set();
var geojsonData;
var picsDirToNum = {};
var categoryToData = {
  ro : {},
  en : {}
};
var nameToCoordinates = {};
var nameToFeature = {};
var linkNameToTitle = {};
var titleToLinkName = {};
var isPanelHidden = false;
var numTotalCategories = 0;
const customLinks = {
  "Casa Memorială Tudor Arghezi — Mărțișor": "casa-memoriala-tudor-arghezi"
};

// Locations (Baserow "Name", plus a couple of legacy EN alt-names still used
// as lookup keys in a few places) that also have a dedicated standalone
// article (articol-*.html) — single source of truth for both "does this
// location have an article" (EPONYMOUS_ARTICLE_LOCATIONS, RO Baserow names
// only) and "which articol-*.html file is it" (used by loadArticle() in
// app-part3.js and by openArticle()'s standalone-page redirect below).
const ARTICLE_NAME_TO_SLUG = {
  "Suprainfinit Gallery" : "suprainfinit",
  "Centrul de Resurse în Fotografie" : "cdrf",
  "Atelierele Scânteia" : "atsc",
  "Paper Traffic" : "pprt",
  "Teatrul Masca" : "masca",
  "Masca Theater" : "masca",
  "Casa Memorială Tudor Arghezi — Mărțișor" : "arghezi",
  "The “Tudor Arghezi” Memorial House" : "arghezi",
  "Scânteia Workshops" : "atsc",
  "Photography Resource Centre (CdRF)" : "cdrf",
  "Photography Resource Centre" : "cdrf",
  "Centrul de Resurse în Fotografie (CdRF)" : "cdrf",
  "Cinema Europa" : "cinema-europa",
  "Muzeul Hărților și Cărții Vechi" : "muzeul-hartilor",
  "NON artspace" : "non-art-space",
};

const EPONYMOUS_ARTICLE_LOCATIONS = [
  "Suprainfinit Gallery",
  "Centrul de Resurse în Fotografie",
  "Atelierele Scânteia",
  "Paper Traffic",
  "Teatrul Masca",
  "Casa Memorială Tudor Arghezi — Mărțișor",
  "Cinema Europa",
  "Muzeul Hărților și Cărții Vechi",
  "NON artspace"
];

function hasEponymousArticle(locationName) {
  return EPONYMOUS_ARTICLE_LOCATIONS.includes(locationName);
}

function openPin(clickedFeature) {
  refreshIconState(clickedFeature);
  createAndDisplayCard(clickedFeature);
}

function decodeStringIfNecessary(inputString) {
  try {
    return decodeURIComponent(inputString);
  } catch (e) {
    return inputString;
  }
}

function initializeMapWithFeatures(data) {
  function onMapReady() {
      uniqueCategories = setupCategoryLayersAndFilters(data);
      numTotalCategories = uniqueCategories.size;
      populateObjectiveList(uniqueCategories);
      populateGalleryContainer();


      const iconBtn1El = document.getElementById('iconBtn1');
      if (iconBtn1El) iconBtn1El.addEventListener('click', showObiective);
      const iconBtn2El = document.getElementById('iconBtn2');
      if (iconBtn2El) iconBtn2El.addEventListener('click', showFiltre);
      const iconBtn3El = document.getElementById('iconBtn3');
      if (iconBtn3El) iconBtn3El.addEventListener('click', toggleSidePanel);
      const selectAllCheckboxEl = document.getElementById('selectAllCheckbox');
      if (selectAllCheckboxEl) selectAllCheckboxEl.style.display = '';

      const hash = window.location.hash.substring(1);
      if (hash) {
        const isMobile = window.matchMedia("(max-width: 550px)").matches; // Check if on mobile

        if (hash.startsWith('event-')) {
          const eventSlug = hash.substring('event-'.length);
          handleEventHash(eventSlug);
          if (isMobile) {
            updateToolbarActiveState('mobile-toolbar-events');
          }
        } else if (hash === 'events') {
          const eventsLink = document.getElementById('events-link');
          if (eventsLink) {
              const eventsContainer = document.getElementById('events-container');
              if (eventsContainer.style.display === 'none' || eventsContainer.style.display === '') {
                  toggleEvents({ preventDefault: () => {} });
              }
          }
          if (isMobile) {
            updateToolbarActiveState('mobile-toolbar-events');
          }
        }
        else if (decodeStringIfNecessary(hash) in linkNameToTitle) {
          clickedFeature = nameToFeature[linkNameToTitle[decodeStringIfNecessary(hash)]];
          openPin(clickedFeature);
          const cardReadMore = document.getElementById('card-read-more');
          if (hasEponymousArticle(clickedFeature.properties.Name)) {
            openArticle(null, clickedFeature.properties.Name);
            if (isMobile) {
              openMobileArticlesPage();
              updateToolbarActiveState('mobile-toolbar-articles');
            }
          } else {
            cardReadMore.onclick();
          }
        } else if (hash === "about-us") {
          if (isMobile) {
            openAboutUsMobile(false);
          } else {
            openAboutUs();
          }
        } else if (hash === "archive") {
          toggleArchive({ preventDefault: () => {} });
        }
      }

      // Cross-page link from evenimente.html: ?pin=<location name> opens
      // that location's map card directly (see the openPin override there).
      const pinParam = new URLSearchParams(window.location.search).get('pin');
      if (pinParam && nameToFeature[pinParam]) {
        openPin(nameToFeature[pinParam]);
      }

      geolocateControl.on('error', function(e) {
        console.log('Geolocation failed');
      });
      geolocateControl.trigger();
  }

  if (map.loaded()) {
    onMapReady();
  } else {
    map.on('load', onMapReady);
  }
}

async function handleEventHash(eventSlug) {
  // Ensure the Events panel is open
  const eventsContainer = document.getElementById('events-container');
  if (eventsContainer.style.display === 'none') {
      const eventsLink = document.getElementById('events-link');
      if (eventsLink) {
          toggleEvents({ preventDefault: () => {} }); // Pass a dummy event object
      }
  }

  // Wait for masterEventList to be populated
  if (!initialEventsFetchPromise) { // This promise is from fetchAndPrepareInitialEventData
      console.warn("Initial event fetch promise not available for hash handling.");
      // Attempt to initiate it if not already, though ideally toggleEvents would handle this.
      initialEventsFetchPromise = fetchAndPrepareInitialEventData();
  }

  try {
      await initialEventsFetchPromise; // Wait for events to be loaded

      if (masterEventList && masterEventList.length > 0) {
          const eventToOpen = masterEventList.find(event => slugify(event.title) === eventSlug);
          if (eventToOpen) {
              openEventDetailPanel(eventToOpen.title);
          } else {
              console.warn(`Event with slug "${eventSlug}" not found.`);
              // Fallback: Just ensure the events list is open
              applyAllEventsFiltersAndPopulate(); // Ensure list is shown
          }
      } else {
          console.warn("Master event list is empty or not loaded for hash handling.");
      }
  } catch (error) {
      console.error("Error handling event hash:", error);
  }
}

const iconPaths = {
  'Teatre': 'teatre',
  'Cinematografe': 'cinematografe',
  'Muzică': 'muzica',
  'Inițiative pentru comunitate': 'initiative_pentru_comunitate',
  'Instituții culturale': 'institutii_culturale',
  'Industrie creativă': 'industrie_creativa',
  'Muzee și case memoriale': 'muzee_si_case_memoriale',
  'Biblioteci': 'biblioteci',
  'Spații dedicate artiștilor': 'spatii_dedicate_artistilor',
  'Galerii': 'galerii',
  'Spații dedicate copiilor': 'copii',
  'Educație culturală': 'edcult',

  'Theatres': 'teatre',
  'Cinema': 'cinematografe',
  'Music' : 'muzica',
  'Community initiatives' : 'initiative_pentru_comunitate',
  'Cultural institutions': 'institutii_culturale',
  'Creative industry' : 'industrie_creativa',
  'Museums and memorial houses': 'muzee_si_case_memoriale',
  'Libraries': 'biblioteci',
  'Artist spaces': 'spatii_dedicate_artistilor',
  'Galleries': 'galerii',
  'Culture for children' : 'copii',
  'Cultural education': 'edcult'
};

const categoryTranslation = {
  ro : {
    'Teatre' : 'Theatres',
    'Cinematografe' : 'Cinema',
    'Muzică' : 'Music',
    'Inițiative pentru comunitate' : 'Community initiatives',
    'Instituții culturale': 'Cultural institutions',
    'Industrie creativă': 'Creative industry',
    'Muzee și case memoriale' : 'Museums and memorial houses',
    'Biblioteci' : 'Libraries',
    'Spații dedicate artiștilor' : 'Artist spaces',
    'Galerii' : 'Galleries',
    'Spații dedicate copiilor': 'Culture for children',
    'Educație culturală': 'Cultural education'
  },
  en : {
    'Theatres' : 'Teatre',
    'Cinema' : 'Cinematografe',
    'Music' : 'Muzică',
    'Community initiatives' : 'Inițiative pentru comunitate',
    'Cultural institutions' : 'Instituții culturale',
    'Creative industry' : 'Industrie creativă',
    'Museums and memorial houses' : 'Muzee și case memoriale',
    'Libraries' : 'Biblioteci',
    'Artist spaces' : 'Spații dedicate artiștilor',
    'Galleries' : 'Galerii',
    'Culture for children' : 'Spații dedicate copiilor',
    'Cultural education': 'Educație culturală'
  }
}

const labelTranslation = {
  ro : {
    "Fundație" : "Foundation",
    "Inițiativă privată" : "Private institution",
    "Instituție publică" : "Public institution",
    "ONG" : "NGO",
    "Monument istoric" : "Listed historical monument",
    "Neclasat" : "Unlisted"
  },
  en : {
    "Foundation" : "Fundație",
    "Private institution" : "Inițiativă privată",
    "Public institution" : "Instituție publică",
    "NGO" : "ONG",
    "Listed historical monument" : "Monument istoric",
    "Unlisted" : "Neclasat"
  }
}

const articleTitleTranslation = {
  ro : {
    "Suprainfinit Gallery" : "Suprainfinit Gallery",
    "Centrul de Resurse în Fotografie" : "Photography Resource Centre",
    "Atelierele Scânteia" : "Scânteia Workshops",
    "Paper Traffic" : "Paper Traffic",
    "Teatrul Masca" : "Masca Theater",
    "Casa Memorială Tudor Arghezi — Mărțișor" : "The “Tudor Arghezi” Memorial House",
    "Centrul de Resurse în Fotografie (CdRF)" : "Photography Resource Centre (CdRF)",
  },
  en : {
    "Photography Resource Centre" : "Centrul de Resurse în Fotografie",
    "Suprainfinit Gallery" : "Suprainfinit Gallery",
    "Scânteia Workshops" : "Atelierele Scânteia",
    "Paper Traffic" : "Paper Traffic",
    "The “Tudor Arghezi” Memorial House" : "Casa Memorială Tudor Arghezi — Mărțișor",
    "Masca Theater" : "Teatrul Masca",
    "Photography Resource Centre (CdRF)" : "Centrul de Resurse în Fotografie (CdRF)",
  }
}

const categoryColors = {
  'Teatre': '#5D363C',
  'Cinematografe': '#714e9a',
  'Muzică': '#E85BB0',
  'Inițiative pentru comunitate': '#b8c650',
  'Instituții culturale' : '#8E285B',
  'Industrie creativă' : '#3d5ccb',
  'Muzee și case memoriale' : '#2D3E82',
  'Biblioteci' : '#e06d17',
  'Spații dedicate artiștilor' : '#406E6B',
  'Galerii' : '#8487EB',
  'Spații dedicate copiilor' : '#409de2',
  'Educație culturală': '#cc4205',

  'Theatres': '#5D363C',
  'Cinema': '#714e9a',
  'Music' : '#E85BB0',
  'Community initiatives' : '#b8c650',
  'Cultural institutions': '#8E285B',
  'Creative industry' : '#3d5ccb',
  'Museums and memorial houses': '#2D3E82',
  'Libraries': '#e06d17',
  'Artist spaces': '#406E6B',
  'Galleries': '#8487EB',
  'Culture for children' : '#409de2',
  'Cultural education': '#cc4205'
};

// Display labels shown to users. Kept separate from the canonical category
// tokens above (which must stay unchanged since they're the literal values
// used to split/match Baserow's Categories_ro/Categories_en fields, index
// categoryColors/iconPaths/categoryTranslation, and populate selectedCategories).
const categoryDisplayNames = {
  'Muzică': 'Muzică, dans și performance',
  'Music': 'Music, dance and performance'
};

function getCategoryDisplayName(category) {
  return categoryDisplayNames[category] || category;
}

const clasareToId = {
  "Monument istoric": "historicalMonument",
  "Listed historical monument" : "historicalMonument",
  "Unlisted" : "unclassified",
  "Neclasat" : "unclassified"
};

const periodTranslation = {
  ro: {
    "1401-1500": "1401-1500",
    "1701-1800": "1701-1800",
    "1801-1866": "1801-1866",
    "1867-1918": "1867-1918",
    "1919-1947": "1919-1947",
    "1948-1989": "1948-1989",
    "1990-prezent": "1990-present",
    "1401 - 1500": "1401 - 1500",
    "1701 - 1800": "1701 - 1800",
    "1801 - 1866": "1801 - 1866",
    "1867 - 1918": "1867 - 1918",
    "1919 - 1947": "1919 - 1947",
    "1948 - 1989": "1948 - 1989",
    "1990 - prezent": "1990 - present"
  },
  en: {
    "1401-1500": "1401-1500",
    "1701-1800": "1701-1800",
    "1801-1866": "1801-1866",
    "1867-1918": "1867-1918",
    "1919-1947": "1919-1947",
    "1948-1989": "1948-1989",
    "1990-present": "1990-prezent",
    "1401 - 1500": "1401 - 1500",
    "1701 - 1800": "1701 - 1800",
    "1801 - 1866": "1801 - 1866",
    "1867 - 1918": "1867 - 1918",
    "1919 - 1947": "1919 - 1947",
    "1948 - 1989": "1948 - 1989",
    "1990 - present": "1990 - prezent"
  }
};

const styleTranslation = {
  ro: {
    "Neogotic": "Gothic Revival",
    "Neoclasic": "Neoclassic",
    "Art Nouveau/ Secession": "Art Nouveau/ Secession",
    "Eclectic": "Eclectic",
    "Neoromânesc": "Romanian Revival",
    "Arhitectură industrială": "Industrial architecture",
    "Modernism": "Modernism",
    "Art-Deco": "Art Deco",
    "Pitoresc mediteraneean": "Picturesque Mediterranean",
    "Realism Socialist": "Socialist Realism",
    "Modernism socialist": "Socialist Modernism",
    "Brutalism": "Brutalist",
    "Contemporan": "Contemporary",
    "Postmodern": "Postmodern",
    "Altele": "Other"
  },
  en: {
    "Gothic Revival": "Neogotic",
    "Neoclassic": "Neoclasic",
    "Art Nouveau/ Secession": "Art Nouveau/ Secession",
    "Eclectic": "Eclectic",
    "Romanian Revival": "Neoromânesc",
    "Industrial architecture": "Arhitectură industrială",
    "Modernism": "Modernism",
    "Art Deco": "Art-Deco",
    "Picturesque Mediterranean": "Pitoresc mediteraneean",
    "Socialist Realism": "Realism Socialist",
    "Socialist Modernism": "Modernism socialist",
    "Brutalist": "Brutalism",
    "Contemporary": "Contemporan",
    "Postmodern": "Postmodern",
    "Other": "Altele"
  }
};

function getCategoryColor(category) {
  return categoryColors[category] || '#000000'; // Default color
}

function fixLinkIfNeeded(link) {
  let trimLink = link.trim()
  return trimLink.startsWith("https") || trimLink.startsWith("http") ? trimLink : trimLink === "" ? "#" : "https://" + trimLink;
}

function preventDefaultAction(event) {
  event.preventDefault();
}

// Fills in the pin card's teaser text + "read more" action. Baserow's own
// description always wins when present; the hardcoded article teaser
// (getArticleDescr) is only a fallback for eponymous-article locations whose
// Baserow "Descriere" is empty, and the generic placeholder is the last
// resort so we never render literal "undefined" for a location/language
// combo that has neither (e.g. an article-only location with no EN teaser).
function fillCardTextAndReadMore(cardTitle, contentArr) {
  const cardText = document.querySelector('.card-text');
  const readMoreBtn = document.querySelector('.card-read-more');
  const fallbackMsg = currentLang === 'ro' ? "Mai multe detalii în curând." : "More details soon.";

  if (hasEponymousArticle(cardTitle.textContent)) {
    readMoreBtn.onclick = function() { openArticle(null, cardTitle.textContent); };
    cardText.textContent = contentArr[0] || getArticleDescr(cardTitle.textContent) || fallbackMsg;
  } else if (contentArr.length === 0) {
    readMoreBtn.onclick = function() { };
    cardText.textContent = fallbackMsg;
  } else {
    readMoreBtn.onclick = function() { openReadMore(readMoreBtn); };
    cardText.textContent = contentArr[0];
  }
}

function createAndDisplayCard(clickedFeature, adjustMap = true) {
    const card = document.querySelector('.card');
    card.classList.add('hidden-element');

    let cardWidth, cardHeight, heightAdjustment;
    if (window.matchMedia("(max-width: 550px)").matches) {
      cardWidth = 310;
      cardHeight = 226;
      heightAdjustment = 11;
    } else {
      cardWidth = 332;
      cardHeight = 336;
      heightAdjustment = 9;
    }
    card.style.width = `${cardWidth}px`;
    card.style.height = `${cardHeight}px`;

    const cardCategory = document.querySelector('.card-category');
    const categoriesKey = `Categories_${currentLang}`;
    const category = clickedFeature.properties[categoriesKey].split(/[,;]+/).map(s => s.trim())[0];
    cardCategory.style.color = `${getCategoryColor(category)}`;
    // TODO just one category
    cardCategory.textContent = getCategoryDisplayName(category);

    const descriereKey = `Descriere_${currentLang}`;
    let contentArr = clickedFeature.properties[descriereKey].split('\n').filter(l => l.length > 0 && l.trim() !== '');

    const cardTitle = document.querySelector('.card-title');
    cardTitle.textContent = clickedFeature.properties.Name;

    const addressTextContent = document.getElementById('address-text-content');
    addressTextContent.textContent = clickedFeature.properties.Address;

    const addressIcon = document.getElementById('card-address-icon');
    addressIcon.src = `pins/${iconPaths[category]}_normal.png`;

    const links = [
        { id: 'fb-link', property: 'FB' },
        { id: 'site-link', property: 'Site' },
        { id: 'insta-link', property: 'Insta' },
        { id: 'maps-link', property: 'Gmaps' }
    ];

    // Loop through each link and set the attributes
    links.forEach(link => {
        const element = document.getElementById(link.id);
        if (element) {
            element.removeEventListener('click', preventDefaultAction, true);
            const fixedLink = fixLinkIfNeeded(clickedFeature.properties[link.property]);
            element.href = fixedLink;
            if (fixedLink !== "#") {
              element.setAttribute('target', '_blank');
              element.setAttribute('rel', 'noopener noreferrer');
            } else {
              element.removeAttribute('target');
              element.removeAttribute('rel');
              element.addEventListener('click', preventDefaultAction, true);
            }
        }
    });

    // Instead of setting a fixed height, we calculate exactly how much
    // extra height the title takes up and add that to the base height.
    if (!window.matchMedia("(max-width: 550px)").matches) {
      if (cardTitle.offsetHeight > 29 || addressTextContent.offsetHeight > 19) {
        cardWidth = 337;
        const extraTitleHeight = Math.max(0, cardTitle.offsetHeight - 29);
        // Base height + extra title space + small buffer
        cardHeight = 336 + extraTitleHeight;
      }
    } else {
      if (cardTitle.offsetHeight > 24 || addressTextContent.offsetHeight > 19) {
        cardWidth = 317;
        const extraTitleHeight = Math.max(0, cardTitle.offsetHeight - 24);
        cardHeight = 226 + extraTitleHeight;
      }
    }

    card.style.width = `${cardWidth}px`;
    card.style.height = `${cardHeight}px`;

    // Edge case where the title no longer requires two rows, so revert to initial height.
    if (!window.matchMedia("(max-width: 550px)").matches) {
      if (cardTitle.offsetHeight <= 29) {
        card.style.height = `336px`;
      }
    } else {
      if (cardTitle.offsetHeight <= 24) {
        card.style.height = `226px`;
      }
    }

    var point = map.project(clickedFeature.geometry.coordinates, map.zoom);
    card.style.left = `${point.x}px`;
    card.style.top = `${point.y - heightAdjustment}px`;
    card.style.transform = 'translate(-50%, -100%)'; // Adjusts for the width and height of the card

    // Calculate the expected position of the card edges
    const cardLeft = point.x - cardWidth / 2;
    const cardRight = cardLeft + cardWidth;
    const cardTop = point.y - cardHeight + 27;
    const cardBottom = point.y;

    // Get the map container's dimensions
    const mapRect = map.getContainer().getBoundingClientRect();

    // Determine how much to adjust the map's center
    let deltaX = 0, deltaY = 0;

    let panelLeft, panelRight, panelTop;
    if (!window.matchMedia("(max-width: 550px)").matches) {
        panelRight = 110;
        panelTop = 75;
        if (isPanelHidden) {
          panelLeft = 55;
       } else {
          panelLeft = 377;
       }
    }

    // Check boundaries and calculate needed adjustments
    if (cardLeft < mapRect.left + panelLeft) {
        deltaX = cardLeft - mapRect.left - panelLeft;
    } else if (cardRight > mapRect.right - panelRight) {
        deltaX = cardRight - mapRect.right + panelRight;
    }
    if (cardTop < mapRect.top + panelTop) {
        deltaY = cardTop - mapRect.top - panelTop;
    } else if (cardBottom > mapRect.bottom) {
        deltaY = cardBottom - mapRect.bottom;
    }

    let pov;
    if (window.matchMedia("(max-width: 550px)").matches) {
      deltaX = 0;
      if (window.matchMedia("(max-width: 400px)").matches) {
        deltaY = -105;
      } else {
        deltaY = -70;
      }
      pov = nameToCoordinates[cardTitle.textContent];
    } else {
      pov = map.getCenter();
    }

    // Adjust the map's center if necessary
    if (adjustMap && (deltaX !== 0 || deltaY !== 0)) {
      const centerPixel = map.project(pov, map.zoom);
      const newCenter = map.unproject([centerPixel.x + deltaX, centerPixel.y + deltaY], map.zoom);

        map.once('moveend', function() {
          point = map.project(clickedFeature.geometry.coordinates, map.zoom);
          card.style.left = `${point.x}px`;
          card.style.top = `${point.y - heightAdjustment}px`;
          card.style.transform = 'translate(-50%, -100%)'; // Adjusts for the width and height of the card
          card.classList.remove('hidden-element');
          fillCardTextAndReadMore(cardTitle, contentArr);
        });

        map.easeTo({
            center: newCenter,
            essential: true // this ensures the movement is considered user-driven
        });
    } else {
        card.classList.remove('hidden-element');
        fillCardTextAndReadMore(cardTitle, contentArr);
    }
}

var lastClickedFeatureName = null;
var lastClickedFeatureCategory = null;

function updateIconState(featureName, newState) {
  for (let i = 0; i < geojsonData.features.length; i++) {
    if (geojsonData.features[i].properties.Name === featureName) {
        geojsonData.features[i].properties.IconState = newState;
        break;
    }
  }
  // Set the updated data back on the source
  updateLayerWithFilters();
}

function refreshIconState(clickedFeature) {
  const category = clickedFeature.properties.PrimaryCategory;
  if (lastClickedFeatureName === null) {
    // Activate the only one
    updateIconState(clickedFeature.properties.Name, `${iconPaths[category]}_clicked`);
  } else if (lastClickedFeatureName !== clickedFeature.properties.Name) {
      // Deactivate the old one
      updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
      // Activate the new one
      updateIconState(clickedFeature.properties.Name, `${iconPaths[category]}_clicked`);
  } else {
    // lastClickedFeatureName == clickedFeature.properties.Name
    // The same one has been clicked - don't do anything
  }
  lastClickedFeatureName = clickedFeature.properties.Name;
  lastClickedFeatureCategory = category;
}

function setupCategoryLayersAndFilters(data) {
  let uniqueCategories = new Set();

  let categoriesKey = `Categories_${currentLang}`;
  data.features.forEach(feature => {
      let categories = feature.properties[categoriesKey].split(/[,;]+/).map(s => s.trim());
      categories.forEach(category => uniqueCategories.add(category));
      feature.properties.PrimaryCategory = categories[0];
      feature.properties.IconState = iconPaths[categories[0]] + '_normal';
      // TODO adapt for two languages if needed
      nameToCoordinates[feature.properties.Name] = feature.geometry.coordinates;
      nameToFeature[feature.properties.Name] = feature;
      linkNameToTitle[titleToLink(feature.properties.Name)] = feature.properties.Name;
      titleToLinkName[feature.properties.Name] = titleToLink(feature.properties.Name);
  });

  geojsonData = data;

  const jsonScript = document.getElementById('picsJsonData');
  picsDirToNum = jsonScript ? JSON.parse(jsonScript.textContent) : {};

  map.addSource('dynamic-source', {
    type: 'geojson',
    data: data // Start with all data
  });

  map.addLayer({
    id: 'dynamic-layer',
    type: 'symbol',
    source: 'dynamic-source',
    layout: {
      'visibility' : 'visible',
      'icon-image': ['get', 'IconState'],
      'icon-size': 0.25,
      'icon-ignore-placement': true,  // Ignores the automatic placement algorithm
      'icon-allow-overlap': true, // Allows icons to overlap other map elements
    }
  });

  map.on('click', `dynamic-layer`, function(e) {
      const card = document.querySelector('.card');
      card.classList.add('hidden-element');
      // e.features[0] contains the clicked feature information
      if (e.features.length > 0) {
          const clickedFeature = e.features[0];
          closeReadMore();
          if (!window.matchMedia("(max-width: 550px)").matches) {
            closeArticlesHeader();
            closeEngage();
          }
          refreshIconState(clickedFeature);
          createAndDisplayCard(clickedFeature);
      }
  });

  map.on('resize', function() {
    const card = document.querySelector('.card');
    card.classList.add('hidden-element');
    if (lastClickedFeatureCategory && lastClickedFeatureName) {
      updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
      lastClickedFeatureName = null;
      lastClickedFeatureCategory = null;
    }
  });

  map.on('zoom', function() {
    const card = document.querySelector('.card');
    card.classList.add('hidden-element');
    if (lastClickedFeatureCategory && lastClickedFeatureName) {
      updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
      lastClickedFeatureName = null;
      lastClickedFeatureCategory = null;
    }
  });

  map.on('drag', function() {
    const card = document.querySelector('.card');
    card.classList.add('hidden-element');
    if (lastClickedFeatureCategory && lastClickedFeatureName) {
      updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
      lastClickedFeatureName = null;
      lastClickedFeatureCategory = null;
    }
  });

  map.on('click', function(e) {
      const features = map.queryRenderedFeatures(e.point, { layers: ['dynamic-layer'] });
      if (features.length === 0) {
          const card = document.querySelector('.card');
          card.classList.add('hidden-element');
          if (lastClickedFeatureCategory && lastClickedFeatureName) {
            updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
            lastClickedFeatureName = null;
            lastClickedFeatureCategory = null;
          }
      }
  });

  uniqueCategories.forEach(category => {
      let categoryData = {
        type: 'FeatureCollection',
        features: data.features.filter(feature => feature.properties[categoriesKey].split(/[,;]+/).includes(category))
      };

      categoryToData[currentLang][category] = categoryData;
  });

  uniqueCatTranslated = [];
  uniqueCategories.forEach(cat => uniqueCatTranslated.push(categoryTranslation[currentLang][cat]));
  const otherLang = Object.keys(translations).filter(l => l !== currentLang)[0];
  categoriesKey = `Categories_${otherLang}`;
  uniqueCatTranslated.forEach(category => {
    let catDataOtherLang = {
      type: 'FeatureCollection',
      features: data.features.filter(feature => feature.properties[categoriesKey].split(/[,;]+/).includes(category))
    };
    categoryToData[otherLang][category] = catDataOtherLang;
  });

  return uniqueCategories;
}


function filterFunc(feature) {
    const categoriesKey = `Categories_${currentLang}`;
    const featureCategories = feature.properties[categoriesKey].split(/[,;]+/).map(s => s.trim());
    const isInSelectedCategories = selectedCategories.length == 0 ? true : featureCategories.some(fc => selectedCategories.includes(fc));

    const orgsKey = `Orgs_${currentLang}`;
    const featureOrgs = feature.properties[orgsKey].split(/[,;]+/).map(s => s.trim());
    const isInSelectedOrgs = orgs.length == 0 ? true : featureOrgs.some(fsc => orgs.includes(fsc));

    let monumentType = true
    if (clasare !== '') {
        const classifyKey = `Classification_${currentLang}`;
        monumentType = feature.properties[classifyKey].trim().toLowerCase() == clasare.toLowerCase();
    }

    const periodKey = `Period_${currentLang}`; 
    const styleKey = `Style_${currentLang}`;

    const featurePeriods = feature.properties[periodKey] ? feature.properties[periodKey].split(/[,;]+/).map(s => s.trim().replace(/\s/g, '')) : [];
    const isInSelectedPeriods = periods.length == 0 ? true : featurePeriods.some(fp => periods.includes(fp));

    const featureStyles = feature.properties[styleKey] ? feature.properties[styleKey].split(/[,;]+/).map(s => s.trim()) : [];
    const isInSelectedStyles = styles.length == 0 ? true : featureStyles.some(fs => styles.includes(fs));

    return isInSelectedCategories && isInSelectedOrgs && monumentType && isInSelectedPeriods && isInSelectedStyles;
}

let selectedCategories = []; // Tracks the currently selected categories

function updateLayerWithFilters() {
  let filteredData;
  if (selectedCategories.length > 0 || orgs.length > 0 || clasare !== '' || periods.length > 0 || styles.length > 0) {
      // Filter features based on selected categories
      filteredData = {
          type: 'FeatureCollection',
          features: geojsonData.features.filter(feature => filterFunc(feature))
      };
  } else {
      // If no categories are selected, use all data
      filteredData = geojsonData;
  }

  // Update the data source for the dynamic layer
  map.getSource('dynamic-source').setData(filteredData);
}

function updateObjectiveListAppearance() {
  const isMobile = window.matchMedia("(max-width: 550px)").matches;
  const listId = isMobile ? '#mobileCustomBulletedList li' : '#custom-bulleted-list li';
  const selectAllId = isMobile ? 'mobileSelectAllInput' : 'selectAllInput';
  const listItems = document.querySelectorAll(listId);
  const selectAllCheckbox = document.getElementById(selectAllId);

  if (selectedCategories.length == 0) {
    if (selectAllCheckbox) selectAllCheckbox.checked = true;
    listItems.forEach(li => {
        const categoryName = li.getAttribute('data-category-name');
        li.style.setProperty("--bullet-color", getCategoryColor(categoryName));
    });
  } else {
      listItems.forEach(li => {
          const categoryName = li.getAttribute('data-category-name');
          if (selectedCategories.includes(categoryName)) {
            li.style.setProperty("--bullet-color", getCategoryColor(categoryName));
          } else {
            li.style.setProperty("--bullet-color", "#D3D3D3");
          }
      });
  }
  updateLayerWithFilters();
}

function populateObjectiveList(categoriesList) {
    const isMobile = window.matchMedia("(max-width: 550px)").matches;
    const ulId = isMobile ? "mobileCustomBulletedList" : "custom-bulleted-list";
    const ul = document.getElementById(ulId);
    if (!ul) return;

    ul.innerHTML = '';

    let childrenList = [];
    categoriesList.forEach(categoryName => {
        const li = document.createElement("li");
        li.textContent = getCategoryDisplayName(categoryName);
        li.setAttribute('data-category-name', categoryName);
        li.style.setProperty("--bullet-color", getCategoryColor(categoryName));

        li.addEventListener("click", function() {
          const selectAllId = isMobile ? 'mobileSelectAllInput' : 'selectAllInput';
          const clickedCategoryName = li.getAttribute('data-category-name');
          const index = selectedCategories.indexOf(clickedCategoryName);
          var selectAllBox = document.getElementById(selectAllId);
          if (index > -1) {
            selectedCategories.splice(index, 1);
          } else {
            selectedCategories.push(clickedCategoryName);
            if (selectAllBox) selectAllBox.checked = false;
            if (selectedCategories.length === numTotalCategories) {
              selectedCategories = [];
              if (selectAllBox) selectAllBox.checked = true;
            }
          }
          const card = document.querySelector('.card');
          card.classList.add('hidden-element');

          if (lastClickedFeatureCategory && lastClickedFeatureName) {
            updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
            lastClickedFeatureName = null;
            lastClickedFeatureCategory = null;
          }
          updateObjectiveListAppearance();
          populateGalleryContainer();
        });
        childrenList.push(li);    
    });

    childrenList.sort((a, b) => a.textContent.localeCompare(b.textContent));
    childrenList.forEach(child => {
        ul.appendChild(child);
    });
}

function handleSearch(searchValue) {
  const isMobile = window.matchMedia("(max-width: 550px)").matches;
  const galleryContainerId = isMobile ? 'mobileGalleryContainer' : 'gallery-container';
  const objListId = isMobile ? 'mobileObjList' : 'objList';

  const lowercasedFilter = replaceDiacritics(searchValue.toLowerCase());
  const galleryItems = document.querySelectorAll(`#${galleryContainerId} .gallery-item`);
  let countDisplayed = 0;

  galleryItems.forEach(item => {
    const titleText = item.querySelector('.gallery-item-title').textContent.toLowerCase();
    if (replaceDiacritics(titleText).includes(lowercasedFilter)) {
        item.style.display = '';
        countDisplayed++;
    } else {
        item.style.display = 'none';
    }
  });

  const objList = document.getElementById(objListId);
  if (objList) {
    if (currentLang === 'ro') {
      objList.textContent = `Listă obiective (${countDisplayed})`;
    } else {
      objList.textContent = `List of landmarks (${countDisplayed})`;
    }
  }
}

// Function to create a gallery item
function createGalleryItem(item) {
    const galleryItem = document.createElement('div');
    galleryItem.classList.add('gallery-item');

    const title = document.createElement('div');
    title.className = 'gallery-item-title';
    title.textContent = item.title;

    const labelContainer = document.createElement('div');
    labelContainer.classList.add('label-container');

    item.labels.forEach(labelText => {
      const label = document.createElement('span');
      label.textContent = labelText;
      label.classList.add('label');
      labelContainer.appendChild(label);
    });

    galleryItem.appendChild(title);
    galleryItem.appendChild(labelContainer);

    galleryItem.addEventListener('mouseover', () => {
        galleryItem.classList.add('active');
    });

    galleryItem.addEventListener('mouseout', () => {
        galleryItem.classList.remove('active');
    });

    galleryItem.addEventListener('click', () => {
      const card = document.querySelector('.card');
      card.classList.add('hidden-element');

      if (window.matchMedia("(max-width: 550px)").matches) {
        closeMobilePanel();
      }

      if (window.matchMedia("(max-width: 550px)").matches) {
        createAndDisplayCard(nameToFeature[item.title], adjustMap = true);
        refreshIconState(nameToFeature[item.title]);
      } else {
        map.once('moveend', function() {
          refreshIconState(nameToFeature[item.title]);
          createAndDisplayCard(nameToFeature[item.title], adjustMap = false);
        });

        map.flyTo({
          center: nameToCoordinates[item.title], // [lng, lat]
          zoom: 14, // Optional: set the zoom level
          speed: 0.6
        });
      }
    });

    return galleryItem;
}

function populateGalleryContainer() {
  const isMobile = window.matchMedia("(max-width: 550px)").matches;
  const galleryContainerId = isMobile ? 'mobileGalleryContainer' : 'gallery-container';
  const objListId = isMobile ? 'mobileObjList' : 'objList';

  const galleryContainer = document.getElementById(galleryContainerId);
  if (!galleryContainer) return;
  galleryContainer.innerHTML = '';

  let categoriesToUse = selectedCategories.length == 0 ? uniqueCategories : selectedCategories;

  const categoriesKey = `Categories_${currentLang}`;
  let items = [];
  categoriesToUse.forEach(category => {
      if (!categoryToData[currentLang][category]) return;
      let filteredFeatures = categoryToData[currentLang][category].features.filter(f => filterFunc(f));
      filteredFeatures.forEach(feature => {
          items.push({ title: feature.properties.Name,
                       labels: feature.properties[categoriesKey].split(/[,;]+/).map(s => getCategoryDisplayName(s.trim()))
                     });
      });
  });

  let uniqueItems = Array.from(new Set(items.map(JSON.stringify))).map(JSON.parse);
  uniqueItems.sort((a, b) => a.title.localeCompare(b.title));

  uniqueItems.forEach(item => {
      const galleryItem = createGalleryItem(item);
      galleryContainer.appendChild(galleryItem);
      const titleElement = galleryItem.querySelectorAll('.gallery-item-title')[0];
      if (titleElement.offsetHeight > 20) {
        galleryItem.style.height = '88px';
      }

      if (isMobile && titleElement.textContent.length >= 34) {
        galleryItem.style.height = '88px';
      }
  });

  const objList = document.getElementById(objListId);
  if (objList) {
    if (currentLang === 'ro') {
      objList.textContent = `Listă obiective (${uniqueItems.length})`;
    } else {
      objList.textContent = `List of landmarks (${uniqueItems.length})`;
    }
  }
}

function showObiective() {
  if (window.matchMedia("(max-width: 550px)").matches) {
    cleanupMobilePanels();
    document.getElementById('mobile-filters-panel').style.display = 'none';
    document.getElementById('mobile-discover-panel').style.display = 'flex';
    document.getElementById('sidePanel').style.display = 'flex';
  } else {
    showSidePanel();
    var obiectiveButton = document.getElementById('iconBtn1');
    if (!obiectiveButton.classList.contains('icon-btn-active')) {
      var img1 = document.getElementById('iconBtn1Image');
      img1.src = 'Stairs.svg';
      obiectiveButton.classList.toggle('icon-btn-active');
      var img2 = document.getElementById('iconBtn2Image');
      img2.src = 'Sliders.svg';
      document.getElementById('iconBtn2').classList.toggle('icon-btn-active');
      document.getElementById('obiective-panel').style.display = '';
      document.getElementById('filtre-panel').style.display = 'none';
    }
  }
}

function showFiltre() {
  if (window.matchMedia("(max-width: 550px)").matches) {
    cleanupMobilePanels();
    document.getElementById('mobile-discover-panel').style.display = 'none';
    document.getElementById('mobile-filters-panel').style.display = 'flex';
    document.getElementById('sidePanel').style.display = 'flex';
  } else {
    showSidePanel();
    var filtreButton = document.getElementById('iconBtn2');
    if (!filtreButton.classList.contains('icon-btn-active')) {
      var img1 = document.getElementById('iconBtn1Image');
      img1.src = 'StairsBlack.svg';
      document.getElementById('iconBtn1').classList.toggle('icon-btn-active');
      var img2 = document.getElementById('iconBtn2Image');
      img2.src = 'SlidersWhite.svg';
      filtreButton.classList.toggle('icon-btn-active');
      document.getElementById('obiective-panel').style.display = 'none';
      document.getElementById('filtre-panel').style.display = '';
    }
  }
}


function showSidePanel() {
  var panel = document.getElementById('sidePanel');
  const currentLeft = parseInt(window.getComputedStyle(panel).left, 10) || 0;
  var img3 = document.getElementById('iconBtn3Image');
  var btn =  document.getElementById('iconBtn3');
  if (currentLeft < 0) {
    panel.style.left = '0px';
    btn.style.left = '322px';
    img3.src = 'CaretLeft.svg';
    var dynamicLabelContainer = document.getElementById("dynamicLabelContainer");
    dynamicLabelContainer.style.left = '422px';
    isPanelHidden = false;
    if (!window.matchMedia("(max-width: 550px)").matches) {
      closeArticlesHeader();
    }
    const card = document.querySelector('.card');
    if (!card.classList.contains('hidden-element')) {
       const leftLimit = 377;
       const cardLeft = parseInt(window.getComputedStyle(card).left, 10) || 0;
       if (cardLeft <= leftLimit) {
          card.classList.add('hidden-element');
          if (lastClickedFeatureCategory && lastClickedFeatureName) {
            updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
            lastClickedFeatureName = null;
            lastClickedFeatureCategory = null;
          }
       }
    }
    return true;
  }
  return false;
}

function toggleSidePanel() {
  var panel = document.getElementById('sidePanel');
  var img3 = document.getElementById('iconBtn3Image');
  var btn = document.getElementById('iconBtn3');
  if (!showSidePanel()) {
    panel.style.left = '-322px';
    btn.style.left = '0px';
    img3.src = 'CaretRight.svg';
    var dynamicLabelContainer = document.getElementById("dynamicLabelContainer");
    dynamicLabelContainer.style.left = '120px';
    isPanelHidden = true;
    if (!window.matchMedia("(max-width: 550px)").matches) {
      wasSidePanelClosedArticles = true;
      wasSidePanelClosedEngage = true;
    }
  } else {
    if (!window.matchMedia("(max-width: 550px)").matches) {
      wasSidePanelClosedArticles = false;
      wasSidePanelClosedEngage = false;
    }
  }
}

function toggleSidebarSection(headerEl) {
  const section = headerEl.parentElement;
  const wasOpen = section.classList.contains('open');
  document.querySelectorAll('#sidebarAccordion .sidebar-accordion-section.open').forEach(s => s.classList.remove('open'));
  if (!wasOpen) section.classList.add('open');
}

function activateOrDeactivateCancelButton() {
  const cancelBtn = document.getElementById('cancelbtn');

  var checkboxes = Array.from(document.querySelectorAll('.custom-checkbox input[type="checkbox"]'))
                        .filter(checkbox => checkbox.id !== 'selectAllInput' && checkbox.id !== 'mobileSelectAllInput');
  const isAnyChecked = checkboxes.some(cb => cb.checked);

  if (document.querySelector('.button-clasare-active') || isAnyChecked) {
      if (cancelBtn) cancelBtn.classList.add('anuleaza-button-active');

      if (window.matchMedia("(max-width: 550px)").matches) {
        const filtersButton = document.getElementById('mobile-toolbar-filters');
        if (filtersButton) {
          filtersButton.classList.add('active');
        }
      }
  } else {
      if (cancelBtn) cancelBtn.classList.remove('anuleaza-button-active');

      if (window.matchMedia("(max-width: 550px)").matches) {
        const filtersButton = document.getElementById('mobile-toolbar-filters');
        if (filtersButton) {
          filtersButton.classList.remove('active');
        }
      }
  }
}

var clasare = '';

function buttonClasareClicked(element) {
  const currentlyActive = document.querySelector('.button-clasare-active');
  let idToToggle;
  if (currentlyActive && currentlyActive.id !== element.id) {
      idToToggle = currentlyActive.id;
      currentlyActive.classList.remove('button-clasare-active');
  }

  let oldClasare = clasare;
  if (element.classList.contains('button-clasare-active')) {
    clasare = '';
    idToToggle = element.id;
  } else {
    clasare = element.textContent;
    idToToggle = clasareToId[clasare];
  }

  element.classList.toggle('button-clasare-active');

  toggleClasareLabel(idToToggle, oldClasare, clasare);

  activateOrDeactivateCancelButton();
  updateLayerWithFilters();
  populateGalleryContainer();
}

function toggleClasareLabel(clasareId, oldClasare, newClasare) {
  let container = document.getElementById("dynamicLabelContainer");
 
  const clasareToOposite = {
    "historicalMonument" : "unclassified",
    "unclassified" : "historicalMonument",
  };

  if (oldClasare !== '') {
    const index = Array.from(container.children)
                       .findIndex(child => child.id == ((newClasare !== '' && oldClasare !== newClasare ? clasareToOposite[clasareId] : clasareId) + "Label" ));
    container.removeChild(container.children[index]);
    if (container.children.length == 0) {
      container.style.display = 'none';
    }
  }

  if (newClasare === '') {
    return;
  }

  let label = document.createElement("div");
  label.id = clasareId + "Label";
  label.classList.add("dynamic-label");
  label.innerHTML = `<span class="dynamic-label-text">${newClasare}</span> <span class="dynamic-label-close-btn" onclick="removeClasareLabel('${clasareId}')"></span>`;
  container.appendChild(label);
  if (container.children.length > 0) {
    container.style.display = 'flex';
  }
}

function removeClasareLabel(clasareId) {
  let container = document.getElementById("dynamicLabelContainer");

  const index = Array.from(container.children)
                      .findIndex(child => child.id == clasareId + "Label");

  container.removeChild(Array.from(container.children)[index]);

  if (container.children.length == 0) {
    container.style.display = 'none';
  }

  clasare = '';

  let btn = document.querySelector('.button-clasare-active');
  btn.classList.toggle('button-clasare-active');

  activateOrDeactivateCancelButton();
  updateLayerWithFilters();
  populateGalleryContainer();
}

var orgs = []
var periods = []
var styles = []
document.addEventListener('DOMContentLoaded', function() {
  // Select all checkbox inputs within labels having the class 'custom-checkbox'
  var checkboxes = Array.from(document.querySelectorAll('.custom-checkbox input[type="checkbox"]'))
                        .filter(checkbox => checkbox.id !== 'selectAllInput' && checkbox.id !== 'mobileSelectAllInput');

  // Add an event listener to each checkbox
  checkboxes.forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
          const labelText = this.parentNode.textContent.trim();
          let targetArray;
          let valueToStore = labelText;

          if (checkbox.id.startsWith('period-') || checkbox.id.startsWith('mobile-period-')) {
              targetArray = periods;
              valueToStore = labelText.replace(/\s/g, '');
          } else if (checkbox.id.startsWith('style-') || checkbox.id.startsWith('mobile-style-')) {
              targetArray = styles;
          } else {
              targetArray = orgs;
          }

          if (this.checked) {
              if (!targetArray.includes(valueToStore)) {
                  targetArray.push(valueToStore);
              }
          } else {
              const index = targetArray.indexOf(valueToStore);
              if (index > -1) {
                  targetArray.splice(index, 1);
              }
          }

          const card = document.querySelector('.card');
          card.classList.add('hidden-element');
          if (lastClickedFeatureCategory && lastClickedFeatureName) {
            updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
            lastClickedFeatureName = null;
            lastClickedFeatureCategory = null;
          }
          toggleDynamicCheckboxLabel(this); // TODO PHONE

          activateOrDeactivateCancelButton();
          updateLayerWithFilters();
          populateGalleryContainer();
      });
  });
  if (!initialEventsFetchPromise) { // Ensure it's only called once
    initialEventsFetchPromise = fetchAndPrepareInitialEventData();
  }
  if (!initialEventTypesFetchPromise) {
    initialEventTypesFetchPromise = fetchAndPrepareEventsFilterData('Event_type', dynamicEventTypes, false);
  }
  if (!initialKeywordsFetchPromise) {
    initialKeywordsFetchPromise = fetchAndPrepareEventsFilterData('Keywords', dynamicKeywords, true);
  }
});

function onAnuleazaClick(element) {
  if (element.classList.contains('anuleaza-button-active')) {
    var checkboxes = Array.from(document.querySelectorAll('.custom-checkbox input[type="checkbox"]'))
                          .filter(checkbox => checkbox.id !== 'selectAllInput' && checkbox.id !== 'mobileSelectAllInput');
    checkboxes.forEach(cb => cb.checked = false);

    checkboxes.forEach(cb => toggleDynamicCheckboxLabel(cb)); // TODO PHONE

    // Just for Desktop
    // var clasareButtons = document.querySelectorAll('.button-clasare-active');
    // clasareButtons.forEach(cb => cb.classList.remove('button-clasare-active'));

    element.classList.remove('anuleaza-button-active');

    if (clasare !== '') {
      removeClasareLabel(clasareToId[clasare]); // TODO PHONE
    }

    orgs = [];
    periods = [];
    styles = [];
    clasare = '';

    updateLayerWithFilters();
    populateGalleryContainer();
  }
}

function toggleDynamicCheckboxLabel(checkbox) {
  const labelId = checkbox.id + "Label";
  let label = document.getElementById(labelId);

  if (checkbox.checked) {
    if (!label) {
      // Create the label element if it doesn't exist
      label = document.createElement("div");
      label.id = labelId;
      label.classList.add("dynamic-label");
      const labelText = checkbox.parentNode.textContent.trim(); // Get text from the custom-checkbox
      label.innerHTML = `<span class="dynamic-label-text">${labelText}</span> <span class="dynamic-label-close-btn" onclick="removeDynamicLabel('${checkbox.id}')"></span>`;
      const container = document.getElementById("dynamicLabelContainer")
      container.appendChild(label);
      if (container.children.length > 0) {
        container.style.display = 'flex';
      }
    }
  } else if (label) {
      if (label.parentNode.children.length == 1) {
        label.parentNode.style.display = 'none';
      }
      label.parentNode.removeChild(label);
  }
}

function removeDynamicLabel(checkboxId) {
  const checkbox = document.getElementById(checkboxId);
  const label = document.getElementById(checkboxId + "Label");

  if (checkbox && label) {
    checkbox.checked = false; // Uncheck the checkbox
    if (label.parentNode.children.length == 1) {
      label.parentNode.style.display = 'none';
    }
    label.parentNode.removeChild(label);

    const labelText = checkbox.parentNode.textContent.trim();
    let valueToRemove = labelText;
    let targetArray;

    if (checkbox.id.startsWith('period-') || checkbox.id.startsWith('mobile-period-')) {
        targetArray = periods;
        valueToRemove = labelText.replace(/\s/g, ''); // "1701 - 1800" -> "1701-1800"
    } else if (checkbox.id.startsWith('style-') || checkbox.id.startsWith('mobile-style-')) {
        targetArray = styles;
    } else {
        targetArray = orgs;
    }

    const index = targetArray.indexOf(valueToRemove);
    if (index > -1) {
        targetArray.splice(index, 1);
    }

    activateOrDeactivateCancelButton();
    updateLayerWithFilters();
    populateGalleryContainer();
    const card = document.querySelector('.card');
    card.classList.add('hidden-element');
    if (lastClickedFeatureCategory && lastClickedFeatureName) {
      updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
      lastClickedFeatureName = null;
      lastClickedFeatureCategory = null;
    }
  }
}

function mapZoomIn() {
  map.zoomIn();
}

function mapZoomOut() {
  map.zoomOut();
}

function replaceDiacritics(str) {
  const diacriticsMap = {
    'ă': 'a', 'Ă': 'A',
    'â': 'a', 'Â': 'A',
    'î': 'i', 'Î': 'I',
    'ș': 's', 'Ș': 'S',
    'ț': 't', 'Ț': 'T',
  };
  return str.split('').map(char => diacriticsMap[char] || char).join('');
}

function titleToPicsDir(title) {
  title = title.trim();
  // Replace diacritics
  let result = replaceDiacritics(title);

  // Replace spaces with underscores
  result = result.replace(/-/g, '').replace(/\s+/g, ' ').replace(/ /g, '_').replace(/\//g, '').replace(/'/g, '');

  // Drop a trailing "+" from the final string
  if (result.endsWith('+')) {
    result = result.slice(0, -1);
  }

  // Convert the result to lowercase
  return result.toLowerCase();
}

function titleToLink(title) {
  if (customLinks.hasOwnProperty(title)) {
    return customLinks[title];
  }

  title = title.trim();

  let result = replaceDiacritics(title);

  result = result.replace(/\s+/g, '-');

  result = result.replace(/[^a-zA-Z0-9-]/g, '');

  return result.toLowerCase();
}

var currentImageIndex = 0;
var currentImageDir = '';

function buildPicPath(subDir, picNum) {
  const mainPicsDir = "pics";
  return mainPicsDir + '/' + subDir + '/' + picNum + '.jpg';
}

// Shown instead of a real photo for locations/articles whose pictures
// haven't been uploaded yet, rather than silently falling back to another
// location's photos. A flat-color inline SVG (rather than an external
// placeholder service) so the "În curând"/"Coming soon" label can be a real
// HTML overlay (see showNoPhotoLabel) sized in actual CSS px instead of text
// baked into the image at a size that scales with the image itself.
function buildNoPhotoPlaceholder() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23E5E1DC'/%3E%3C/svg%3E";
}

// mainImageContainer is the .main-image/.main-image-article element (which
// has position: relative) — the label is centered over whatever img is
// inside it via .no-photo-label's own absolute positioning.
function showNoPhotoLabel(mainImageContainer) {
  if (!mainImageContainer) return;
  let label = mainImageContainer.querySelector('.no-photo-label');
  if (!label) {
    label = document.createElement('div');
    label.className = 'no-photo-label';
    mainImageContainer.appendChild(label);
  }
  label.textContent = currentLang === 'ro' ? 'În curând' : 'Coming soon';
  label.style.display = '';
}

function hideNoPhotoLabel(mainImageContainer) {
  if (!mainImageContainer) return;
  const label = mainImageContainer.querySelector('.no-photo-label');
  if (label) label.style.display = 'none';
}

function openReadMore(elementOrFeatureName) {
  let feature;
  let title, categoryName, address, fbLink, siteLink, instaLink, mapsLink;
  let featurePicsDir, numFeaturePics;

  if (typeof elementOrFeatureName === 'string') {
      // Called with a feature name (e.g., from event detail panel)
      const featureName = elementOrFeatureName;
      feature = nameToFeature[featureName];
      if (!feature) {
          console.error("Feature not found for Read More:", featureName);
          return;
      }
      title = feature.properties.Name;
      const categoriesKey = `Categories_${currentLang}`;
      categoryName = feature.properties[categoriesKey].split(/[,;]+/).map(s => s.trim())[0];
      address = feature.properties.Address;
      fbLink = fixLinkIfNeeded(feature.properties.FB);
      siteLink = fixLinkIfNeeded(feature.properties.Site);
      instaLink = fixLinkIfNeeded(feature.properties.Insta);
      mapsLink = fixLinkIfNeeded(feature.properties.Gmaps);

      featurePicsDir = titleToPicsDir(title);
      numFeaturePics = picsDirToNum[featurePicsDir] || 0;

  } else if (elementOrFeatureName && elementOrFeatureName.parentNode) {
      const card = elementOrFeatureName.parentNode;
      title = card.querySelector('.card-title').textContent;
      // For address, links, and category, it's better to get them from the feature object via title
      // (the card's .card-category element holds a display label, not the canonical category token)
      feature = nameToFeature[title];
      if (!feature) {
           console.error("Feature not found for Read More from card element:", title);
           return;
      }
      const cardCategoriesKey = `Categories_${currentLang}`;
      categoryName = feature.properties[cardCategoriesKey].split(/[,;]+/).map(s => s.trim())[0];
      address = feature.properties.Address; // Get from feature for consistency
      fbLink = fixLinkIfNeeded(feature.properties.FB);
      siteLink = fixLinkIfNeeded(feature.properties.Site);
      instaLink = fixLinkIfNeeded(feature.properties.Insta);
      mapsLink = fixLinkIfNeeded(feature.properties.Gmaps);

      featurePicsDir = titleToPicsDir(title);
      numFeaturePics = picsDirToNum[featurePicsDir] || 0;
  } else {
      console.error("Invalid argument passed to openReadMore:", elementOrFeatureName);
      return;
  }

  let readMoreContainer;
  if (window.matchMedia("(max-width: 550px)").matches) {
      readMoreContainer = document.querySelector('.read-more-container-mobile');
  } else {
      readMoreContainer = document.querySelector('.read-more-container');
  }
  if (!readMoreContainer) {
    console.warn("Read-more detail view isn't built on this page yet.");
    return;
  }

  readMoreContainer.querySelector(".read-more-title").textContent = title;
  readMoreContainer.querySelector(".read-more-address-text-content").textContent = address;

  let addressIconReadMore;
  if (window.matchMedia("(max-width: 550px)").matches) {
      addressIconReadMore = document.getElementById('read-more-address-icon-mobile');
  } else {
      addressIconReadMore = document.getElementById('read-more-address-icon');
  }
  // Use categoryName to get the icon path
  addressIconReadMore.src = `pins/${iconPaths[categoryName]}_normal.png`;

  const linksData = [ // Use the 'linksData' naming to avoid conflict with 'links' in createAndDisplayCard
      { id: '#fb-link', propertyValue: fbLink },
      { id: '#site-link', propertyValue: siteLink },
      { id: '#insta-link', propertyValue: instaLink },
      { id: '#maps-link', propertyValue: mapsLink }
  ];

  linksData.forEach(linkInfo => {
      const element = readMoreContainer.querySelector(linkInfo.id);
      if (element) {
          element.removeEventListener('click', preventDefaultAction, true);
          element.href = linkInfo.propertyValue; // Use the value derived above
          if (element.href && !element.href.includes("localhost") && !element.href.includes("harta-buc") && !element.href.includes("filtru") && element.href !== "#") {
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
          } else {
            element.removeAttribute('target');
            element.removeAttribute('rel');
            if (element.href === "#" || (element.href && (element.href.includes("localhost") || element.href.includes("harta-buc")))) {
                element.addEventListener('click', preventDefaultAction, true);
            }
          }
      }
  });

  currentImageIndex = 0;
  currentImageDir = featurePicsDir;

  let imageContainer = readMoreContainer.querySelector('.image-gallery-container');
  let mainImage = imageContainer.querySelector('.main-image');
  var mainImgElement = mainImage.querySelector('img');

  if (numFeaturePics > 0) {
      hideNoPhotoLabel(mainImage);
      mainImgElement.src = buildPicPath(featurePicsDir, 0);
      if (!window.matchMedia("(max-width: 550px)").matches) {
          mainImgElement.setAttribute('onclick', `openLightbox('${buildPicPath(featurePicsDir, 0)}', 0)`);
      } else {
          mainImgElement.setAttribute('onclick', `openLightboxMobile('${featurePicsDir}')`);
          mainImage.querySelector('.num-pics-label').textContent = '1 / ' + numFeaturePics;
      }
  } else { // No pictures uploaded yet for this location
      mainImgElement.src = buildNoPhotoPlaceholder();
      mainImgElement.removeAttribute('onclick');
      showNoPhotoLabel(mainImage);
      if (window.matchMedia("(max-width: 550px)").matches) {
           mainImage.querySelector('.num-pics-label').textContent = '';
      }
  }

  if (!window.matchMedia("(max-width: 550px)").matches) {
      var thumbnailsList = document.querySelectorAll('.thumbnails .thumbnail');
      var thumbnails = Array.from(thumbnailsList);

      thumbnails.sort(function(a, b) {
        let idA = a.id.toUpperCase();
        let idB = b.id.toUpperCase();
        if (idA < idB) {
            return -1;
        }
        if (idA > idB) {
            return 1;
        }
        return 0;
      });

      for (let i = 0; i < 4; i++) { // for thumb0 to thumb3
          var imgElement = thumbnails[i].querySelector('img'); // thumbnails are 0-indexed
          if (i < numFeaturePics - 1) { // -1 because main image is pic 0, thumbs start from pic 1
              imgElement.src = buildPicPath(featurePicsDir, i + 1);
              imgElement.setAttribute('onclick', `openLightbox('${buildPicPath(featurePicsDir, i + 1)}', ${i + 1})`);
              imgElement.classList.remove('hidden');
          } else {
              imgElement.src = ''; // Clear src
              imgElement.removeAttribute('onclick');
              imgElement.classList.add('hidden');
          }
      }
      document.querySelector('.thumbnails').style.display = (numFeaturePics > 1) ? 'flex' : 'none';
      document.getElementById('sidePanel').style.display = 'none';
  }

  readMoreContainer.style.display = '';
  refreshOrFillReadMore(feature);

  readMoreContainer.scrollTop = 0;
  if (window.matchMedia("(max-width: 550px)").matches) {
      let readMoreContainerMobileFixed = document.querySelector('.read-more-container-mobile-fixed');
      if (readMoreContainerMobileFixed) readMoreContainerMobileFixed.scrollTop = 0;
  } else {
      let readMoreContainerContent = document.querySelector('.read-more-content-container');
      if (readMoreContainerContent) readMoreContainerContent.scrollTop = 0;
  }

  window.location.hash = titleToLinkName[title]; // title is already defined

  if (window.matchMedia("(max-width: 550px)").matches) {
    document.getElementById('fb-share-read-more-mobile').href = encodeURIComponent(window.location.href);
  } else {
    document.getElementById('fb-share-read-more-desktop').href = encodeURIComponent(window.location.href);
  }
}

function refreshOrFillReadMore(featureToRefresh) {
  let readMoreContainer;
  const isMobile = window.matchMedia("(max-width: 550px)").matches;
  if (isMobile) {
    readMoreContainer = document.querySelector('.read-more-container-mobile');
  } else {
    readMoreContainer = document.querySelector('.read-more-container');
  }

  // If the read-more container isn't visible, there's nothing to refresh.
  if (!readMoreContainer || readMoreContainer.style.display === 'none') {
    return;
  }

  let feature = featureToRefresh;
  let currentFeatureName; // Use this variable to store the name

  if (!feature) {
      // Try to get the feature name from the currently displayed title in the Read More panel
      const titleElement = readMoreContainer.querySelector(".read-more-title");
      if (titleElement && titleElement.textContent) {
          currentFeatureName = titleElement.textContent;
          feature = nameToFeature[currentFeatureName];
      }
  } else {
      // If a feature is passed in, use its name
      currentFeatureName = feature.properties.Name;
  }

  if (!feature) {
      console.error("Feature not found in refreshOrFillReadMore. Cannot determine current feature name.");
      return;
  }

  const categoriesKey = `Categories_${currentLang}`;
  const category = feature.properties[categoriesKey].split(/[,;]+/).map(s => s.trim())[0];
  let readMoreCategory = readMoreContainer.querySelector(".read-more-category");
  readMoreCategory.textContent = getCategoryDisplayName(category);
  readMoreCategory.style.color = `${getCategoryColor(category)}`;

  // Style/Period/Classification/Org tags — same "first value from a
  // comma/semicolon-separated field" convention as category/org used above.
  function setReadMoreTag(selector, propertyKeyBase) {
    const el = readMoreContainer.querySelector(selector);
    if (!el) return;
    const raw = feature.properties[`${propertyKeyBase}_${currentLang}`] || '';
    const value = raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean)[0];
    el.textContent = value || '';
  }
  setReadMoreTag('.read-more-tag-style', 'Style');
  setReadMoreTag('.read-more-tag-period', 'Period');
  setReadMoreTag('.read-more-tag-clasare', 'Classification');
  setReadMoreTag('.read-more-tag-org', 'Orgs');

  const descriereKey = `Descriere_${currentLang}`;
  let contentArr = feature.properties[descriereKey].split('\n').filter(l => l.length > 0 && l.trim() !== '');
  let readMoreDesr, readMoreOffer, readMoreUploaded, photosBy;
  if (!isMobile) {
    readMoreDesr = document.getElementById("read-more-description");
    readMoreOffer = document.getElementById("read-more-offer");
    readMoreUploaded = document.getElementById("read-more-uploaded");
    photosBy = document.getElementById("photosby-desktop");
  } else {
    readMoreDesr = document.getElementById("read-more-description-mobile");
    readMoreOffer = document.getElementById("read-more-offer-mobile");
    readMoreUploaded = document.getElementById("read-more-uploaded-mobile");
    photosBy = document.getElementById("photosby-mobile");
  }

  let moreToFollowTxt = currentLang === 'ro' ? "Mai multe detalii în curând." : "More details soon.";
  readMoreDesr.textContent = contentArr.length > 0 ? contentArr[0] : moreToFollowTxt;
  readMoreOffer.textContent = contentArr.length > 1 ? contentArr[1] : moreToFollowTxt;

  let articleByTxt = currentLang === 'ro' ? "Articol încărcat de " : "Article uploaded by ";
  let photoTxt = currentLang === 'ro' ? "Fotografii: " : "Photos: ";

  if (contentArr.length == 3) {
    readMoreUploaded.style.display = '';
    readMoreUploaded.innerHTML = "<i>" + articleByTxt + contentArr[2] + ".</i>";
    photosBy.textContent = photoTxt + contentArr[2];
  } else {
    readMoreUploaded.style.display = 'none';
    photosBy.textContent = photoTxt + "Rareș Toma";
  }

  // No "Fotografii: ..." credit line when there are no actual photos to
  // credit — just the "În curând" placeholder.
  const featurePicsDirName = titleToPicsDir(feature.properties.Name);
  const numFeaturePics = picsDirToNum[featurePicsDirName] || 0;
  photosBy.style.display = numFeaturePics > 0 ? '' : 'none';
  if (numFeaturePics === 0) {
    const mainImageContainer = readMoreContainer.querySelector('.main-image');
    showNoPhotoLabel(mainImageContainer);
  }

  if (currentFeatureName) {
      populateRelatedEventsForReadMore(currentFeatureName);
      const currentCategoriesKey = `Categories_${currentLang}`;
      const currentFeaturePrimaryCategory = feature.properties[currentCategoriesKey] ? feature.properties[currentCategoriesKey].split(/[,;]+/)[0].trim() : null;
      const currentFeatureCoords = feature.geometry.coordinates; // Ensure feature has geometry.coordinates

      if (currentFeaturePrimaryCategory && currentFeatureCoords) {
          populateRelatedFeaturesByCategory(currentFeatureName, currentFeaturePrimaryCategory, currentFeatureCoords);
      } else {
          // Hide the section if critical data is missing for this refresh
          const isMobileContext = window.matchMedia("(max-width: 550px)").matches;
          const wrapperId = isMobileContext ? 'categoryRelatedFeaturesWrapperMobile' : 'categoryRelatedFeaturesWrapperDesktop';
          const relatedCatWrapper = document.getElementById(wrapperId);
          if(relatedCatWrapper) relatedCatWrapper.style.display = 'none';
          console.warn("Missing category or coords in refreshOrFillReadMore for related features by category.");
      }
  }
}

function closeReadMore() {
  let readMoreContainer;
  if (window.matchMedia("(max-width: 550px)").matches) {
    readMoreContainer = document.querySelector('.read-more-container-mobile');
    if (!readMoreContainer) return;
  } else {
    readMoreContainer = document.querySelector('.read-more-container');
    if (!readMoreContainer) return;
    if (readMoreContainer.style.display !== 'none') {
      var thumbnailsList = document.querySelectorAll('.thumbnails .thumbnail');
      var thumbnails = Array.from(thumbnailsList);

      thumbnails.sort(function(a, b) {
          let idA = a.id.toUpperCase();
          let idB = b.id.toUpperCase();
          if (idA < idB) {
              return -1;
          }
          if (idA > idB) {
              return 1;
          }
          return 0;
      });

      thumbnails.forEach(function(thumbnail, index) {
        var imgElement = thumbnail.querySelector('img');
        imgElement.src = '';
        imgElement.onclick = null;
        imgElement.classList.remove('hidden');
      });

      document.querySelector('.thumbnails').style.display = 'flex';

      document.getElementById('sidePanel').style.display = 'flex';
    }
  }

  let imageContainer = readMoreContainer.querySelector('.image-gallery-container');
  let mainImage = imageContainer.querySelector('.main-image');
  var mainImgElement = mainImage.querySelector('img');
  mainImgElement.onclick = null;
  mainImgElement.src = '';

  const desktopRelatedWrapper = document.getElementById('readMoreRelatedEventsWrapperDesktop');
  if (desktopRelatedWrapper) desktopRelatedWrapper.style.display = 'none';
  const mobileRelatedWrapper = document.getElementById('readMoreRelatedEventsWrapperMobile');
  if (mobileRelatedWrapper) mobileRelatedWrapper.style.display = 'none';

  const desktopRelatedContainer = document.getElementById('readMoreRelatedEventsContainerDesktop');
  if (desktopRelatedContainer) desktopRelatedContainer.innerHTML = ''; // Clear cards
  const mobileRelatedContainer = document.getElementById('readMoreRelatedEventsContainerMobile');
  if (mobileRelatedContainer) mobileRelatedContainer.innerHTML = ''; // Clear cards

  const desktopCatRelatedWrapper = document.getElementById('categoryRelatedFeaturesWrapperDesktop');
  if (desktopCatRelatedWrapper) desktopCatRelatedWrapper.style.display = 'none';
  const mobileCatRelatedWrapper = document.getElementById('categoryRelatedFeaturesWrapperMobile');
  if (mobileCatRelatedWrapper) mobileCatRelatedWrapper.style.display = 'none';

  const desktopCatRelatedContainer = document.getElementById('categoryRelatedFeaturesContainerDesktop');
  if (desktopCatRelatedContainer) desktopCatRelatedContainer.innerHTML = '';
  const mobileCatRelatedContainer = document.getElementById('categoryRelatedFeaturesContainerMobile');
  if (mobileCatRelatedContainer) mobileCatRelatedContainer.innerHTML = '';

  history.replaceState(null, null, ' ');
  readMoreContainer.style.display = 'none';
}

