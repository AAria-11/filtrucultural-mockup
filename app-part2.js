function addLightboxKeyboardControls() {
  document.addEventListener('keydown', lightboxKeydownFunction);
}

function removeLightboxKeyboardControls() {
  document.removeEventListener('keydown', lightboxKeydownFunction);
}

function openLightbox(src, index, totalImages = null) {
  const lightbox = document.getElementById('lightbox');
  const imgEl = document.getElementById('lightbox-img');
  const prevArrow = lightbox.querySelector('.lightbox-prev');
  const nextArrow = lightbox.querySelector('.lightbox-next');
  const counter = lightbox.querySelector('.lightbox-counter');

  imgEl.src = src;
  lightbox.style.display = 'flex';
  currentImageIndex = index;

  if (totalImages === 1) {
    // Single image mode: Set counter to "1 / 1" and hide navigation arrows.
    counter.textContent = '1 / 1';
    if (prevArrow) prevArrow.style.display = 'none';
    if (nextArrow) nextArrow.style.display = 'none';
  } else {
    // Gallery mode (original behavior)
    counter.textContent = (currentImageIndex + 1) + ' / ' + picsDirToNum[currentImageDir];
    if (prevArrow) prevArrow.style.display = 'block';
    if (nextArrow) nextArrow.style.display = 'block';
  }

  addLightboxKeyboardControls();
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const prevArrow = lightbox.querySelector('.lightbox-prev');
  const nextArrow = lightbox.querySelector('.lightbox-next');

  lightbox.style.display = 'none';
  currentImageIndex = 0; // Reset index

  // IMPORTANT: Reset arrow visibility for the next time a gallery is opened
  if (prevArrow) prevArrow.style.display = 'block';
  if (nextArrow) nextArrow.style.display = 'block';

  removeLightboxKeyboardControls();
}

function lightboxKeydownFunction(event) {
  const prevArrow = document.querySelector('#lightbox .lightbox-prev');

  switch (event.key) {
    case 'ArrowLeft':
      // Only change image if arrows are visible (i.e., not in single-image mode)
      if (prevArrow && prevArrow.style.display !== 'none') {
        changeImage(-1);
      }
      break;
    case 'ArrowRight':
      // Only change image if arrows are visible
      if (prevArrow && prevArrow.style.display !== 'none') {
        changeImage(1);
      }
      break;
    case 'Escape':
      closeLightbox();
      break;
    default:
      break;
  }
}

function changeImage(step) {
  currentImageIndex += step;
  const totalImages = picsDirToNum[currentImageDir];
  if (currentImageIndex >= totalImages) {
    currentImageIndex = currentImageIndex % totalImages;
  } else if (currentImageIndex < 0) {
    currentImageIndex = totalImages - 1;
  }

  document.getElementById('lightbox-img').src = buildPicPath(currentImageDir, currentImageIndex);
  // Update the counter
  document.querySelector('.lightbox-counter').textContent = (currentImageIndex + 1) + ' / ' + totalImages;
}

function resetEventFiltersSimple() {
  const cancelAllPill = filterLabelsContainer.querySelector('.dynamic-label[data-cancel-all]');
  if (cancelAllPill && filterLabelsContainer.style.display !== 'none') {
    const cancelAllCloseButton = cancelAllPill.querySelector('.dynamic-label-close-btn');
    if (cancelAllCloseButton) {
        cancelAllCloseButton.click();
    } else {
        cancelAllPill.click(); // Fallback
    }
  }

  const calendarClearButton = document.querySelector('#calendar-btn .calendar-clear-btn');
  if (calendarClearButton && calendarClearButton.style.display !== 'none') {
    calendarClearButton.click();
  }

  const desktopSearchInput = document.querySelector('.filter-bar .search-bar-events input[type="search"]');
  if (desktopSearchInput) {
    desktopSearchInput.value = '';
  }

  const mobileSearchInput = document.querySelector('#search-bar-events-mobile input[type="search"]');
  if (mobileSearchInput) {
    mobileSearchInput.value = '';
  }

  currentSearchQuery = '';
  applyAllEventsFiltersAndPopulate();
}

function closeEvents() {
    document.getElementById('events-container').style.display = 'none';
    resetEventFiltersSimple();
    window.location.hash = '';
    if (window.matchMedia("(max-width: 550px)").matches) {
      resetToolbarToMapView();
    }
}

let masterEventList = [];
let dynamicEventTypes = [];
let dynamicKeywords = [];
let currentlyDisplayedEventsForCount = [];
let initialEventsFetchPromise = null;
let initialEventTypesFetchPromise = null;
let initialKeywordsFetchPromise = null;
let currentOpenEventData = null;
let currentSearchQuery = '';

// --- Baserow config for Events (see app-part1.js for the Obiective/locations
// config this mirrors). Table ID from the table's URL, token scoped
// read-only to this database (it's publicly visible in the page source). ---
const BASEROW_EVENTS_TABLE_ID = '1095448';
const BASEROW_EVENTS_TOKEN = 'BGQuoVQ5T3RBqE534jsj6KonM7IcsldS';
const BASEROW_EVENTS_API_URL = `https://api.baserow.io/api/database/rows/table/${BASEROW_EVENTS_TABLE_ID}/?user_field_names=true&size=200`;
const BASEROW_EVENTS_FIELDS_URL = `https://api.baserow.io/api/database/fields/table/${BASEROW_EVENTS_TABLE_ID}/`;

function formatEventDateTime(isoStartDate, isoEndDate) {
  if (!isoStartDate) return "Data neprecizată";

  const startDate = new Date(isoStartDate);
  const endDate = isoEndDate ? new Date(isoEndDate) : null;

  // Language-specific arrays (ensure currentLang is globally available or passed)
  const lang = typeof currentLang !== 'undefined' ? currentLang : 'ro';
  const daysOfWeek = {
    ro: ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  };
  const months = {
    ro: ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  };

  const startDay = startDate.getDate();
  const startMonthIndex = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const startHours = String(startDate.getHours()).padStart(2, '0');
  const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
  const startDayName = daysOfWeek[lang][startDate.getDay()];
  const startMonthName = months[lang][startMonthIndex];

  const startTime = `${startHours}:${startMinutes}`;

  // Case 1: No isoEndDate (current behavior)
  if (!endDate) {
    return `${startDayName}, ${startDay} ${startMonthName} • ${startTime}`;
  }

  // With isoEndDate
  const endDay = endDate.getDate();
  const endMonthIndex = endDate.getMonth();
  const endYear = endDate.getFullYear();
  const endHours = String(endDate.getHours()).padStart(2, '0');
  const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
  const endMonthName = months[lang][endMonthIndex];
  const endTime = `${endHours}:${endMinutes}`;

  // Case 2: Same day event
  if (startYear === endYear && startMonthIndex === endMonthIndex && startDay === endDay) {
    return `${startDayName}, ${startDay} ${startMonthName} • ${startTime} - ${endTime}`;
  }

  // Case 3: Different day, same month and year
  if (startYear === endYear && startMonthIndex === endMonthIndex) {
    return `${startDay} - ${endDay} ${startMonthName} • ${startTime} - ${endTime}`;
  }

  // Case 4: Different month, same year
  if (startYear === endYear) {
    return `${startDay} ${startMonthName} - ${endDay} ${endMonthName} • ${startTime} - ${endTime}`;
  }

  // Case 5: Different year (implies different month and day as well)
  return `${startDay} ${startMonthName} - ${endDay} ${endMonthName} • ${startTime} - ${endTime}`;
}

async function fetchAllBaserowEventRows(url) {
  const maxRetries = 5;
  const retryDelay = 500;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let rows = [];
  let nextUrl = url;

  while (nextUrl) {
    let response = null;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(nextUrl, {
          headers: { 'Authorization': `Token ${BASEROW_EVENTS_TOKEN}` }
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

// Location is a Baserow select field on the events table. It's moving from
// single_select (API returns one {id,value,color} object) to
// multiple_select (API returns an array of those) -- this accepts either
// shape, plus null/undefined, and always returns an array of name strings.
function normalizeLocationList(rawLocation) {
  if (!rawLocation) return [];
  const options = Array.isArray(rawLocation) ? rawLocation : [rawLocation];
  return options.map(option => option.value).filter(Boolean);
}

async function fetchAndPrepareInitialEventData() {
  try {
    const rows = await fetchAllBaserowEventRows(BASEROW_EVENTS_API_URL);
    rows.sort((a, b) => new Date(a.Start || 0) - new Date(b.Start || 0));

    masterEventList = rows.map(row => {
      const imageUrl = (row.Picture && row.Picture.length > 0 && row.Picture[0].url)
                       ? row.Picture[0].url
                       : 'https://placehold.co/284x180/EAAAC8/EAAAC8'; // Default placeholder

      const eventTypeArray = (row.Event_type || []).map(option => option.value);
      let categoryString = eventTypeArray.join(' • ');
      if (!categoryString) categoryString = "Necategorisit"; // Default category

      // Normalized into the shape the rest of the app already reads
      // (kept as "airtableFields" — this event data now comes from Baserow,
      // not Airtable, but that property name is referenced throughout
      // app-part1/2/3.js so it's left as-is to avoid touching every call site).
      const fields = {
        Title: row.Title,
        Description: row.Description,
        Description_ro: row.Description,
        Description_en: row.Description_en,
        Start: row.Start,
        End: row.End,
        Picture: row.Picture,
        Location: normalizeLocationList(row.Location),
        Entry: row.Entry ? row.Entry.value : null,
        Ticket_details: row.Ticket_details,
        Event_type: eventTypeArray,
        Keywords: (row.Keywords || []).map(option => option.value)
      };

      return {
        image: imageUrl,
        category: categoryString,
        title: fields.Title || "Eveniment fără titlu",
        eventTypes: eventTypeArray,
        address: fields.Location.join(', '),
        time: formatEventDateTime(fields.Start, fields.End),
        airtableFields: fields
      };
    });
  } catch (error) {
    console.error("Failed to load events from Baserow.", error);
  }
}

// Event_type/Keywords are Baserow multiple_select fields — the filter
// checkboxes read their master list of options from the field's own
// metadata rather than a separate lookup table.
async function fetchAndPrepareEventsFilterData(fieldName, targetArray, isKeywords = false) {
  try {
    const response = await fetch(BASEROW_EVENTS_FIELDS_URL, {
      headers: { 'Authorization': `Token ${BASEROW_EVENTS_TOKEN}` }
    });
    if (!response.ok) throw new Error(`Baserow fields request failed: ${response.status}`);
    const allFields = await response.json();
    const field = allFields.find(f => f.name === fieldName);
    const values = (field && field.select_options ? field.select_options.map(opt => opt.value) : [])
      .sort((a, b) => a.localeCompare(b, 'ro'));

    if (isKeywords) {
      targetArray.splice(0, targetArray.length, ...values);
    } else {
      const typeObjects = values.map(label => ({ label, count: 0 }));
      targetArray.splice(0, targetArray.length, ...typeObjects);
    }
  } catch (error) {
    console.error(`Failed to load ${fieldName} options from Baserow. Filter list will be empty.`, error);
    targetArray.length = 0;
  }
  return targetArray;
}

function calculateAndAssignEventTypeCounts() {
  if (!masterEventList || !dynamicEventTypes || dynamicEventTypes.length === 0) { // Keep initial checks
      if (dynamicEventTypes) {
        dynamicEventTypes.forEach(typeObj => typeObj.count = 0);
      }
      return;
  }

  // Use the globally updated list of *actually displayed* events for counting
  const eventsToCount = currentlyDisplayedEventsForCount; // Use the filtered list

  if (!eventsToCount || eventsToCount.length === 0) {
      dynamicEventTypes.forEach(typeObj => typeObj.count = 0);
      return;
  }

  dynamicEventTypes.forEach(typeObj => {
      typeObj.count = 0; // Reset count
      const typeLabelNormalized = typeObj.label.trim().toLowerCase();

      eventsToCount.forEach(event => { // Iterate over the filtered list
          if (event.eventTypes && Array.isArray(event.eventTypes)) {
              const matchFound = event.eventTypes.some(eventTypeFromEvent =>
                  eventTypeFromEvent && typeof eventTypeFromEvent === 'string' &&
                  eventTypeFromEvent.trim().toLowerCase() === typeLabelNormalized
              );
              if (matchFound) {
                  typeObj.count++;
              }
          }
      });
  });
}

function applyAllEventsFiltersAndPopulate() {
  let eventsToDisplay = [...masterEventList]; // Start with all fetched (and sorted) events

  // 0. Get current date for default filtering (normalized to start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Date Filtering (Default past events OR Calendar Range)
  if (rangeStart) { // rangeStart is global, set by calendar; if set, calendar filter is active
      const calRangeStart = new Date(rangeStart);
      calRangeStart.setHours(0, 0, 0, 0); // Normalize to start of selected day

      const calRangeEnd = rangeEnd ? new Date(rangeEnd) : new Date(rangeStart); // If no rangeEnd, it's a single day selection
      calRangeEnd.setHours(23, 59, 59, 999); // Normalize to end of selected day

      eventsToDisplay = eventsToDisplay.filter(event => {
          if (!event.airtableFields || !event.airtableFields.Start) return false; // Event must have a start date

          const eventStartDate = new Date(event.airtableFields.Start);
          // If no Airtable End date, consider it a single-day event for range checking.
          // Its effective end is the end of its start day.
          const eventEffectiveEndDate = event.airtableFields.End
                                        ? new Date(event.airtableFields.End)
                                        : new Date(new Date(eventStartDate).setHours(23, 59, 59, 999));

          return eventStartDate <= calRangeEnd && eventEffectiveEndDate >= calRangeStart;
      });
  } else { // Default filter: No calendar range selected, so hide past events
      eventsToDisplay = eventsToDisplay.filter(event => {
          if (!event.airtableFields || !event.airtableFields.Start) return false;

          const eventStartDateObj = new Date(event.airtableFields.Start);
          const eventEndDateObj = event.airtableFields.End ? new Date(event.airtableFields.End) : null;

          if (eventEndDateObj) { // Event has an end date
              return eventEndDateObj >= today; // Show if its end date is today or in the future
          } else { // Event only has a start date (treat as ending on its start day)
              const eventStartDayEnd = new Date(eventStartDateObj);
              eventStartDayEnd.setHours(23, 59, 59, 999); // Consider it to end at the end of its start day
              return eventStartDayEnd >= today; // Show if its start day is today or in the future
          }
      });
  }

  // 2. Search Query Filter
  if (currentSearchQuery) {
      const query = currentSearchQuery.trim().toLowerCase();
      eventsToDisplay = eventsToDisplay.filter(ev =>
          (ev.title && typeof ev.title === 'string' && ev.title.toLowerCase().includes(query)) ||
          (ev.category && typeof ev.category === 'string' && ev.category.toLowerCase().includes(query)) ||
          (ev.address && typeof ev.address === 'string' && ev.address.toLowerCase().includes(query))
      );
  }

  // 3. Type Filters
  const selectedTypes = getSelectedFilterValues('#event-type-panel input[type="checkbox"]:checked', '#mobile-type-list input[type="checkbox"]:checked');
  if (selectedTypes.length > 0) {
      eventsToDisplay = eventsToDisplay.filter(event =>
          event.eventTypes && event.eventTypes.some(et => selectedTypes.includes(et.trim().toLowerCase()))
      );
  }

  // 4. Keyword Filters
  const selectedKeywords = getSelectedFilterValues('#keywords-panel input[type="checkbox"]:checked', '#mobile-keywords-list input[type="checkbox"]:checked');
  if (selectedKeywords.length > 0) {
      eventsToDisplay = eventsToDisplay.filter(event =>
          event.airtableFields.Keywords && Array.isArray(event.airtableFields.Keywords) &&
          event.airtableFields.Keywords.some(kw => selectedKeywords.includes(kw.trim().toLowerCase()))
      );
  }

  // 5. Free/Ticket Filters
  const freeEntryDesktop = document.getElementById('free-entry-btn')?.classList.contains('red');
  const ticketDesktop = document.getElementById('ticket-btn')?.classList.contains('red');
  const freeEntryMobile = document.getElementById('mobile-free-entry')?.checked;
  const ticketMobile = document.getElementById('mobile-ticket')?.checked;

  const wantsFree = freeEntryDesktop || freeEntryMobile;
  const wantsTicket = ticketDesktop || ticketMobile;

  if (wantsFree && !wantsTicket) {
      eventsToDisplay = eventsToDisplay.filter(event => event.airtableFields.Entry && event.airtableFields.Entry.trim().toLowerCase() === 'gratuit');
  } else if (wantsTicket && !wantsFree) {
      eventsToDisplay = eventsToDisplay.filter(event => event.airtableFields.Entry && event.airtableFields.Entry.trim().toLowerCase() !== 'gratuit' && event.airtableFields.Entry.trim() !== '');
  }

  currentlyDisplayedEventsForCount = [...eventsToDisplay];

  populateRecentEvents(eventsToDisplay);
}

function getSelectedFilterValues(desktopSelector, mobileSelector) {
  const desktopChecked = Array.from(document.querySelectorAll(desktopSelector)).map(cb => cb.value.trim().toLowerCase());
  const mobileChecked = Array.from(document.querySelectorAll(mobileSelector)).map(cb => {
      let val = cb.value;
      return val.trim().toLowerCase();
  });
  return [...new Set([...desktopChecked, ...mobileChecked])];
}

let calendarInserted = false;
async function toggleEvents(event) {
  event.preventDefault();

  const isDesktop = !window.matchMedia('(max-width: 550px)').matches;
  if (isDesktop) {
    if (document.getElementById('events-container').style.display === '') {
      document.getElementById('events-container').style.display = 'none';
      resetEventFiltersSimple();
      return;
    } else {
      document.getElementById('events-container').style.display = '';
      closeAboutUs();
      closeArticlesHeader();
      closeArticle();
      closeEngage();
      closeArchive();
      window.location.hash = 'events';
    }
  } else {
    cleanupMobilePanels();
    document.getElementById('events-container').style.display = '';
    window.location.hash = 'events';
  }

  if (!calendarInserted) {
    insertCalendarOnce();
    calendarInserted = true;
  }

  if (!initialEventsFetchPromise) {
    console.warn("Initial event fetch promise not set. Consider calling initiateEventDataFetch() earlier.");
    initialEventsFetchPromise = fetchAndPrepareInitialEventData();
  }
  if (!initialEventTypesFetchPromise) {
    initialEventTypesFetchPromise = fetchAndPrepareEventsFilterData('Event_type', dynamicEventTypes, false);
  }
  if (!initialKeywordsFetchPromise) {
    initialKeywordsFetchPromise = fetchAndPrepareEventsFilterData('Keywords', dynamicKeywords, true);
  }

  try {
    // Wait for all data to be fetched and prepared
    await Promise.all([
      initialEventsFetchPromise,
      initialEventTypesFetchPromise,
      initialKeywordsFetchPromise
    ]);
    applyAllEventsFiltersAndPopulate();
  } catch (error) {
    console.error("Error awaiting initial event fetch in toggleEvents:", error);
  }

  calculateAndAssignEventTypeCounts();

  if (isDesktop) {
    populateTypeDropdown(dynamicEventTypes);
    populateKeywordsPanel(dynamicKeywords);
  } else {
    populateMobileCategories();
  }

  if (isDesktop) {
    [
      { panelId: 'event-type-panel', type: 'tip' },
      { panelId: 'keywords-panel',  type: 'keyword' }
    ].forEach(({ panelId, type }) => {
      const panelElement = document.getElementById(panelId);
      if (panelElement) {
        panelElement.addEventListener('change', e => {
          if (e.target.matches('input[type="checkbox"]')) {
            const pillDisplayText = e.target.value;
            if (e.target.checked) {
              addFilterPill(type, pillDisplayText, e.target.id);
            } else {
              removeFilterPill(type, pillDisplayText);
            }
            applyAllEventsFiltersAndPopulate();
          }
        });
      }
    });
  } else {
      const mobBtn    = document.getElementById('mobile-events-categories-btn');
      const mobPanel  = document.getElementById('mobile-events-categories-panel');
      const mobApply  = document.getElementById('mobile-apply-categories');

      mobBtn.addEventListener('click', () => {
        mobPanel.classList.add('visible');
        const evcont = document.querySelector('.events-container');
        evcont.classList.add('no-scroll');
      });

      const mobClose = document.getElementById('mobile-close-categories'); // Ensure mobClose is defined
      mobClose.addEventListener('click', () => {
        const mobPanel = document.getElementById('mobile-events-categories-panel'); // Ensure mobPanel is accessible
        mobPanel.classList.remove('visible');
        const evcont = document.querySelector('.events-container');
        if (evcont) { // Check if evcont exists
          evcont.classList.remove('no-scroll');
        }
      });

      const mobCancel = document.getElementById('mobile-cancel-categories'); // Ensure mobCancel is defined
      mobCancel.addEventListener('click', () => {
        const mobPanel = document.getElementById('mobile-events-categories-panel'); // Ensure mobPanel is accessible

        // 1. Deselect all checked "Tipul Evenimentelor" checkboxes
        document.querySelectorAll('#mobile-type-list input[type="checkbox"]:checked').forEach(checkbox => {
          checkbox.click(); // .click() will uncheck it AND trigger its change event
        });

        // 2. Deselect all checked "Cuvinte Cheie" checkboxes
        document.querySelectorAll('#mobile-keywords-list input[type="checkbox"]:checked').forEach(checkbox => {
          checkbox.click(); // .click() will uncheck it AND trigger its change event
        });

        // 3. Deselect "Intrare liberă" checkbox if checked
        const mobileFreeEntryCheckbox = document.getElementById('mobile-free-entry');
        if (mobileFreeEntryCheckbox && mobileFreeEntryCheckbox.checked) {
          mobileFreeEntryCheckbox.click(); // .click() will uncheck it AND trigger its change event
        }

        // 4. Deselect "Bilet" checkbox if checked
        const mobileTicketCheckbox = document.getElementById('mobile-ticket');
        if (mobileTicketCheckbox && mobileTicketCheckbox.checked) {
          mobileTicketCheckbox.click(); // .click() will uncheck it AND trigger its change event
        }

        // 5. Finally, close the mobile categories panel
        mobPanel.classList.remove('visible');
        const evcont = document.querySelector('.events-container');
        if (evcont) { // Check if evcont exists
          evcont.classList.remove('no-scroll');
        }
      });

      mobApply.addEventListener('click', () => {
        mobPanel.classList.remove('visible');
        const evcont = document.querySelector('.events-container');
        evcont.classList.remove('no-scroll'); 
      });

      // whenever any of these lists changes, add/remove that pill immediately:
      [
        { selector: '#mobile-type-list',   type: 'tip' },
        { selector: '#mobile-keywords-list', type: 'keyword' },
      ].forEach(({ selector, type }) => {
        document.querySelector(selector)
          .addEventListener('change', e => {
            if (!e.target.matches('input[type=checkbox]')) return;

            let fullLabelText = e.target.nextSibling.textContent.trim(); // e.g., "Seminar (4)"
            let pillLabelText = fullLabelText; // Default to the full text

            const isMobile = window.matchMedia("(max-width: 550px)").matches;

            // Only modify for 'tip' (Event Type) on mobile
            if (isMobile && type === 'tip') {
              const countRegex = /\s*\(\d+\)$/; // Regex to find " (N)" at the end
              const match = fullLabelText.match(countRegex);
              if (match) {
                // If a count is found, take the substring before it
                pillLabelText = fullLabelText.substring(0, match.index).trim();
              }
            }

            if (e.target.checked) {
              addFilterPill(type, pillLabelText, e.target.id);
            } else {
              removeFilterPill(type, pillLabelText);
            }
            refreshDynamicContainer();
            ensureCancelAll();
            applyAllEventsFiltersAndPopulate();
          });
      });

      // free / ticket on mobile:
      document.getElementById('mobile-free-entry')
        .addEventListener('change', e => {
          const label = 'Intrare liberă';
          if (e.target.checked) {
            addFilterPill('free', label, e.target.id);
          } else {
            removeFilterPill('free', label);
          }
          refreshDynamicContainer();
          ensureCancelAll();
          applyAllEventsFiltersAndPopulate();
        });

      document.getElementById('mobile-ticket')
        .addEventListener('change', e => {
          const label = 'Bilet';
          if (e.target.checked) {
            addFilterPill('ticket', label, e.target.id);
          } else {
            removeFilterPill('ticket', label);
          }
          refreshDynamicContainer();
          ensureCancelAll();
          applyAllEventsFiltersAndPopulate();
        });
  }

  // Desktop + mobile
  document.addEventListener('click', (e) => {
    // TYPE panel
    const typeBtn   = document.getElementById('event-type-btn');
    const typePanel = document.getElementById('event-type-panel');
    if (
      typePanel.classList.contains('visible') &&               // only if it’s open
      !typeBtn.contains(e.target) &&                            // click wasn’t on the button
      !typePanel.contains(e.target)                             // nor on the panel itself
    ) {
      toggleTypePanel();
    }
  
    // KEYWORDS panel
    const keyBtn   = document.getElementById('keywords-btn');
    const keyPanel = document.getElementById('keywords-panel');
    if (
      keyPanel.classList.contains('visible') &&
      !keyBtn.contains(e.target) &&
      !keyPanel.contains(e.target)
    ) {
      toggleKeywordsPanel();
    }
  
    // calendar
    const calBtn   = document.getElementById('calendar-btn');
    const calPanel = document.getElementById('calendar-container');
    if (
      calPanel.classList.contains('visible') &&     // only if it's open
      !calBtn.contains(e.target) &&                  // click wasn’t on the button
      !calPanel.contains(e.target)                   // nor in the calendar panel
    ) {
      const confirmBtn = calPanel.querySelector('.calendar-confirm-btn');
      if (confirmBtn) {
        confirmBtn.click();
      } else {
        toggleCalendar();
      }
    }
  });
}

// Calendar state
let currentDate = new Date();
let selectedDate = new Date();
let displayedMonth = currentDate.getMonth();
let displayedYear = currentDate.getFullYear();

// Month names in Romanian
const monthNames = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

// DOM elements
let calendarGrid;
let monthYearDisplay;
let prevMonthBtn;
let nextMonthBtn;
let todayTab;
let tomorrowTab;
let weekendTab;

// Initialize calendar
function initCalendar() {
  calendarGrid = document.getElementById("calendar-grid");
  monthYearDisplay = document.getElementById("month-year");
  prevMonthBtn = document.getElementById("prev-month");
  nextMonthBtn = document.getElementById("next-month");
  todayTab = document.getElementById("today-tab");
  tomorrowTab = document.getElementById("tomorrow-tab");
  weekendTab = document.getElementById("weekend-tab");

  // Set initial month and year to current date
  displayedMonth = currentDate.getMonth();
  displayedYear = currentDate.getFullYear();

  // Update the month-year display
  updateMonthYearDisplay();

  // Generate the calendar grid
  generateCalendar();

  // Add event listeners
  prevMonthBtn.addEventListener("click", goToPreviousMonth);
  nextMonthBtn.addEventListener("click", goToNextMonth);
  todayTab.addEventListener("click", goToToday);
  tomorrowTab.addEventListener("click", goToTomorrow);
  weekendTab.addEventListener("click", goToWeekend);

  // Set today tab as active by default
  todayTab.classList.add("active");
}

// Update month and year display
function updateMonthYearDisplay() {
  monthYearDisplay.textContent = `${monthNames[displayedMonth]} ${displayedYear}`;
}

// Generate calendar grid
function generateCalendar() {
  calendarGrid.innerHTML = "";

  // Get first day of the month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayOfMonth = new Date(
    displayedYear,
    displayedMonth,
    1,
  ).getDay();
  // Adjust for Monday as first day of week (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)
  const firstDayAdjusted =
    firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Get number of days in the month
  const daysInMonth = new Date(
    displayedYear,
    displayedMonth + 1,
    0,
  ).getDate();

  // Get number of days in previous month
  const daysInPrevMonth = new Date(
    displayedYear,
    displayedMonth,
    0,
  ).getDate();

  // Calculate total cells needed (max 6 rows of 7 days)
  const totalCells = 42;

  // Create calendar rows
  let dayCounter = 1;
  let nextMonthCounter = 1;

  for (let row = 0; row < 6; row++) {
    const calendarRow = document.createElement("div");
    calendarRow.className = "calendar-row";

    for (let col = 0; col < 7; col++) {
      const dayCell = document.createElement("div");
      dayCell.className = "calendar-day";

      // Calculate the day to display
      const cellIndex = row * 7 + col;

      if (cellIndex < firstDayAdjusted) {
        // Previous month days
        const prevMonthDay =
          daysInPrevMonth - (firstDayAdjusted - cellIndex - 1);
        dayCell.textContent = prevMonthDay;
        dayCell.classList.add("faded");

        // Add data attributes for date info
        dayCell.dataset.year =
          displayedMonth === 0 ? displayedYear - 1 : displayedYear;
        dayCell.dataset.month =
          displayedMonth === 0 ? 11 : displayedMonth - 1;
        dayCell.dataset.day = prevMonthDay;
      } else if (
        cellIndex >= firstDayAdjusted &&
        dayCounter <= daysInMonth
      ) {
        // Current month days
        dayCell.textContent = dayCounter;

        // Add data attributes for date info
        dayCell.dataset.year = displayedYear;
        dayCell.dataset.month = displayedMonth;
        dayCell.dataset.day = dayCounter;

        // Check if this is today
        const isToday =
          currentDate.getDate() === dayCounter &&
          currentDate.getMonth() === displayedMonth &&
          currentDate.getFullYear() === displayedYear;

        if (isToday) {
          dayCell.classList.add("today");
        }

        // — new range selection highlighting —
        const cellDate = new Date(
          +dayCell.dataset.year,
          +dayCell.dataset.month,
          +dayCell.dataset.day
        );

        // one-day mode: highlight start if no end yet
        if (rangeStart && !rangeEnd) {
          if (cellDate.getTime() === rangeStart.getTime()) {
            dayCell.classList.add("selected");
          }
        }

        // two-click range mode
        if (rangeStart && rangeEnd) {
          // normalize so start ≤ end
          const start = rangeStart < rangeEnd ? rangeStart : rangeEnd;
          const end   = rangeStart < rangeEnd ? rangeEnd   : rangeStart;

          if (cellDate >= start && cellDate <= end) {
            dayCell.classList.add("selected");
          }
        }

        dayCounter++;
      } else {
        // Next month days
        dayCell.textContent = nextMonthCounter;
        dayCell.classList.add("faded");

        // Add data attributes for date info
        dayCell.dataset.year =
          displayedMonth === 11 ? displayedYear + 1 : displayedYear;
        dayCell.dataset.month =
          displayedMonth === 11 ? 0 : displayedMonth + 1;
        dayCell.dataset.day = nextMonthCounter;

        nextMonthCounter++;
      }

      // Add click event to select a date
      dayCell.addEventListener("click", e => {
        e.stopPropagation();
        selectDate(dayCell);
      });

      calendarRow.appendChild(dayCell);
    }

    calendarGrid.appendChild(calendarRow);

    // If we've displayed all days of the current month and filled the row, we can stop
    if (dayCounter > daysInMonth && ((row + 1) * 7) % 7 === 0) {
      break;
    }
  }
  renderRangeBar();
}

let rangeStart = null;
let rangeEnd   = null;

function selectDate(dayCell) {
  const cal = document.getElementById('calendar-container');
  cal.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  // 1) Figure out which date was clicked
  const year  = +dayCell.dataset.year;
  const month = +dayCell.dataset.month;
  const day   = +dayCell.dataset.day;
  const clicked = new Date(year, month, day);

  // 2) Handle range state
  if (!rangeStart || (rangeStart && rangeEnd)) {
    // first click or resetting after a full range
    rangeStart = clicked;
    rangeEnd   = null;
  } else {
    // second click: close out the range
    rangeEnd = clicked;
  }

  // 3) If they clicked a day in another month, move the calendar there
  if (
    clicked.getMonth() !== displayedMonth ||
    clicked.getFullYear() !== displayedYear
  ) {
    displayedMonth = clicked.getMonth();
    displayedYear  = clicked.getFullYear();
    updateMonthYearDisplay();
  }

  // 4) Re-draw, which will pick up rangeStart/rangeEnd and highlight accordingly
  generateCalendar();
}

// Navigation functions
function goToPreviousMonth() {
  displayedMonth--;
  if (displayedMonth < 0) {
    displayedMonth = 11;
    displayedYear--;
  }
  updateMonthYearDisplay();
  generateCalendar();
}

function goToNextMonth() {
  displayedMonth++;
  if (displayedMonth > 11) {
    displayedMonth = 0;
    displayedYear++;
  }
  updateMonthYearDisplay();
  generateCalendar();
}

// Tab functions
function goToToday() {
  // Reset tabs
  const cal = document.getElementById('calendar-container');
  cal.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  todayTab.classList.add("active");

  // Start a new range on today
  const now = new Date();
  rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  rangeEnd   = null;
  displayedMonth = rangeStart.getMonth();
  displayedYear  = rangeStart.getFullYear();

  updateMonthYearDisplay();
  generateCalendar();
}

function goToTomorrow() {
  // Reset tabs
  const cal = document.getElementById('calendar-container');
  cal.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  tomorrowTab.classList.add("active");

  // Start a new range on tomorrow
  const temp = new Date();
  temp.setDate(temp.getDate() + 1);
  rangeStart = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate());
  rangeEnd   = null;
  displayedMonth = rangeStart.getMonth();
  displayedYear  = rangeStart.getFullYear();

  updateMonthYearDisplay();
  generateCalendar();
}

function goToWeekend() {
  // Reset tabs
  const cal = document.getElementById('calendar-container');
  cal.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  weekendTab.classList.add("active");

  // Find the next Saturday
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilWeekend = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;

  const nextWeekend = new Date();
  nextWeekend.setDate(today.getDate() + daysUntilWeekend);

  // Start a new range on that Saturday
  rangeStart = new Date(
    nextWeekend.getFullYear(),
    nextWeekend.getMonth(),
    nextWeekend.getDate()
  );
  rangeEnd   = null;
  displayedMonth = nextWeekend.getMonth();
  displayedYear  = nextWeekend.getFullYear();

  updateMonthYearDisplay();
  generateCalendar();
}

function insertCalendarOnce() {
  const tpl    = document.getElementById('calendar-template');
  const clone  = tpl.content.cloneNode(true);
  const isMobile = window.matchMedia('(max-width: 550px)').matches;

  // pick the correct host
  const host = isMobile
    ? document.querySelector('.filter-bar-mobile')
    : document.querySelector('.filter-bar');

  if (isMobile) {
    const dd = document.getElementById('mobile-categories-dropdown');
    host.insertBefore(clone, dd);
    initCalendar();
    return;
  }

  // find the divider that marks the exact insert spot
  const divider = host.querySelector('.filter-div');
  if (!divider) {
    console.warn('No .filter-div found in host:', host);
    return;
  }

  // inject our one-and-only calendar clone immediately before it
  divider.parentNode.insertBefore(clone, divider);
  initCalendar();
}

function toggleCalendar() {
  const cal = document.getElementById('calendar-container');
  const btn = document.getElementById('calendar-btn');
  const icon = btn.querySelector('.filter-icon');
  const isVisible = cal.classList.toggle('visible');
  const hasSelection = document.querySelectorAll('.calendar-day.selected').length > 0;

  if (window.matchMedia("(max-width: 550px)").matches) {
    const evcont = document.querySelector('.events-container');
    if (isVisible) {
      const mobileNav = document.querySelector('.mobile-nav');
      const filterBarMobile = document.querySelector('.filter-bar-mobile'); // The bar containing #calendar-btn
      if (evcont && filterBarMobile && mobileNav) {
        const mobileNavHeight = mobileNav.offsetHeight;
        // Get current positions relative to the viewport
        const filterBarRect = filterBarMobile.getBoundingClientRect();
        // filterBarRect.top is the current distance of the filter bar's top from the viewport's top.

        // Target viewport Y position for the top of the filter bar:
        // It should be right below the mobileNav, plus an 8px margin.
        const targetViewportYForFilterBar = mobileNavHeight + 8;

        // The amount we need to scroll 'evcont' is the difference between
        // where the filter bar IS (filterBarRect.top) and where we WANT IT to be (targetViewportYForFilterBar),
        // added to the current scroll position of 'evcont'.
        const scrollDelta = filterBarRect.top - targetViewportYForFilterBar;
        const desiredPageScrollY = evcont.scrollTop + scrollDelta;

        // Ensure desiredPageScrollY is not negative (can't scroll beyond the top)
        const scrollToY = Math.max(0, desiredPageScrollY);

        evcont.scrollTo({
          top: scrollToY,
          behavior: 'auto' // or 'auto'
        });
      }
      // only on mobile: append the backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'calendar-backdrop';
      evcont.appendChild(backdrop);
      evcont.classList.add('no-scroll');
    } else {
      document.querySelectorAll('.calendar-backdrop').forEach(el => el.remove());
      evcont.classList.remove('no-scroll');
    }
  }

  if (hasSelection) {
    btn.style.background = '#AD537C';
    btn.style.color = '#F6F4EA';
    btn.classList.add('red'); 
    icon.src = 'CalendarWhite.svg';
    return; 
  } else {
    if (window.matchMedia("(max-width: 550px)").matches) {
      const label  = btn.querySelector(".filter-text");
      label.style.fontSize = '16px'; 
    }
  }

  if (isVisible) {
    cal.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  }
  
  btn.style.background = isVisible ? '#AD537C' : '#FBF6EF';
  btn.style.color = isVisible ? '#F6F4EA' : '#3E1928';
  btn.classList.toggle('red', isVisible); 
  icon.src = isVisible ? 'CalendarWhite.svg' : 'CalendarBlank.svg';
}

function hideCalendar() {
  const cal = document.getElementById('calendar-container');
  cal.classList.remove('visible');
  if (window.matchMedia("(max-width: 550px)").matches) {
    document.querySelectorAll('.calendar-backdrop').forEach(el => el.remove());
    const evcont = document.querySelector('.events-container');
    evcont.classList.remove('no-scroll');
  }
}

function renderRangeBar() {
  const container = document.getElementById("range-bar-container");
  container.innerHTML = "";           // clear old

  // Only show if at least a start date exists
  if (!rangeStart) return;

  // Build date‐only versions so we compare midnight-to-midnight
  const sd = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Determine ordered start/end
  let start = sd(rangeStart);
  let end   = rangeEnd ? sd(rangeEnd) : null;
  if (end && start > end) [start, end] = [end, start];

  // Text: single-date or “start → end”
  const fmt = d =>
    String(d.getDate()).padStart(2, "0") + "." +
    String(d.getMonth() + 1).padStart(2, "0");
  const text = end ? `${fmt(start)} → ${fmt(end)}` : fmt(start);

  const barBtn = document.createElement("button");
  barBtn.type      = "button";
  barBtn.className = "calendar-confirm-btn";
  barBtn.textContent = text;

  // On click: confirm the range
  barBtn.addEventListener("click", () => {
    hideCalendar();  // close the popup

    // Update the main Calendar button
    const calBtn = document.getElementById("calendar-btn");
    const icon   = calBtn.querySelector(".filter-icon");
    const label  = calBtn.querySelector(".filter-text");
    const clr    = calBtn.querySelector(".calendar-clear-btn");

    calBtn.classList.add("red");
    icon.src          = "CalendarWhite.svg";
    label.textContent = text;
    if (window.matchMedia("(max-width: 550px)").matches && end) {
      label.style.fontSize = '14px';
    }

    // Show & wire the “×” icon to clear all
    clr.style.display = "inline";
    clr.onclick = (e) => {
      e.stopPropagation();
      rangeStart = rangeEnd = null;
      calBtn.classList.remove("red");
      calBtn.style.background = '#FBF6EF';
      calBtn.style.color = '#3E1928';
      icon.src          = "CalendarBlank.svg";
      label.textContent = "Calendar";
      label.style.fontSize = '16px';
      clr.style.display = "none";
      document
      .querySelectorAll('.calendar-day.selected')
      .forEach(d => d.classList.remove('selected'));
      const pill = document.querySelector('.calendar-confirm-btn');
      if (pill) pill.remove();
      hideCalendar();
      applyAllEventsFiltersAndPopulate();
      calculateAndAssignEventTypeCounts();
      if (!window.matchMedia('(max-width: 550px)').matches) {
          populateTypeDropdown(dynamicEventTypes);
          populateKeywordsPanel(dynamicKeywords);
      } else {
          populateMobileCategories();
      }
    };

    applyAllEventsFiltersAndPopulate();
    calculateAndAssignEventTypeCounts();
    if (!window.matchMedia('(max-width: 550px)').matches) {
        populateTypeDropdown(dynamicEventTypes);
        populateKeywordsPanel(dynamicKeywords);
    } else {
        populateMobileCategories();
    }
  });

  container.appendChild(barBtn);
}

async function fetchArchiveData() {
  try {
      const response = await fetch('archive.json');
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
  } catch (error) {
      console.error("Could not fetch archive data:", error);
      return [];
  }
}

function createArchiveGallery(galleryDir, entryTitle) {
  const numImages = picsDirToNum[galleryDir] || 0;
  if (numImages === 0) {
      return null;
  }
  if (window.matchMedia("(max-width: 550px)").matches) {
      const galleryContainer = document.createElement('div');
      galleryContainer.className = 'archive-gallery-mobile';

      const mainImageContainer = document.createElement('div');
      mainImageContainer.className = 'main-image';

      const imgElement = document.createElement('img');
      imgElement.src = buildPicPath(galleryDir, 0);
      imgElement.alt = `Imagine principală pentru ${entryTitle}`;

      const counterLabel = document.createElement('div');
      counterLabel.className = 'num-pics-label';
      counterLabel.textContent = `1 / ${numImages}`;

      mainImageContainer.onclick = () => {
          openLightboxMobile(galleryDir);
      };

      mainImageContainer.appendChild(imgElement);
      mainImageContainer.appendChild(counterLabel);
      galleryContainer.appendChild(mainImageContainer);
      return galleryContainer;
  } else {
      const galleryContainer = document.createElement('div');
      galleryContainer.className = 'archive-gallery';

      for (let i = 0; i < numImages; i++) {
          const thumbWrapper = document.createElement('div');
          thumbWrapper.className = 'thumbnail-archive';

          const imgElement = document.createElement('img');
          const imgPath = buildPicPath(galleryDir, i);
          imgElement.src = imgPath;
          imgElement.alt = `Imagine ${i + 1} din galeria pentru ${entryTitle}`;

          imgElement.onclick = () => {
              currentImageDir = galleryDir;
              openLightbox(imgPath, i);
          };

          thumbWrapper.appendChild(imgElement);
          galleryContainer.appendChild(thumbWrapper);
      }
      return galleryContainer;
  }
}

function createArchiveEntryElement(entryData) {
  const entryElement = document.createElement('div');
  entryElement.className = 'archive-entry';

  const marker = document.createElement('div');
  marker.className = 'archive-timeline-marker';

  const content = document.createElement('div');
  content.className = 'archive-content';

  const dateEl = document.createElement('div');
  dateEl.className = 'archive-date';
  dateEl.textContent = entryData.date;

  const titleEl = document.createElement('div');
  titleEl.className = 'archive-title';
  titleEl.textContent = entryData.title;
  
  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'archive-subtitle';
  subtitleEl.textContent = entryData.subtitle;

  const mainImageEl = document.createElement('img');
  mainImageEl.className = 'archive-main-image';
  mainImageEl.src = entryData.mainImage;
  mainImageEl.alt = entryData.title;

  if (window.matchMedia("(max-width: 550px)").matches) {
    mainImageEl.style.cursor = 'pointer';
    mainImageEl.onclick = () => {
        openLightboxMobile(entryData.mainImage);
    };
  }

  const descriptionEl = document.createElement('div');
  descriptionEl.className = 'archive-description';
  entryData.description.forEach(pText => {
      const p = document.createElement('p');
      if (pText.startsWith('!')) {
          p.className = 'archive-subtitle';
          p.innerHTML = pText.substring(1).trim();
      } else {
          p.innerHTML = pText;
      }
      descriptionEl.appendChild(p);
  });
  
  const galleryEl = createArchiveGallery(entryData.galleryDir, entryData.title);

  content.appendChild(dateEl);
  content.appendChild(titleEl);
  content.appendChild(subtitleEl);
  content.appendChild(mainImageEl);
  content.appendChild(descriptionEl);
  if (galleryEl) {
      content.appendChild(galleryEl);
  }
  
  entryElement.appendChild(marker);
  entryElement.appendChild(content);

  return entryElement;
}

async function populateArchivePage() {
  const archiveData = await fetchArchiveData();
  const timelineContainer = document.querySelector('#archive-container .archive-timeline');
  
  if (!timelineContainer) {
      console.error('Archive timeline container not found!');
      return;
  }

  timelineContainer.innerHTML = ''; // Clear any previous content

  if (archiveData && archiveData.length > 0) {
      archiveData.forEach(entry => {
          const entryElement = createArchiveEntryElement(entry);
          timelineContainer.appendChild(entryElement);
      });
  } else {
      timelineContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Arhiva este momentan goală.</p>';
  }
}

let archiveLoaded = false;
async function toggleArchive(event) {
  event.preventDefault();

  const archiveContainer = document.getElementById('archive-container');
  const isDesktop = !window.matchMedia('(max-width: 550px)').matches;

  if (isDesktop && (archiveContainer.style.display === '' || archiveContainer.style.display === 'block')) {
      closeArchive();
      return;
  }

  if (isDesktop) {
    closeAboutUs();
    closeArticlesHeader();
    closeArticle();
    closeEngage();
    closeEvents();
  } else {
    closeMobileMenu();
  }
  archiveContainer.style.display = '';
  window.location.hash = 'archive';

  setActiveDesktopLink('archive-link');

  if (!archiveLoaded) {
    await populateArchivePage();
    archiveLoaded = true;
  }
}

function closeArchive() {
  document.getElementById('archive-container').style.display = 'none';
  window.location.hash = '';
  document.getElementById('archive-link').style.color = '#25121B';
}

function slugify(text) {
  if (typeof text !== 'string') text = String(text); // Ensure text is a string
  // Basic diacritic folding for common Romanian characters
  const diacriticsMap = {
    'ă': 'a', 'Ă': 'A', 'â': 'a', 'Â': 'A', 'î': 'i', 'Î': 'I',
    'ș': 's', 'Ș': 'S', 'ț': 't', 'Ț': 'T'
  };
  return text.toString().toLowerCase()
    .replace(/[ăâîșțĂÂÎȘȚ]/g, char => diacriticsMap[char.toLowerCase()] || char) // Fold diacritics
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')       // Remove all non-word chars (except hyphen)
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// — 2) Renders the checkboxes into #type-panel —
function populateTypeDropdown(items, containerId = 'event-type-panel') {
  const panel = document.getElementById(containerId);
  panel.innerHTML = '';       // clear out old
  items.forEach(item => {
    const labelElement = document.createElement('label'); // Renamed to avoid conflict
    labelElement.className = 'dropdown-option';

    const cb = document.createElement('input');
    cb.type  = 'checkbox';
    cb.value = item.label;
    cb.id    = `${slugify(item.label)}-id`; // e.g., "proiectie-de-film-id"

    labelElement.appendChild(cb);
    labelElement.appendChild(
      document.createTextNode(` ${item.label} (${item.count})`)
    );
    panel.appendChild(labelElement);
  });
}

function updateDropdownButtonState(btnId, panelId) {
  const btn       = document.getElementById(btnId);
  const panel     = document.getElementById(panelId);
  const icon      = btn.querySelector('.dropdown-icon');
  const isOpen    = panel.classList.contains('visible');
  const anyChecked = !!panel.querySelector('input[type="checkbox"]:checked');

  if (isOpen) {
    // Panel open → white text + red background + up–caret (which is WHITE)
    btn.style.background ='#AD537C';
    btn.style.color = '#F6F4EA';
    icon.src        = 'CaretUp.svg';
    btn.classList.add('red');
    icon.style.transform = '';
  } else if (anyChecked) {
    // Closed but something selected → white text + red background + down–caret WHITE
    btn.style.background ='#AD537C';
    btn.style.color = '#F6F4EA';
    icon.src        = 'CaretUp.svg';
    icon.style.transform = 'rotate(180deg)';
    btn.classList.add('red');
  } else {
    // Closed + nothing selected → black text + defaut background + down–caret BLACK
    btn.style.background ='#FBF6EF';
    btn.style.color = '#3E1928';
    icon.src        = 'CaretDown.svg';
    icon.style.transform = '';
    btn.classList.remove('red');
  }
}

function toggleTypePanel() {
  const panel = document.getElementById('event-type-panel');
  panel.classList.toggle('visible');
  updateDropdownButtonState('event-type-btn', 'event-type-panel');
}

function normalizeStringForSort(str) {
  if (typeof str !== 'string') return '';
  return str.normalize('NFC').toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/[î]/g, 'i')
    .replace(/[ș]/g, 's')
    .replace(/[ț]/g, 't')
    .trim();
}
// Populate the keywords panel just like event‑type
function populateKeywordsPanel(items, containerId = 'keywords-panel') {
  const panel = document.getElementById(containerId);
  panel.innerHTML = '';

  const sortedItems = [...items].sort((a, b) => {
    const normA = normalizeStringForSort(a);
    const normB = normalizeStringForSort(b);

    if (normA < normB) return -1;
    if (normA > normB) return 1;
    return String(a).localeCompare(String(b), 'ro', { sensitivity: 'base' });
  });

  sortedItems.forEach(item => {
    const label = document.createElement('label');
    label.className = 'dropdown-option';

    const cb = document.createElement('input');
    cb.type  = 'checkbox';
    cb.value = item;
    cb.id    = `${containerId}-kw-${item}`;

    label.appendChild(cb);
    label.appendChild(
      document.createTextNode(`${item}`)
    );

    cb.addEventListener('change', () => {
      label.classList.toggle('selected', cb.checked);
    });

    panel.appendChild(label);
  });
}

function toggleKeywordsPanel() {
  const panel = document.getElementById('keywords-panel');
  panel.classList.toggle('visible');
  updateDropdownButtonState('keywords-btn', 'keywords-panel');
}

const eventTypePanelEl = document.getElementById('event-type-panel');
if (eventTypePanelEl) {
  eventTypePanelEl.addEventListener('change', e => {
    if (e.target.matches('input[type="checkbox"]')) {
      updateDropdownButtonState('event-type-btn', 'event-type-panel');
    }
  });
}

const keywordsPanelEl = document.getElementById('keywords-panel');
if (keywordsPanelEl) {
  keywordsPanelEl.addEventListener('change', e => {
    if (e.target.matches('input[type="checkbox"]')) {
      updateDropdownButtonState('keywords-btn', 'keywords-panel');
    }
  });
}

function populateMobileCategories() {
  document.getElementById('mobile-type-list').innerHTML     = '';
  document.getElementById('mobile-keywords-list').innerHTML = '';
  
  // reuse desktop populator with custom panel IDs
  populateTypeDropdown(dynamicEventTypes,    'mobile-type-list');
  populateKeywordsPanel(dynamicKeywords,     'mobile-keywords-list');
}

function populateRecentEvents(events) {
  const countEl = document.getElementById('results-count');
  const container = document.getElementById('recent-events-container');
  container.innerHTML = '';             // clear old
  countEl.textContent = currentLang === 'ro' ? `${events.length} rezultate` : `${events.length} results`;

  events.forEach(ev => {
    // build the <article class="event-card">…
    const art = document.createElement('article');
    art.className = 'event-card';
    art.onclick = () => openEventDetailPanel(ev.title);

    if (window.matchMedia("(max-width: 550px)").matches && ev.title.length > 50) {
      art.style.height = '350px';
    }

    art.innerHTML = `
      <img
        src="${ev.image}"
        class="event-image"
        alt="Imagine eveniment: ${ev.title}"
      />
      <section class="event-details">
        <div class="event-info">
          <div class="event-content">
            <p class="event-category">${ev.category}</p>
            <h2 class="event-title">${ev.title}</h2>
            <div class="event-location">
              <img
                src="Pin.svg"
                class="location-icon"
                alt="icon locație"
              />
              <p class="location-address">${ev.address}</p>
            </div>
          </div>
        </div>
        <time class="event-time">${ev.time}</time>
      </section>
    `;

    container.appendChild(art);
  });
}

// Renders the "Spațiul gazdă" (host space) section of the event detail panel
// for the given event's raw fields. Factored out of openEventDetailPanel so
// it can be re-run on its own once nameToFeature is populated, without
// re-running (and visually resetting) the rest of the panel -- see
// evenimente.html's fetchObiectiveForEventOrganizerInfo, which populates
// nameToFeature asynchronously and may resolve after the panel already
// rendered with it empty.
function renderEventOrganizerSection(fields) {
  const organizerSectionTitleEl = document.getElementById('eventDetailOrgSectionTitle');
  const organizerSectionEl = document.querySelector('.event-detail-organizer');

  // "Spațiul gazdă" only makes sense for a single, unambiguous host -- an
  // event with several Location selections hides the section entirely
  // rather than showing just one of them as if it were the host.
  if (!fields.Location || fields.Location.length !== 1) {
      if (organizerSectionTitleEl) organizerSectionTitleEl.style.display = 'none';
      if (organizerSectionEl) organizerSectionEl.style.display = 'none';
      return;
  }
  if (organizerSectionTitleEl) organizerSectionTitleEl.style.display = '';
  if (organizerSectionEl) organizerSectionEl.style.display = '';

  const organizerNameEl = document.getElementById('eventDetailOrganizerName');
  const organizerDescriptionEl = document.getElementById('eventDetailOrganizerDescription');
  const organizerSocialLinksEl = document.getElementById('eventDetailOrganizerSocialLinks');

  // Organizer Details
  const organizerLocationName = fields.Location[0];
  const organizerFeature = nameToFeature ? nameToFeature[organizerLocationName] : null;

  const handleOrganizerDirectReadMore = () => {
    if (organizerLocationName && nameToFeature[organizerLocationName]) {
        const featureToOpen = nameToFeature[organizerLocationName];
        closeEventDetailPanel();
        if (typeof closeEvents === 'function') {
            closeEvents();
        }

        openPin(featureToOpen);
        if (featureToOpen.properties[`Descriere_${currentLang}`]) {
            openReadMore(organizerLocationName);
        }
    } else {
        console.warn("Organizer feature not found for click interaction:", organizerLocationName);
    }
  };

  if (organizerFeature) {
      organizerNameEl.textContent = currentLang === 'ro' ? `Descoperă ${organizerLocationName}` : `Discover ${organizerLocationName}`;
      organizerNameEl.href = "#";

      const orgDescKey = `Descriere_${currentLang}`;
      const organizerDescTextSpan = document.getElementById('organizerDescriptionTextPreview');
      const organizerArrowIcon = organizerDescriptionEl ? organizerDescriptionEl.querySelector('.organizer-description-arrow-icon') : null;

      const fullOrganizerDesc = (organizerFeature.properties[orgDescKey]) ? organizerFeature.properties[orgDescKey].split('\n')[0] : "";
      const organizerPreviewLength = window.matchMedia("(max-width: 550px)").matches ? 150 : 250;

      if (organizerDescTextSpan && organizerArrowIcon) {
          if (fullOrganizerDesc && fullOrganizerDesc.length > organizerPreviewLength) {
              organizerDescTextSpan.textContent = fullOrganizerDesc.substring(0, organizerPreviewLength).trim() + "...";
              organizerArrowIcon.style.display = 'inline-block';
          } else if (fullOrganizerDesc) {
              organizerDescTextSpan.textContent = fullOrganizerDesc;
              organizerArrowIcon.style.display = 'none';
          } else {
              organizerDescTextSpan.textContent = (currentLang === 'ro' ? "Mai multe detalii în curând." : "More details soon.");
              organizerArrowIcon.style.display = 'none';
          }
      } else if (organizerDescTextSpan) {
           organizerDescTextSpan.textContent = fullOrganizerDesc || (currentLang === 'ro' ? "Mai multe detalii în curând." : "More details soon.");
      }

      const organizerNameLineEl = organizerNameEl.closest('.organizer-name-line');
      if (organizerNameLineEl) {
          organizerNameLineEl.style.cursor = 'pointer';
          organizerNameLineEl.onclick = handleOrganizerDirectReadMore;
          // Prevent the <a> tag's default navigation since the parent div handles the click
          organizerNameEl.onclick = (e) => {
              e.preventDefault();
          };
      } else if (organizerNameEl) { // Fallback if only the name element itself is targeted
          organizerNameEl.style.cursor = 'pointer';
          organizerNameEl.onclick = (e) => {
              e.preventDefault();
              handleOrganizerDirectReadMore();
          };
      }

      if (organizerDescriptionEl) { // This is the <p> tag
          organizerDescriptionEl.style.cursor = 'pointer';
          organizerDescriptionEl.onclick = handleOrganizerDirectReadMore;
      }

      organizerSocialLinksEl.innerHTML = '';
      const socialPlatforms = [
          { idPrefix: 'eventOrganizerSite', field: 'Site', icon: 'Site.svg', textKey: 'site'},
          { idPrefix: 'eventOrganizerInsta', field: 'Insta', icon: 'Instagram.svg', textKey: 'instagram'},
          { idPrefix: 'eventOrganizerFb', field: 'FB', icon: 'Facebook.svg', textKey: 'facebook'},
          { idPrefix: 'eventOrganizerMaps', field: 'Gmaps', icon: 'Maps.svg', textKey: 'googleMaps'}
      ];
      socialPlatforms.forEach(platform => {
          if (organizerFeature.properties[platform.field] && organizerFeature.properties[platform.field].trim() !== "") {
              const linkElement = document.createElement('a');
              linkElement.className = 'read-more-social-link';
              linkElement.id = `${platform.idPrefix}Link`;
              linkElement.href = fixLinkIfNeeded(organizerFeature.properties[platform.field]);
              linkElement.target = '_blank';
              linkElement.rel = 'noopener noreferrer';
              linkElement.innerHTML = `<div class="read-more-social-icon"><img src="${platform.icon}" alt="${platform.field}"></div>`;
              organizerSocialLinksEl.appendChild(linkElement);
          }
      });
  } else { // Fallback if organizerFeature is not found
      organizerNameEl.textContent = organizerLocationName || (currentLang === 'ro' ? "Spațiul gazdă" : "Host");
      organizerNameEl.removeAttribute('href');
      organizerNameEl.onclick = null; // No click action if no feature

      const organizerDescTextSpanUnavailable = document.getElementById('organizerDescriptionTextPreview');
      const organizerArrowIconUnavailable = organizerDescriptionEl ? organizerDescriptionEl.querySelector('.organizer-description-arrow-icon') : null;

      // No map feature matched the event's host location (name mismatch, or
      // the space just isn't a mapped location), but it might still have a
      // standalone profile article -- link to that instead of a dead end.
      const organizerArticleSlug = organizerLocationName ? ARTICLE_NAME_TO_SLUG[organizerLocationName] : null;

      if (organizerDescTextSpanUnavailable) {
          if (organizerArticleSlug) {
              organizerDescTextSpanUnavailable.innerHTML = '';
              const organizerArticleLink = document.createElement('a');
              organizerArticleLink.href = `articol-${organizerArticleSlug}.html`;
              organizerArticleLink.className = 'link-decorator';
              organizerArticleLink.textContent = currentLang === 'ro' ? 'Citește articolul despre spațiul gazdă' : 'Read the article about the host space';
              organizerDescTextSpanUnavailable.appendChild(organizerArticleLink);
          } else {
              organizerDescTextSpanUnavailable.textContent = currentLang === 'ro' ? "Detalii despre spațiul gazdă indisponibile." : "Host details unavailable.";
          }
      }
      if (organizerArrowIconUnavailable) {
          organizerArrowIconUnavailable.style.display = 'none';
      }

      organizerSocialLinksEl.innerHTML = '';
  }
}

function openEventDetailPanel(eventTitle) {
  // Find the event data from masterEventList
  const eventData = masterEventList.find(event => event.title === eventTitle && event.airtableFields);
  if (!eventData) {
      console.error("Event data not found for title:", eventTitle);
      return;
  }
  currentOpenEventData = eventData; // Store for use in toggleEventDescription
  const fields = eventData.airtableFields; // Raw Airtable fields

  if (eventData.title) {
    window.location.hash = `event-${slugify(eventData.title)}`;
  }

  const panel = document.getElementById('eventDetailPanel');
  const headerImageDiv = document.getElementById('eventDetailHeaderImage');
  const categoriesDiv = document.getElementById('eventDetailCategories');
  const titleEl = document.getElementById('eventDetailTitle');
  const quoteEl = document.getElementById('eventDetailQuote');
  const locationTextEl = document.getElementById('eventDetailLocationText');
  const dateTimeTextEl = document.getElementById('eventDetailDateTimeText');
  
  const ticketButtonContainerEl = document.getElementById('eventDetailTicketButtonContainer');
  const ticketButtonEl = document.getElementById('eventDetailTicketButton');

  const relatedEventsContainer = document.getElementById('eventDetailRelatedEvents');

  const datetimeOriginalContentEl = dateTimeTextEl.parentNode;

  // 1. Header Image
  const imageUrl = (fields.Picture && fields.Picture.length > 0 && fields.Picture[0].url)
                 ? fields.Picture[0].url
                 : 'https://placehold.co/717x361/EAAAC8/EAAAC8'; 
  headerImageDiv.style.backgroundImage = `url('${imageUrl}')`;
  if (imageUrl.startsWith('http')) { // Only make it clickable if it's a real image
    headerImageDiv.style.cursor = 'pointer';

    // For Desktop Lightbox: call openLightbox() with totalImages = 1
    const desktopClickHandler = () => openLightbox(imageUrl, 0, 1);
    
    // For Mobile Lightbox: call openLightboxMobile() with the direct URL
    const mobileClickHandler = () => openLightboxMobile(imageUrl);

    if (!window.matchMedia("(max-width: 550px)").matches) {
        headerImageDiv.onclick = desktopClickHandler;
    } else {
        headerImageDiv.onclick = mobileClickHandler;
    }
  } else {
    // If it's a placeholder, make sure it's not clickable
    headerImageDiv.onclick = null;
    headerImageDiv.style.cursor = 'default';
  }

  // 2. Categories/Tags
  categoriesDiv.innerHTML = ''; 
  const eventTypes = fields.Event_type || []; 
  const entryType = fields.Entry ? fields.Entry.trim() : '';
  if (entryType.toLowerCase() === 'bilet' || (entryType.toLowerCase() !== 'gratuit' && entryType !== '')) {
       const ticketTag = document.createElement('span');
       ticketTag.className = 'category-tag';
       ticketTag.textContent = currentLang === 'ro' ? 'BILET' : 'TICKET';
       categoriesDiv.appendChild(ticketTag);
  } else if (entryType.toLowerCase() === 'gratuit') {
       const freeTag = document.createElement('span');
       freeTag.className = 'category-tag';
       freeTag.textContent = currentLang === 'ro' ? 'INTRARE LIBERĂ' : 'FREE ENTRY';
       categoriesDiv.appendChild(freeTag);
  }
  eventTypes.forEach(type => {
      const tag = document.createElement('span');
      tag.className = 'category-tag';
      tag.textContent = type.toUpperCase(); 
      categoriesDiv.appendChild(tag);
  });

  // 3. Title and Quote
  titleEl.textContent = fields.Title || "N/A";
  const fullDescriptionForQuote = fields.Description_ro || fields.Description || ""; 
  const quoteMatch = fullDescriptionForQuote.match(/^“.*?”/);
  if (fields.Quote_ro || fields.Quote) { 
      quoteEl.textContent = fields.Quote_ro || fields.Quote;
      quoteEl.style.display = 'block';
  } else if (quoteMatch) {
      quoteEl.textContent = quoteMatch[0];
      quoteEl.style.display = 'block';
  } else {
      quoteEl.style.display = 'none';
  }

  // 4. Location, Date/Time
  if (locationTextEl) {
    locationTextEl.textContent = fields.Location.length ? fields.Location.join(', ') : "N/A";
    // Click opens the pin on the map, which can only show one feature --
    // when an event has multiple locations, this targets the first one
    // (same convention as the "Spațiul gazdă" section below).
    const locationNameForPinInteraction = fields.Location[0] || null;

    locationTextEl.style.cursor = 'pointer';
    locationTextEl.onclick = null;
    locationTextEl.onclick = () => {
        if (locationNameForPinInteraction && nameToFeature[locationNameForPinInteraction]) {
            const featureToOpen = nameToFeature[locationNameForPinInteraction];

            closeEventDetailPanel();
            if (typeof closeEvents === 'function') {
                closeEvents();
            }

            if (typeof openPin === 'function') {
                openPin(featureToOpen); // This shows the map card
            }
        } else {
            console.warn("Location feature not found for click interaction:", locationNameForPinInteraction);
        }
    };
  }
  dateTimeTextEl.textContent = formatEventDateTime(fields.Start, fields.End); 

  // 5. Ticket Button 
  if (ticketButtonContainerEl && ticketButtonEl) { 
    if (fields.Ticket_details && fields.Ticket_details.trim() !== "") {
        const ticketUrl = fields.Ticket_details.trim();
        ticketButtonEl.href = ticketUrl.startsWith('http') ? ticketUrl : `http://${ticketUrl}`;
        ticketButtonEl.textContent = currentLang === 'ro' ? 'Cumpără bilet' : 'Buy Ticket';
        
        if (!ticketUrl.toLowerCase().includes('http://') && !ticketUrl.toLowerCase().includes('https://') && !ticketUrl.toLowerCase().includes('www.')) {
             ticketButtonEl.textContent = ticketUrl; 
             ticketButtonEl.removeAttribute('href');
             ticketButtonEl.removeAttribute('target'); 
        } else {
            ticketButtonEl.setAttribute('target', '_blank'); 
        }
        ticketButtonContainerEl.style.display = 'block'; 
    } else {
        ticketButtonContainerEl.style.display = 'none'; 
    }
  }

  if (datetimeOriginalContentEl) { 
    if (ticketButtonContainerEl && ticketButtonContainerEl.style.display === 'block') {
        datetimeOriginalContentEl.style.marginBottom = '16px';
    } else {
        datetimeOriginalContentEl.style.marginBottom = '0px';
    }
  }

  const descriptionContainer = document.getElementById('eventDetailDescription');
  const descriptionReadMoreBtn = document.getElementById('eventDetailDescReadMoreBtn');

  // Temporarily disconnect the button so it doesn't get overwritten by innerHTML changes
  if (descriptionReadMoreBtn) {
      descriptionReadMoreBtn.remove();
      descriptionReadMoreBtn.style.display = 'none';
      descriptionReadMoreBtn.removeAttribute('data-state');
  }

  // Clear previous paragraphs and data attributes
  if (descriptionContainer) {
      descriptionContainer.innerHTML = '';
      delete descriptionContainer.dataset.previewHtml;
      delete descriptionContainer.dataset.fullHtml;
  }

  const descText = fields.Description_ro || fields.Description || "";
  const lang = typeof currentLang !== 'undefined' ? currentLang : 'ro';
  const defaultNoDescText = lang === 'ro' ? "Nicio descriere disponibilă." : "No description available.";

  if (!descText.trim()) {
      if (descriptionContainer) {
          descriptionContainer.innerHTML = `<p>${defaultNoDescText}</p>`;
      }
  } else {
      const paragraphs = descText.split(/\n\s*\n+|\n\n+/).map(pText => pText.trim()).filter(pText => pText.length > 0);
      const fullHtml = paragraphs.map(p => `<p>${p.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`).join('');
      const previewCharLimit = 500;

      if (descText.length <= previewCharLimit || paragraphs.length < 1) {
          descriptionContainer.innerHTML = fullHtml || `<p>${descText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
      } else {
          let visibleHtml = '';
          let charCount = 0;
          for (const p of paragraphs) {
              if ((charCount + p.length) > previewCharLimit && charCount > 0) {
                  const remainingChars = previewCharLimit - charCount;
                  const visiblePart = p.substring(0, remainingChars > 3 ? remainingChars - 3 : 0);
                  const pElement = document.createElement('p');
                  pElement.textContent = visiblePart + '...';
                  visibleHtml += pElement.outerHTML;
                  break;
              } else {
                  const pElement = document.createElement('p');
                  pElement.textContent = p;
                  visibleHtml += pElement.outerHTML;
                  charCount += p.length;
              }
          }

          descriptionContainer.innerHTML = visibleHtml;
          descriptionContainer.dataset.previewHtml = visibleHtml;
          descriptionContainer.dataset.fullHtml = fullHtml;

          if (descriptionReadMoreBtn) {
              descriptionContainer.appendChild(descriptionReadMoreBtn); // Append button back INSIDE the div
              descriptionReadMoreBtn.style.display = 'block';
              descriptionReadMoreBtn.textContent = lang === 'ro' ? 'Continuați să citiți' : 'Read more';
              descriptionReadMoreBtn.setAttribute('data-state', 'truncated');
          }
      }
  }

  renderEventOrganizerSection(fields);

  // Related Events
  populateRelatedEvents(eventData, relatedEventsContainer);

  // Show the panel and scroll content to top
  panel.classList.add('visible');
  const contentWrapper = panel.querySelector('.event-detail-content-wrapper');
  if(contentWrapper) {
    contentWrapper.scrollTop = 0;
  }
  panel.scrollTop = 0;

}

