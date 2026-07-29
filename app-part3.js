function closeEventDetailPanel() {
  const panel = document.getElementById('eventDetailPanel');
  panel.classList.remove('visible');
  document.body.style.overflow = '';
  const contentWrapper = panel.querySelector('.event-detail-content-wrapper');
  if(contentWrapper) contentWrapper.scrollTop = 0;
  if (window.location.hash.startsWith('#event-')) {
    if (document.getElementById('events-container').style.display !== 'none') {
        window.location.hash = 'events';
    }
  }
  currentOpenEventData = null;
}

function toggleEventDescriptionFull(button) {
  const descriptionContainer = document.getElementById('eventDetailDescription');
  if (!descriptionContainer || !button) return;

  const currentState = button.getAttribute('data-state');
  const lang = typeof currentLang !== 'undefined' ? currentLang : 'ro';

  // Set the new HTML content first
  if (currentState === 'truncated') {
      descriptionContainer.innerHTML = descriptionContainer.dataset.fullHtml || '';
      button.textContent = lang === 'ro' ? 'Citește mai puțin' : 'Read less';
      button.setAttribute('data-state', 'expanded');
  } else {
      descriptionContainer.innerHTML = descriptionContainer.dataset.previewHtml || '';
      button.textContent = lang === 'ro' ? 'Continuați să citiți' : 'Read more';
      button.setAttribute('data-state', 'truncated');
  }

  // After setting the HTML, append the button back inside.
  // This ensures it's always the last element and inside the border.
  descriptionContainer.appendChild(button);
}

function populateRelatedEvents(currentEventData, container) {
  const relatedSectionWrapper = container ? container.parentNode : null;
  if (!relatedSectionWrapper) {
      console.error("Related events section wrapper not found.");
      if (container) container.innerHTML = ''; // Clear if only container exists
      return;
  }
  container.innerHTML = ''; // Clear previous cards

  if (!masterEventList || masterEventList.length === 0 || !currentEventData || !currentEventData.eventTypes) {
      relatedSectionWrapper.style.display = 'none'; // Hide the whole section
      return;
  }

  const currentEventTypes = currentEventData.eventTypes.map(type => type.trim().toLowerCase());
  const currentEventTitle = currentEventData.title;

  const related = masterEventList.filter(event => {
      if (event.title === currentEventTitle) return false; 
      if (!event.eventTypes || event.eventTypes.length === 0) return false;
      
      const eventTypesNormalized = event.eventTypes.map(type => type.trim().toLowerCase());
      return eventTypesNormalized.some(type => currentEventTypes.includes(type));
  }).slice(0, 3); 

  const todayForRelated = new Date();
  todayForRelated.setHours(0, 0, 0, 0);

  const futureRelatedEvents = related.filter(event => {
      if (!event.airtableFields || !event.airtableFields.Start) return false;

      const eventStartDateObj = new Date(event.airtableFields.Start);
      const eventEndDateObj = event.airtableFields.End ? new Date(event.airtableFields.End) : null;

      if (eventEndDateObj) {
          return eventEndDateObj >= todayForRelated;
      } else {
          const eventStartDayEnd = new Date(eventStartDateObj);
          eventStartDayEnd.setHours(23, 59, 59, 999);
          return eventStartDayEnd >= todayForRelated;
      }
  });

  if (futureRelatedEvents.length === 0) {
    relatedSectionWrapper.style.display = 'none'; // Hide the whole section if no related events
    return;
  }

  relatedSectionWrapper.style.display = 'block'; // Show the whole section if there are related events

  futureRelatedEvents.forEach(event => {
      const card = document.createElement('a'); 
      card.className = 'event-card'; 
      card.href = '#'; 
      card.onclick = (e) => {
          e.preventDefault();
          const detailPanel = document.getElementById('eventDetailPanel');
          if (detailPanel) {
              const contentWrapper = detailPanel.querySelector('.event-detail-content-wrapper');
              if (contentWrapper) {
                  contentWrapper.scrollTop = 0;
              } else {
                  detailPanel.scrollTop = 0; 
              }
          }
          openEventDetailPanel(event.title); 
      };
      if (window.matchMedia("(max-width: 550px)").matches && event.title.length > 50) {
        card.style.height = '350px';
      }

      const imageUrl = event.image || 'https://placehold.co/284x180/EAAAC8/EAAAC8';
      const location = event.address || "N/A";
      const time = event.time || "N/A";

      card.innerHTML = `
          <img src="${imageUrl}" alt="Imagine eveniment: ${event.title}" class="event-image">
          <section class="event-details">
              <div class="event-info">
                  <div class="event-content">
                      <p class="event-category">${event.category.toUpperCase()}</p>
                      <h2 class="event-title">${event.title}</h2>
                      <div class="event-location">
                          <img
                              src="Pin.svg"
                              class="location-icon"
                              alt="icon locație"
                          />
                          <p class="location-address">${location}</p>
                      </div>
                  </div>
              </div>
              <time class="event-time">${time}</time>
          </section>
      `;
      container.appendChild(card);
  });
}

function handleEventsSearch(e) {
  currentSearchQuery = e.target.value;
  applyAllEventsFiltersAndPopulate();
}

function toggleAboutUsDesktop(event) {
  event.preventDefault();
  if (isAboutUsDesktopOpen()) {
    closeAboutUs();
  } else {
    openAboutUs();
  }
}

function isAboutUsDesktopOpen() {
  const el = document.querySelector('.about-us-container');
  if (!el) return false;
  return el.style.display === 'none' ? false : true;
}

function openAboutUs() {
  document.getElementById('sidePanel').style.display = 'none';
  document.querySelector('.about-us-container').style.display = '';
  document.getElementById('about-us-link').style.color = '#AD537C';
  if ((isArticlesHeaderOpen() || isEngageOpen()) &&
  (isSidePanelClosed() && !wasSidePanelClosedArticles
  || !isSidePanelClosed() && wasSidePanelClosedArticles
  ||  isSidePanelClosed() && !wasSidePanelClosedEngage
  || !isSidePanelClosed() && wasSidePanelClosedEngage)) {
    toggleSidePanel();
  }
  closeArticlesHeader();
  closeEngage();
  closeArticle();
  closeEvents();
  closeEventDetailPanel();
  closeArchive();
  window.location.hash = "about-us";
  var characterImage = document.getElementById('characterGif');
  setTimeout(function() {
    characterImage.src = 'tomita.png';
  }, 1060);
  document.getElementById('partners').src = "partners.png";
}

function closeAboutUs() {
  document.getElementById('sidePanel').style.display = 'flex';
  document.querySelector('.about-us-container').style.display = 'none';
  document.getElementById('about-us-link').style.color = '#25121B';
  var characterImage = document.getElementById('characterGif');
  characterImage.src = 'tomita.gif';
  history.replaceState(null, null, ' ');
}


function expandOrCloseMobileMenu() {
  document.querySelector('.mobile-nav').classList.toggle('mobile-nav-active');
  document.querySelector('.mobile-nav-title').classList.toggle('mobile-nav-active');
  document.querySelector('.mobile-nav-subtitle').classList.toggle('mobile-nav-active');

  var menuButton = document.querySelector('.mobile-menu-button');
  if (menuButton.querySelector('img')) {
    // If image is displayed, replace with text
    const closeBtnTxt = currentLang === 'ro' ? 'ÎNCHIDE' : 'CLOSE';
    menuButton.innerHTML = `<span style="font-family: IBM Plex Sans; font-size: 16px; font-weight: 400; line-height: 20.8px; text-align: left; color: #F6F4EA;">${closeBtnTxt}</span>`;
  } else {
    // If text is displayed, replace with image
    menuButton.innerHTML = '<img src="hamburger-menu.svg">';
  }

  var mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu.style.display === 'flex') {
    mobileMenu.style.display = 'none';
    closeEngage();
  } else {
    mobileMenu.style.display = 'flex';
  }
}

function closeMobileMenu() {
  document.querySelector('.mobile-nav').classList.remove('mobile-nav-active');
  document.querySelector('.mobile-nav-title').classList.remove('mobile-nav-active');
  document.querySelector('.mobile-nav-subtitle').classList.remove('mobile-nav-active');
  var menuButton = document.querySelector('.mobile-menu-button');
  menuButton.innerHTML = '<img src="hamburger-menu.svg">';
  var mobileMenu = document.querySelector('.mobile-menu');
  mobileMenu.style.display = 'none';
  document.querySelector('.about-us-container').style.display = 'none';
  closeMobilePanel();
  closeEngage();
  closeArticle();
  closeEvents();
  closeEventDetailPanel();
  closeArchive();
  closeMobileArticlesPage();
  document.getElementById('events-container').style.display = 'none';
}

function cleanupMobilePanels() {
  document.querySelector('.mobile-nav').classList.remove('mobile-nav-active');
  document.querySelector('.mobile-nav-title').classList.remove('mobile-nav-active');
  document.querySelector('.mobile-nav-subtitle').classList.remove('mobile-nav-active');
  var menuButton = document.querySelector('.mobile-menu-button');
  if (menuButton) {
      menuButton.innerHTML = '<img src="hamburger-menu.svg">';
  }

  const mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu) mobileMenu.style.display = 'none';

  const aboutUs = document.querySelector('.about-us-container');
  if (aboutUs) aboutUs.style.display = 'none';

  const sidePanel = document.getElementById('sidePanel');
  if (sidePanel) sidePanel.style.display = 'none';

  const eventsContainer = document.getElementById('events-container');
  if (eventsContainer) eventsContainer.style.display = 'none';

  const articlesPage = document.getElementById('mobile-articles-page');
  if (articlesPage) articlesPage.style.display = 'none';

  closeEngage();
  closeArticle();
  closeEventDetailPanel();
  closeArchive();
}

function openAboutUsMobile(mobileMenuExpand = true) {
  if (mobileMenuExpand) {
    expandOrCloseMobileMenu();
  }
  document.querySelector('.about-us-container').style.display = '';
  var characterImage = document.getElementById('characterGif');
  setTimeout(function() {
    characterImage.src = 'tomita.png';
  }, 1060);
  closeArticle();
  closeEvents();
  closeEventDetailPanel();
  closeArchive();
  window.location.hash = 'about-us';
  document.getElementById('partners').src = "partners-mobile.png"
}

function closeMobilePanel() {
  document.getElementById('sidePanel').style.display = 'none'; 
  resetToolbarToMapView();
}

function updateCounter(current, total) {
  const counter = document.getElementById('mobileLightboxCounter');
  counter.textContent = current + ' / ' + total;
}

function openLightboxMobile(source) {
  const lightbox = document.getElementById('lightbox-mobile');
  const container = document.getElementById('scrollContainer');
  const counter = document.getElementById('mobileLightboxCounter');
  
  if (!lightbox || !container || !counter) return;

  container.innerHTML = ''; // Clear previous content

  if (typeof source === 'string' && (source.startsWith('http') || source.endsWith('.jpg') || source.endsWith('.png'))) {
      // --- Single Image Mode ---
      let img = document.createElement('img');
      img.src = source;
      container.appendChild(img);
      
      counter.textContent = '1 / 1';
      
      // Disable scrolling behavior for a single image
      container.onscroll = null;
      container.style.scrollSnapType = 'none';

  } else {
      // --- Gallery Mode (original behavior) ---
      const imagesDir = source;
      const numImg = picsDirToNum[imagesDir] || 0;
      
      if (numImg === 0) {
          lightbox.style.display = 'none';
          return;
      }

      for (let i = 0; i < numImg; i++) {
          let img = document.createElement('img');
          img.src = buildPicPath(imagesDir, i);
          container.appendChild(img);
      }

      updateCounter(1, numImg); // Use existing updateCounter function
      
      // Re-enable snapping and the scroll listener for the gallery
      container.style.scrollSnapType = 'x mandatory';
      container.onscroll = () => {
          const scrollX = container.scrollLeft;
          const index = Math.round(scrollX / container.clientWidth);
          updateCounter(index + 1, numImg);
      };
  }

  lightbox.style.display = 'flex';
  container.scrollLeft = 0; // Ensure it starts at the beginning
}

function closeLightboxMobile() {
  const container = document.getElementById('scrollContainer');
  container.scrollLeft = 0;
  container.innerHTML = '';
  document.getElementById('lightbox-mobile').style.display = 'none'; // This hides the lightbox
}

function isSidePanelClosed() {
  var panel = document.getElementById('sidePanel');
  const currentLeft = parseInt(window.getComputedStyle(panel).left, 10) || 0;
  return currentLeft < 0 ? true : false;
}

function isEngageOpen() {
  var container = document.getElementById('engage-container');
  if (!container) return false;
  return container.style.display === 'none' ? false : true;
}

var wasSidePanelClosedEngage = false;

function toggleEngage(event) {
  event.preventDefault();
  if (isEngageOpen()) {
    closeEngage();
  } else {
    openEngage();
  }
}

function openEngage() {
  if (!window.matchMedia("(max-width: 550px)").matches) {
    if (!isSidePanelClosed()) {
      toggleSidePanel();
      wasSidePanelClosedEngage = false;
    } else {
      if (isArticlesHeaderOpen()) {
        wasSidePanelClosedEngage = wasSidePanelClosedArticles;
      } else {
        wasSidePanelClosedEngage = true;
      }
    }
    const card = document.querySelector('.card');
    card.classList.add('hidden-element');
    if (lastClickedFeatureCategory && lastClickedFeatureName) {
      updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
      lastClickedFeatureName = null;
      lastClickedFeatureCategory = null;
    }
    var container = document.getElementById('engage-container');
    container.style.display = 'flex';
    document.getElementById('engage-link').style.color = '#AD537C';
    closeReadMore();
    closeAboutUs();
    closeArticlesHeader();
    closeArticle();
    closeEvents();
    closeEventDetailPanel();
    closeArchive();
  } else {
    closeMobileMenu();
    var container = document.getElementById('engage-container-mobile');
    container.style.display = 'flex';
  }
}

function closeEngage() {
  if (!window.matchMedia("(max-width: 550px)").matches) {
    const engageLink = document.getElementById('engage-link');
    if (engageLink) engageLink.style.color = '#25121B';
    if (!isAboutUsDesktopOpen() && !isArticlesHeaderOpen() && ((isSidePanelClosed() && !wasSidePanelClosedEngage) || (!isSidePanelClosed() && wasSidePanelClosedEngage))) {
      toggleSidePanel();
    }
    var container = document.getElementById('engage-container');
    if (container) container.style.display = 'none';
  } else {
    var container = document.getElementById('engage-container-mobile');
    if (container) container.style.display = 'none';
  }
}

function openForm(event) {
  if (window.matchMedia("(max-width: 550px)").matches) {
    const button = event.currentTarget;
    const shadow = button.nextElementSibling;

    button.classList.add('clicked');
    shadow.classList.add('clicked');

    setTimeout(() => {
        button.classList.remove('clicked');
        shadow.classList.remove('clicked');
    }, 300);
  }
  event.preventDefault();
  window.open("https://docs.google.com/forms/d/e/1FAIpQLSdbZF3hjP4e0jlIRJgDSXqiI2N1OT4ltYvMjJzMOFX1p_M0jg/viewform", '_blank');
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

var isTextTransparent = false;

function toggleTransparency() {
  const footer = document.getElementById('menu-footer');
  let logo = document.getElementById('mobile-menu-logo');
  if (isTextTransparent) {
      footer.style.color = hexToRGBA('#F6F4EA', 1);
      logo.style.opacity = 1;
  } else {
      footer.style.color = hexToRGBA('#F6F4EA', 0.3);
      logo.style.opacity = 0.3;
  }
  isTextTransparent = !isTextTransparent;
}

function isArticlesHeaderOpen() {
  const articlesHeader = document.getElementById('articles-header');
  if (!articlesHeader) return false;
  return articlesHeader.style.display === 'none' ? false : true;
}

var wasSidePanelClosedArticles = false;

function openArticlesHeader() {
  const articlesHeader = document.getElementById('articles-header');
  articlesHeader.style.display = 'flex';
  document.getElementById('articles-link').style.color = '#AD537C';
  if (!isSidePanelClosed()) {
    toggleSidePanel();
    wasSidePanelClosedArticles = false;
  } else {
    if (isEngageOpen()) {
      wasSidePanelClosedArticles = wasSidePanelClosedEngage;
    } else {
      wasSidePanelClosedArticles = true;
    }
  }
  const card = document.querySelector('.card');
  card.classList.add('hidden-element');
  if (lastClickedFeatureCategory && lastClickedFeatureName) {
    updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
    lastClickedFeatureName = null;
    lastClickedFeatureCategory = null;
  }
  closeReadMore();
  closeEngage();
  closeAboutUs();
  closeArticle();
  closeEvents();
  closeEventDetailPanel();
  closeArchive();
}

function closeArticlesHeader() {
  const articlesHeader = document.getElementById('articles-header');
  if (!articlesHeader) return;
  if (!isAboutUsDesktopOpen() && !isEngageOpen() && ((isSidePanelClosed() && !wasSidePanelClosedArticles) || (!isSidePanelClosed() && wasSidePanelClosedArticles))) {
    toggleSidePanel();
  }
  articlesHeader.style.display = 'none';
  const articlesLink = document.getElementById('articles-link');
  if (articlesLink) articlesLink.style.color = '#25121B';
}

function toggleArticlesHeader(event) {
  event.preventDefault();
  if (isArticlesHeaderOpen()) {
    closeArticlesHeader();
  } else {
    openArticlesHeader();
    setActiveDesktopLink('articles-link');
  }
}

async function openArticle(event, articleName, shouldScrollToTop = true, shouldCloseMobileMenu = true) {
  if (event !== null) {
    event.preventDefault();
  }

  const isLoaded = await loadArticle(articleName);
  if (isLoaded) {
      const defaultPicsDir = 'cinema_union';

      let correctArticleName = articleName;
      if (correctArticleName.includes("(CdRF)") || correctArticleName.includes("Photography Resource Centre")) {
        correctArticleName = "Centrul de Resurse în Fotografie";
      }
      // FIXME
      if (correctArticleName === "Masca Theater") {
        correctArticleName = "Teatrul Masca";
      }

      if (correctArticleName === "The “Tudor Arghezi” Memorial House") {
        correctArticleName = "Casa Memorială Tudor Arghezi — Mărțișor"
      }

      const featurePicsDirName = titleToPicsDir(correctArticleName);
      const featurePicsDir = featurePicsDirName in picsDirToNum ? featurePicsDirName : defaultPicsDir;
      const numFeaturePics = picsDirToNum[featurePicsDir];

      // Set currentImageDir and currentImageIndex for lightbox
      currentImageIndex = 0;
      currentImageDir = featurePicsDir;

      let imageContainer = document.getElementById('image-gallery-container-article');
      let mainImage = imageContainer.querySelector('.main-image');
      var mainImgElement = mainImage.querySelector('img');
      if (numFeaturePics > 0) {
        mainImgElement.src = buildPicPath(featurePicsDir, 0);
        if (!window.matchMedia("(max-width: 550px)").matches) {
          mainImgElement.setAttribute('onclick', `openLightbox('${buildPicPath(featurePicsDir, 0)}', 0)`);
        } else {
          mainImgElement.setAttribute('onclick', `openLightboxMobile('${featurePicsDir}')`);
        }
        mainImage.querySelector('.num-pics-label').textContent = '1 / ' + numFeaturePics;
      }

      if (!window.matchMedia("(max-width: 550px)").matches) {
        var thumbnailsList = document.querySelectorAll('.thumbnails-article .thumbnail-article');
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

        const maxNumPics = 5;
        for (let i = 1; i < Math.min(numFeaturePics, maxNumPics); i++) {
          var imgElement = thumbnails[i - 1].querySelector('img');
          imgElement.setAttribute('src', buildPicPath(featurePicsDir, i));
          imgElement.setAttribute('onclick', `openLightbox('${buildPicPath(featurePicsDir, i)}', ${i})`);
        }

        for (let i = numFeaturePics; i < maxNumPics; i++) {
          var imgElement = thumbnails[i - 1].querySelector('img');
          imgElement.classList.add('hidden');
        }
      }

      if (!window.matchMedia("(max-width: 550px)").matches) {
        closeArticlesHeader();
        setActiveDesktopLink('articles-link');
      } else {
        if (shouldCloseMobileMenu) {
          cleanupMobilePanels();
        }
        document.querySelector('.about-us-container').style.display = 'none';
      }

      window.location.hash = titleToLinkName[correctArticleName];

      document.getElementById('fb-share-article').href = encodeURIComponent(window.location.href);

      const articleCardContainer = document.getElementById('article-card-container-bottom');
      const articleCards = articleCardContainer.querySelectorAll('.article-card');

      articleCards.forEach((articleCard) => {
        const titleElement = articleCard.querySelector('.article-card-title');
        const newLang = Object.keys(translations).filter(l => l !== currentLang)[0];
        if (titleElement.textContent === articleName || articleName === titleElement.textContent + " (CdRF)"
         || articleName + " (CdRF)" === titleElement.textContent
         || articleTitleTranslation[newLang][articleName] === titleElement.textContent
         || articleTitleTranslation[newLang][articleName] === titleElement.textContent + " (CdRF)"
         || articleTitleTranslation[newLang][articleName] + " (CdRF)" === titleElement.textContent) {
          articleCard.style.display = 'none';
        } else {
          articleCard.style.display = '';
        }
      });

      if (!window.matchMedia("(max-width: 550px)").matches) {
        var articleCardCategory = document.getElementById("article-category-desktop");
        const categoriesKey = `Categories_${currentLang}`;
        const category = nameToFeature[correctArticleName].properties[categoriesKey].split(/[,;]+/).map(s => s.trim())[0];
        articleCardCategory.style.color = `${getCategoryColor(category)}`;
        articleCardCategory.textContent = getCategoryDisplayName(category).toUpperCase();
      }

      if (shouldScrollToTop) {
        var articleCont = document.getElementById('article-container');
        articleCont.scrollTop = 0;
        scrollFun();
        document.getElementById('article-container').style.display = 'flex';
        articleCont.scrollTop = 0;
        scrollFun();
      }
      initializePlayerForCurrentArticle();
  } else {
    console.error('Failed to load the article content.');
  }
}

function closeArticle() {
  document.getElementById('article-container').style.display = 'none';
  if (!window.matchMedia("(max-width: 550px)").matches) {
    document.getElementById('articles-link').style.color = '#25121B';
  }
  history.replaceState(null, null, ' ');
}

function scrollFun() {
  var container = document.querySelector('.article-container');
  var winScroll = container.scrollTop;
  var height = container.scrollHeight - container.clientHeight;
  var scrolled = (winScroll / height) * 100;
  document.getElementById("myBar").style.width = scrolled + "%";

  scrollTopButton = document.getElementById("scrollTopBtn");
  if (container.scrollTop > 400) {
    scrollTopButton.style.display = "block";
  } else {
    scrollTopButton.style.display = "none";
  }
}

function scrollToTop() {
  var component = document.getElementById("article-container");
  component.scrollTo({top: 0, behavior: 'smooth'});
}

function handleSelectAll(isFromSelectAllCheckbox = false) {
  const isMobile = window.matchMedia("(max-width: 550px)").matches;
  const selectAllId = isMobile ? 'mobileSelectAllInput' : 'selectAllInput';
  var box = document.getElementById(selectAllId);

  if (isFromSelectAllCheckbox) {
      if (box.checked && selectedCategories.length === 0) {
          return;
      }
      if (box.checked) {
          selectedCategories = [];
      } else {
          selectedCategories = [];
      }
  } else {
      if (box.checked && selectedCategories.length === 0) {
          return;
      }
      selectedCategories = [];
      if (box) box.checked = true;
  }

  const card = document.querySelector('.card');
  if (card) card.classList.add('hidden-element');

  if (lastClickedFeatureCategory && lastClickedFeatureName) {
    updateIconState(lastClickedFeatureName, `${iconPaths[lastClickedFeatureCategory]}_normal`);
    lastClickedFeatureName = null;
    lastClickedFeatureCategory = null;
  }
  
  const labelContainer = document.getElementById("dynamicLabelContainer");
  if (labelContainer) {
      labelContainer.innerHTML = '';
      labelContainer.style.display = 'none';
  }

  updateObjectiveListAppearance();
  populateGalleryContainer();
}

let currentLang = 'ro';

const translations = {
    ro: {},
    en: {}
};

// Load translation files (JSON)
async function loadTranslations() {
  try {
    const enResponse = await fetch('en.json');
    translations.en = await enResponse.json();

    const roResponse = await fetch('ro.json');
    translations.ro = await roResponse.json();

    return true;
  } catch(error) {
    console.error("Error while loading the language configurations: ", error);
    return false;
  }
}

async function changeLanguage(event, langToChangeTo = null) {
  event.preventDefault();

  if (langToChangeTo && langToChangeTo === currentLang) {
    return;
  }

  let isJsonLoaded = true;
  if (Object.keys(translations.ro).length === 0) {
    isJsonLoaded = await loadTranslations();
  }

  let oldLang = currentLang;

  if (isJsonLoaded) {
    const newLang = langToChangeTo ? langToChangeTo : Object.keys(translations).filter(l => l !== currentLang)[0];
    const isMobile = window.matchMedia("(max-width: 550px)").matches;

    if (isMobile) {
      document.getElementById("langro").style.textDecoration = "none";
      document.getElementById("langen").style.textDecoration = "none";
      var element = document.getElementById("lang" + newLang);
      element.style.textDecoration = "underline";
      element.style.textUnderlineOffset = "2px";
      element.style.textDecorationThickness = "1px";

      var menuButton = document.querySelector('.mobile-menu-button');
      let spanElem = menuButton.querySelector('span');
      if (spanElem) {
        spanElem.textContent = newLang === 'ro' ? "ÎNCHIDE" : "CLOSE";
      }
    }

    Object.keys(translations[newLang]).forEach(elemId => {
      if (elemId === 'objList') {
        const targetId = isMobile ? 'mobileObjList' : 'objList';
        let elem = document.getElementById(targetId);
        if (elem) {
          const numberMatch = elem.textContent.match(/\d+/);
          const number = numberMatch ? numberMatch[0] : '0';
          elem.textContent = translations[newLang][elemId] + " (" + number + ")";
        }
        return;
      }

      if (window.matchMedia("(max-width: 550px)").matches) {
        if (elemId === 'locations-panel-title' || elemId === 'filters-panel-name' || elemId === "mobile-articles-link" || elemId === 'mobile-obiective-btn' || elemId === 'mobile-filtre-btn') {
          const targetElem = document.getElementById(elemId);
          if (targetElem && targetElem.childNodes.length > 0) {
            targetElem.childNodes[0].nodeValue = translations[newLang][elemId];
          }
          return;
        }
      } else if (elemId.startsWith("mobile")) {
        return;
      }
      
      const elementToTranslate = document.getElementById(elemId);
      if(elementToTranslate) elementToTranslate.textContent = translations[newLang][elemId];
    });

    if (isMobile) {
        const trans = translations[newLang];
        document.querySelector('#mobile-discover-panel .discover-title').childNodes[0].nodeValue = trans['discover-title-mobile'];
        document.getElementById('mobile-filters-panel-name').childNodes[0].nodeValue = trans['filters-title-mobile'];

        document.getElementById('mobileSearchInput').placeholder = trans['searchInput'];
        
        const selectAllMobile = document.getElementById('mobileSelectAllLabelText');
        if (selectAllMobile) selectAllMobile.textContent = trans['selectAllLabelText'];

        const mobileSectionTitles = {
          'mobile-filtre-organizatii': trans['filtre-organizatii'],
          'mobile-prop-class': trans['prop-class']
        };
        for (const id in mobileSectionTitles) {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = mobileSectionTitles[id];
        }

        const mobileLabels = {
            'mobile-fund-txt': trans['fund-txt'],
            'mobile-priv-inst-txt': trans['priv-inst-txt'],
            'mobile-pub-inst-txt': trans['pub-inst-txt'],
            'mobile-ong-txt': trans['ong-txt']
        };
        for (const id in mobileLabels) {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = mobileLabels[id];
        }

        const mobileButtons = {
            'mobile-historicalMonument': trans['historicalMonument'],
            'mobile-unclassified': trans['unclassified']
        };
        for (const id in mobileButtons) {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = mobileButtons[id];
        }

        const mobileEngageElements = {
          'mobile-engage-title-1': trans['engage-title-1'],
          'mobile-engage-text-1': trans['engage-text-1'],
          'mobile-engage-button-text': trans['mobile-engage-button-text'],
          'mobile-engage-title-2': trans['engage-title-2'],
          'mobile-engage-text-2': trans['engage-text-2']
        };
        for (const id in mobileEngageElements) {
            const elem = document.getElementById(id);
            if (id === 'mobile-engage-text-2' && elem) {
                elem.innerHTML = mobileEngageElements[id];
            } else if (elem) {
                elem.textContent = mobileEngageElements[id];
            }
        }
    }

    document.getElementById('searchInput').placeholder = translations[newLang]['searchInput'];
    document.getElementById('about-us-first-p').innerHTML = translations[newLang]['about-us-first-p'];
    document.getElementById('about-us-second-p').innerHTML = translations[newLang]['about-us-second-p'];
    document.getElementById('disclaimer-afcn').innerHTML = translations[newLang]['disclaimer-afcn'];

    const listItems = document.querySelectorAll('#custom-bulleted-list li, #mobileCustomBulletedList li');
    listItems.forEach(li => {
      const oldCat = li.getAttribute('data-category-name');
      const newCat = categoryTranslation[currentLang][oldCat];
      li.textContent = getCategoryDisplayName(newCat);
      li.setAttribute('data-category-name', newCat);
    });

    let labelContainer = document.getElementById("dynamicLabelContainer");
    if (labelContainer.children.length > 0 && labelContainer.style.display !== 'none') {
      Array.from(labelContainer.children).forEach(child => {
        let textField = child.querySelector('.dynamic-label-text');
        const oldLabel = textField.textContent;

        let newLabel;
        if (labelTranslation[currentLang][oldLabel]) {
            newLabel = labelTranslation[currentLang][oldLabel];
        } else if (periodTranslation[currentLang][oldLabel.replace(/\s/g, '')]) { // Check clean value "1990-prezent"
            newLabel = periodTranslation[currentLang][oldLabel]; // Get display value "1990 - present"
        } else if (styleTranslation[currentLang][oldLabel]) {
            newLabel = styleTranslation[currentLang][oldLabel];
        } else {
            newLabel = oldLabel; // Fallback
        }
        textField.textContent = newLabel;
      });
    }

    let uniqueCatTranslated = [];
    uniqueCategories.forEach(cat => uniqueCatTranslated.push(categoryTranslation[currentLang][cat]));
    uniqueCategories = uniqueCatTranslated;

    if (selectedCategories.length > 0) {
      let catTranslated = [];
      selectedCategories.forEach(cat => catTranslated.push(categoryTranslation[currentLang][cat]));
      selectedCategories = catTranslated;
    }

    if (clasare !== '') {
      clasare = labelTranslation[currentLang][clasare];
    }
    if (orgs.length > 0) {
      orgs.forEach((org, index) => {
        orgs[index] = labelTranslation[currentLang][org];
      });
    }
    if (periods.length > 0) {
      periods.forEach((period, index) => {
        periods[index] = periodTranslation[currentLang][period];
      });
    }
    if (styles.length > 0) {
      styles.forEach((style, index) => {
        styles[index] = styleTranslation[currentLang][style];
      });
    }

    const languageLink = document.getElementById('language-link');
    if(languageLink) languageLink.childNodes[0].textContent = currentLang.toUpperCase();

    const allArticleCards = document.querySelectorAll('.article-card');
    allArticleCards.forEach((articleCard) => {
      const titleElement = articleCard.querySelector('.article-card-title');
      if (titleElement) {
          const currentTitle = titleElement.textContent.trim();
          const newTitle = articleTitleTranslation[oldLang][currentTitle];
          if (newTitle) {
              titleElement.textContent = newTitle;
          }
      }
    });

    currentLang = newLang;

    if (lastClickedFeatureName !== null) {
      let feature = nameToFeature[lastClickedFeatureName];
      const cardCategory = document.querySelector('.card-category');
      const categoriesKey = `Categories_${currentLang}`;
      const category = feature.properties[categoriesKey].split(/[,;]+/).map(s => s.trim())[0];
      cardCategory.style.color = `${getCategoryColor(category)}`;
      cardCategory.textContent = getCategoryDisplayName(category);

      const descriereKey = `Descriere_${currentLang}`;
      let contentArr = feature.properties[descriereKey].split('\n').filter(l => l.length > 0 && l.trim() !== '');
      const cardText = document.querySelector('.card-text');
      if (contentArr.length !== 0) {
        cardText.textContent = contentArr[0];
      } else if (getArticleDescr(lastClickedFeatureName)) {
        cardText.textContent = getArticleDescr(lastClickedFeatureName);
      } else {
        cardText.textContent = currentLang === 'ro' ? "Mai multe detalii în curând." : "More details soon.";
      }
    }

    refreshOrFillReadMore();

    if (document.getElementById('article-container').style.display !== 'none') {
      var articleTitleElem = document.querySelector('.article-title');
      if (articleTitleElem) openArticle(null, articleTitleElem.textContent, false, false);
    }

    if (!isMobile) {
      var artCat = document.getElementById('article-category-desktop');
      if (artCat && artCat.textContent) {
        artCat.textContent = categoryTranslation[oldLang][artCat.textContent.charAt(0) +
          artCat.textContent.substring(1).toLowerCase()].toUpperCase();
      }
    }
  }
}

function getArticleDescr(articleName) {
  const articleToLangToDescr = {
    ro: {
      "Suprainfinit Gallery": "Primul text din cadrul proiectului Filtru Cultural București intră în dialog cu galeria de artă Suprainfinit, poziționată în centrul simbolic al cartierului Mântuleasa.",
      "Centrul de Resurse în Fotografie": "Al doilea text din cadrul proiectului Filtru Cultural București intră în dialog cu Centrul de Resurse în Fotografie.",
      "Atelierele Scânteia" : "Ultimul text din cadrul proiectului Filtru Cultural București intră în dialog cu Atelierele Scânteia.",
      "Paper Traffic": "Al patrulea text din cadrul proiectului Filtru Cultural București intră în dialog cu Paper Traffic, un spațiu hibrid între librărie, galerie și frizerie, aflat pe terasa de la etajul Halelor Obor.",
      "Teatrul Masca": "Pentru cea de-a doua ediție a proiectului Filtru Cultural, care și-a extins granițele către inițiative culturale din inelul doi al Bucureștiului, am deschis un dialog cu Teatrul Masca.",
      "Casa Memorială Tudor Arghezi — Mărțișor": "Textul are ca punct de plecare o vizită la Casa Memorială „Tudor Arghezi” din București, unde am stat de vorbă cu Dorotheea Nicolescu, muzeografă aici de peste 15 ani."
    },

    en: {
      "Suprainfinit Gallery": "The first text of the project Filtru Cultural București enters into dialogue with the art gallery Suprainfinit, located in the symbolic center of the Mântuleasa district.",
      "Centrul de Resurse în Fotografie": "The second text of the project Filtru Cultural București enters into dialog with the Centre for Photographic Resources.",
      "Atelierele Scânteia" : "The last text of the project Filtru Cultural București enters into dialogue with Atelierele Scânteia.",
      "Paper Traffic": "The fourth text within the project Filtru Cultural Bucharest enters into a dialogue with Paper Traffic, a hybrid space between bookstore, gallery and barbershop, located on the upstairs terrace of the Obor Halls.",
      "Teatrul Masca": "For the second edition of the Filtru Cultural project, which has extended its focus toward cultural initiatives in Bucharest’s outer ring of neighborhoods, we started a dialogue with Masca Theater.",
      "The “Tudor Arghezi” Memorial House": "The text takes as its starting point a visit to the Tudor Arghezi Memorial House in Bucharest, where we spoke with Dorotheea Nicolescu, who has been a curator here for over fifteen years."
    }
  };
  return articleToLangToDescr[currentLang][articleName];
}

function scrollToSection(sectionId, event = null) {
  if (event) {
    event.preventDefault();
  }
  var element = document.getElementById(sectionId);
  element.scrollIntoView({ behavior: 'smooth' });
}

function toggleCDRFText() {
  var footnotes = document.getElementById("footnotes-cdrf");
  var moreText = document.getElementById("footnotes-more-text");
  var expandBtn = document.getElementById("expand-text-btn");

  if (footnotes.classList.contains("expanded")) {
    // Collapsing (Read less)
    footnotes.classList.remove("expanded");

    // Set max-height back to 0 for collapse
    moreText.style.maxHeight = 0;
    if (currentLang === 'ro') {
      expandBtn.innerHTML = "Continuați să citiți ↓"; // Down arrow
    } else {
      expandBtn.innerHTML = "Read more ↓";
    }
} else {
    // Expanding (Read more)
    footnotes.classList.add("expanded");

    // Dynamically calculate the actual height of the content
    var fullHeight = moreText.scrollHeight + "px";

    // Animate by setting max-height to the content's full height
    moreText.style.maxHeight = fullHeight;
    if (currentLang === 'ro') {
      expandBtn.innerHTML = "Citește mai puțin ↑";
    } else {
      expandBtn.innerHTML = "Read less ↑"; // Up arrow
    }
  }
}

async function loadArticle(articleName) {
  let nameToFile = {
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
  };
  const articleContent = document.getElementById('article-content-id');
  try {
      // Fetch the HTML file for the selected article and language
      const response = await fetch(`articles/${nameToFile[articleName]}_${currentLang}.html`);
      const data = await response.text();

      // Replace the content of the article section with the loaded HTML
      articleContent.innerHTML = data;

      // Now the HTML is loaded, so we can manipulate the DOM safely
      return true; // Indicate that the article has been successfully loaded
  } catch (error) {
      console.error('Error loading the article:', error);
      return false; // Indicate failure
  }
}


const filterLabelsContainer = document.getElementById('filterLabelsContainer')

// helper: show or hide the whole container
function refreshDynamicContainer() {
  filterLabelsContainer.style.display = filterLabelsContainer.children.length
    ? 'flex'
    : 'none'
}

// helper: rebuild “Anulează tot” pill if needed
function ensureCancelAll() {
  // if there are user-picked pills but no “cancel-all” yet…
  if (
    filterLabelsContainer.children.length >= 1 &&
    !filterLabelsContainer.querySelector('[data-cancel-all]')
  ) {
    const pill = document.createElement('div')
    pill.className = 'dynamic-label'
    pill.setAttribute('data-cancel-all', 'true')
    pill.innerHTML = `
      <span class="dynamic-label-text">Anulează tot</span>
      <span class="dynamic-label-close-btn"></span>
    `
    filterLabelsContainer.appendChild(pill)
  }
}

// adds a single pill for a filter
function addFilterPill(type, value, id) {
  // guard-rail: don’t double-add
  if (filterLabelsContainer.querySelector(`[data-type="${type}"][data-value="${value}"]`))
    return;

  const pill = document.createElement('div');
  pill.className = 'dynamic-label';
  pill.setAttribute('data-type', type);
  pill.setAttribute('data-value', value);
  pill.innerHTML = `
    <span class="dynamic-label-text">${value}</span>
    <span class="dynamic-label-close-btn"></span>
  `;
  filterLabelsContainer.insertBefore(pill, filterLabelsContainer.firstChild);
  refreshDynamicContainer();
  ensureCancelAll();
}

// removes a pill matching type/value
function removeFilterPill(type, value) {
  const pill = filterLabelsContainer.querySelector(`[data-type="${type}"][data-value="${value}"]`)
  if (pill) pill.remove()
  const onlyCancelAll =
    filterLabelsContainer.children.length === 1 &&
    filterLabelsContainer.querySelector('[data-cancel-all]')
  if (onlyCancelAll) filterLabelsContainer.innerHTML = ''
  refreshDynamicContainer()
}


// catch clicks on the pills container
if (filterLabelsContainer) {
  filterLabelsContainer.addEventListener('click', e => {
    const isMobile = window.matchMedia("(max-width: 550px)").matches;
     // 1) if they clicked the ✕ on a pill…
    const pill = e.target.closest('.dynamic-label:not([data-cancel-all])');
    if (pill && e.target.classList.contains('dynamic-label-close-btn')) {
      const { type, value } = pill.dataset; // 'type' is 'tip', 'keyword', 'free', 'ticket', etc.
                                           // 'value' is the display text of the pill.
      // Always remove the pill from display first
      removeFilterPill(type, value); // This function handles UI for removing the pill itself

      let checkboxToModify;
      let panelIdForButtonUpdate;
      let buttonIdForUpdate;

      if (type === 'tip' || type === 'keyword') {
        if (!isMobile) { // Desktop
          panelIdForButtonUpdate = (type === 'tip') ? 'event-type-panel' : 'keywords-panel';
          buttonIdForUpdate = (type === 'tip') ? 'event-type-btn' : 'keywords-btn';
          const panel = document.getElementById(panelIdForButtonUpdate);
          if (panel) {
            checkboxToModify = panel.querySelector(`input[type="checkbox"][value="${value}"]`);
          }
        } else { // Mobile
          const listId = (type === 'tip') ? 'mobile-type-list' : 'mobile-keywords-list';
          const list = document.getElementById(listId);
          if (list) {
            // For mobile 'tip', the pill 'value' is just the label part e.g. "Seminar"
            // Checkbox value attribute is also just the label part e.g. "Seminar"
            // So, this query should work.
            checkboxToModify = list.querySelector(`input[type="checkbox"][value="${value}"]`);
          }
        }
      } else if (type === 'free-entry-btn' || type === 'ticket-btn') { // Desktop Free/Ticket buttons acting as filters
          // These don't have separate checkboxes in a dropdown, their state is the button itself.
          // removeFilterPill() already removed the pill.
          // We need to reset the button's visual state.
          const btn = document.getElementById(type); // type here is the button's ID
          if (btn && btn.classList.contains('red')) {
              btn.classList.remove('red');
              btn.style.background = '#FBF6EF';
              btn.style.color      = '#3E1928';
          }
      } else if (type === 'free' || type === 'ticket') { // Mobile Free/Ticket checkboxes
          checkboxToModify = document.getElementById(
              type === 'free' ? 'mobile-free-entry' : 'mobile-ticket'
          );
      }

      // If a corresponding checkbox was found and is checked, uncheck it
      if (checkboxToModify && checkboxToModify.checked) {
        checkboxToModify.checked = false;
      }

      // Manually update desktop dropdown button appearance if applicable
      if (!isMobile && panelIdForButtonUpdate && buttonIdForUpdate) {
        updateDropdownButtonState(buttonIdForUpdate, panelIdForButtonUpdate);
      }

      // Re-apply all filters and update counts/dropdowns
      applyAllEventsFiltersAndPopulate();
      return;
    }

    // 2) if they clicked the “Anulează tot” pill itself…
    if (e.target.closest('[data-cancel-all]')) {
      // desktop
      document
        .querySelectorAll('#event-type-panel input, #keywords-panel input')
        .forEach(i => {
          if (i.checked) i.click() // will cascade and remove every pill
        })

      // —— mobile panels ——
      // 1) clear the mobile types & keywords lists
      document
        .querySelectorAll(
          '#mobile-type-list input[type="checkbox"], ' +
          '#mobile-keywords-list input[type="checkbox"]'
        )
        .forEach(cb => { cb.checked = false })

      // 2) clear the free-entry / ticket toggles
      const mFree   = document.getElementById('mobile-free-entry')
      const mTicket = document.getElementById('mobile-ticket')
      if (mFree)   mFree.checked   = false
      if (mTicket) mTicket.checked = false

      // all dynamic labels
      Array.from(
        filterLabelsContainer
          .querySelectorAll('.dynamic-label:not([data-cancel-all]) .dynamic-label-close-btn')
      ).forEach(closeBtn => closeBtn.click());
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  ['free-entry-btn', 'ticket-btn'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      // grab its display text
      const labelText = btn.querySelector('.filter-text')?.textContent.trim() 
                        || btn.textContent.trim();
      const isActive  = btn.classList.contains('red');

      if (!isActive) {
        // add the pill (data-type=btnId, data-value=labelText),
        // then refresh + auto-insert “Anulează tot”
        addFilterPill(btnId, labelText);
      } else {
        // remove that pill (and auto-cleanup “Anulează tot”)
        removeFilterPill(btnId, labelText);
      }

      // mirror the styling logic in toggleCalendar/updateDropdown:
      btn.classList.toggle('red', !isActive);
      btn.style.background = !isActive ? '#AD537C' : '#FBF6EF';
      btn.style.color      = !isActive ? '#F6F4EA' : '#3E1928';

      applyAllEventsFiltersAndPopulate();
    });
  });
});

function createEventCardElement(eventData, clickHandler) {
  const art = document.createElement('article');
  art.className = 'event-card';

  if (clickHandler && typeof clickHandler === 'function') {
      art.onclick = clickHandler;
  } else if (typeof openEventDetailPanel === 'function' && eventData && eventData.title) {
      // Default click handler to open the event detail panel if available
      art.onclick = () => openEventDetailPanel(eventData.title);
  }

  const currentEventData = eventData || {};
  const titleText = currentEventData.title || (currentLang === 'ro' ? "Eveniment fără titlu" : "Untitled Event");
  const addressText = currentEventData.address || (currentLang === 'ro' ? "Locație neprecizată" : "Location not specified");
  const categoryText = currentEventData.category || (currentLang === 'ro' ? "Necategorisit" : "Uncategorized");
  const imageUrl = currentEventData.image || 'https://placehold.co/284x180/EAAAC8/3E1928'; // Default placeholder
  const timeText = currentEventData.time || (currentLang === 'ro' ? "Data neprecizată" : "Date not specified");

  const altImageText = (currentLang === 'ro' ? 'Imagine eveniment: ' : 'Event image: ') + titleText;
  const altLocationIconText = currentLang === 'ro' ? 'icon locație' : 'location icon';

  // --- Dynamic Height Adjustments ---
  const isMobileCard = window.matchMedia("(max-width: 550px)").matches;
  if (isMobileCard) {
      if (titleText.length > 50) { // Example condition for mobile
          art.style.height = '350px';
      } else {
          art.style.height = '330px'; // Default mobile card height
      }
  }

  art.innerHTML = `
    <img
      src="${imageUrl}"
      class="event-image"
      alt="${altImageText}"
      onerror="this.onerror=null; this.src='https://placehold.co/284x180/EAAAC8/3E1928';" 
      />
    <section class="event-details">
      <div class="event-info">
        <div class="event-content">
          <p class="event-category">${categoryText.toUpperCase()}</p>
          <h2 class="event-title">${titleText}</h2>
          <div class="event-location">
            <img
              src="Pin.svg"
              class="location-icon"
              alt="${altLocationIconText}"
            />
            <p class="location-address">${addressText}</p>
          </div>
        </div>
      </div>
      <time class="event-time">${timeText}</time>
    </section>
  `;

  return art;
}

async function populateRelatedEventsForReadMore(featureName) {
  const isMobile = window.matchMedia("(max-width: 550px)").matches;
  const wrapperId = isMobile ? 'readMoreRelatedEventsWrapperMobile' : 'readMoreRelatedEventsWrapperDesktop';
  const containerId = isMobile ? 'readMoreRelatedEventsContainerMobile' : 'readMoreRelatedEventsContainerDesktop';
  const titleId = isMobile ? 'readMoreRelatedSectionTitleMobile' : 'readMoreRelatedSectionTitleDesktop';

  const relatedWrapper = document.getElementById(wrapperId);
  const relatedContainer = document.getElementById(containerId);
  const relatedTitleElement = document.getElementById(titleId);

  if (!relatedWrapper || !relatedContainer || !relatedTitleElement) {
      console.warn("Related events section elements for Read More page not found.");
      return;
  }

  relatedContainer.innerHTML = ''; // Clear previous events

  // Ensure masterEventList is populated (await if necessary)
  if (!initialEventsFetchPromise) {
      console.warn("Initial event fetch promise not available for Read More related events. Attempting to fetch.");
      initialEventsFetchPromise = fetchAndPrepareInitialEventData();
  }
  try {
      await initialEventsFetchPromise; // Wait for events to be loaded
  } catch (error) {
      console.error("Error ensuring masterEventList is populated:", error);
      relatedWrapper.style.display = 'none';
      return;
  }

  if (!masterEventList || masterEventList.length === 0 || !featureName) {
      relatedWrapper.style.display = 'none';
      return;
  }

  const todayForFilter = new Date();
  todayForFilter.setHours(0, 0, 0, 0);

  const eventsAtLocation = masterEventList.filter(event => {
      if (!event.airtableFields || !event.airtableFields.Location || !event.airtableFields.Start) {
          return false;
      }
      // Case-insensitive and trim comparison for location
      if (event.airtableFields.Location.trim().toLowerCase() !== featureName.trim().toLowerCase()) {
          return false;
      }

      // Filter out past events (same logic as in applyAllEventsFiltersAndPopulate)
      const eventStartDateObj = new Date(event.airtableFields.Start);
      const eventEndDateObj = event.airtableFields.End ? new Date(event.airtableFields.End) : null;

      if (eventEndDateObj) { // Event has an end date
          return eventEndDateObj >= todayForFilter;
      } else { // Event only has a start date
          const eventStartDayEnd = new Date(eventStartDateObj);
          eventStartDayEnd.setHours(23, 59, 59, 999);
          return eventStartDayEnd >= todayForFilter;
      }
  }).sort((a, b) => new Date(a.airtableFields.Start) - new Date(b.airtableFields.Start)); // Sort by date

  if (eventsAtLocation.length === 0) {
      relatedWrapper.style.display = 'none';
  } else {
      // Update title based on language and featureName
      let locationDisplayName = featureName;
      // If featureName is a key in articleTitleTranslation, use the translated name for display
      if (articleTitleTranslation[currentLang] && articleTitleTranslation[currentLang][featureName]) {
          locationDisplayName = articleTitleTranslation[currentLang][featureName];
      }
      relatedTitleElement.textContent = currentLang === 'ro' ? `Evenimente la ${locationDisplayName}` : `Events at ${locationDisplayName}`;

      const maxEventsToShow = isMobile ? 3 : 5; // Show fewer on mobile if stacked vertically

      eventsAtLocation.slice(0, maxEventsToShow).forEach(event => {
          const card = createEventCardElement(event, () => {
              // When a related event card is clicked on the Read More page
              closeReadMore(); // Close the current Read More page
              // Ensure events panel is shown if not already, then open detail
              const eventsContainer = document.getElementById('events-container');
              if (eventsContainer.style.display === 'none' || eventsContainer.style.display === '') {
                  toggleEvents({ preventDefault: () => {} }); // Open events panel
                   // Wait a brief moment for panel to initialize if needed, then open detail
                  setTimeout(() => {
                     openEventDetailPanel(event.title);
                  }, 100); // Adjust delay if necessary
              } else {
                  openEventDetailPanel(event.title);
              }
          });
          relatedContainer.appendChild(card);
      });
      relatedWrapper.style.display = 'block'; // Show the section
  }
}

function createRelatedFeatureCardElement(featureData, clickHandler) {
  const art = document.createElement('article');
  art.className = 'event-card'; // Use the existing event-card class

  if (clickHandler && typeof clickHandler === 'function') {
      art.onclick = clickHandler;
  }

  // Ensure featureData and its properties exist, providing fallbacks
  const properties = featureData && featureData.properties ? featureData.properties : {};
  
  const featureName = properties.Name || (currentLang === 'ro' ? "Locație fără nume" : "Unnamed Location");
  
  const categoriesKey = `Categories_${currentLang}`;
  const primaryCategory = (properties[categoriesKey] ? properties[categoriesKey].split(/[,;]+/)[0].trim() : (currentLang === 'ro' ? "Necategorisit" : "Uncategorized"));
  
  const address = properties.Address || (currentLang === 'ro' ? "Adresă neprecizată" : "Address not specified");

  // 1. Determine the imageUrl (Main display image of the feature)
  let imageUrl;
  const featurePicsDirName = titleToPicsDir(featureName); // Assumes titleToPicsDir is globally available
  const numFeaturePics = picsDirToNum[featurePicsDirName] || 0; // Assumes picsDirToNum is globally available

  if (numFeaturePics > 0) {
      imageUrl = buildPicPath(featurePicsDirName, 0); // Assumes buildPicPath is globally available
  } else {
      // Fallback if feature has no images in picsDirToNum
      imageUrl = 'https://placehold.co/284x180/E0E0E0/E0E0E0'; // Generic placeholder
  }

  const altImageText = (currentLang === 'ro' ? 'Imagine locație: ' : 'Location image: ') + featureName;
  const altLocationIconText = currentLang === 'ro' ? 'icon adresă' : 'address icon';

  // 2. Determine timeText (Short description preview)
  const descriereKey = `Descriere_${currentLang}`;
  const fullDescription = properties[descriereKey] ? properties[descriereKey].split('\n')[0].trim() : ''; // Use first line as a base for preview
  const previewLength = 90;
  let timeText;

  if (fullDescription) {
      if (fullDescription.length > previewLength) {
          timeText = fullDescription.substring(0, previewLength) + "...";
      } else {
          timeText = fullDescription;
      }
  } else {
      timeText = ""; // Empty if no description, or a fallback like "Detalii locație" / "Venue Details"
  }

  const isMobileCard = window.matchMedia("(max-width: 550px)").matches;
  if (isMobileCard) {
      // Example: Adjust height if name is very long or description preview is substantial
      if (featureName.length > 40 || (timeText.length > 50 && featureName.length > 20)) {
          art.style.height = '350px';
      } else {
          art.style.height = '330px'; // Default mobile card height
      }
  } 

  art.innerHTML = `
    <img
      src="${imageUrl}"
      class="event-image"
      alt="${altImageText}"
      style="object-fit: cover; padding: 0;"
      onerror="this.onerror=null; this.src='https://placehold.co/284x180/E0E0E0/E0E0E0';"
    />
    <section class="event-details">
      <div class="event-info">
        <div class="event-content">
          <p class="event-category">${primaryCategory.toUpperCase()}</p>
          <h2 class="event-title">${featureName}</h2>
          <div class="event-location">
            <img
              src="Pin.svg"
              class="location-icon"
              alt="${altLocationIconText}"
            />
            <p class="location-address">${address}</p>
          </div>
        </div>
      </div>
      <time class="event-time">${timeText}</time> 
    </section>
  `;
  return art;
}


async function populateRelatedFeaturesByCategory(currentFeatureName, currentFeaturePrimaryCategory, currentFeatureCoords) {
  const isMobile = window.matchMedia("(max-width: 550px)").matches;
  // IDs for the "related features by category" section
  const wrapperId = isMobile ? 'categoryRelatedFeaturesWrapperMobile' : 'categoryRelatedFeaturesWrapperDesktop';
  const containerId = isMobile ? 'categoryRelatedFeaturesContainerMobile' : 'categoryRelatedFeaturesContainerDesktop';
  const titleId = isMobile ? 'categoryRelatedFeaturesTitleMobile' : 'categoryRelatedFeaturesTitleDesktop';

  const relatedWrapper = document.getElementById(wrapperId);
  const relatedContainer = document.getElementById(containerId);
  const relatedTitleElement = document.getElementById(titleId);

  if (!relatedWrapper || !relatedContainer || !relatedTitleElement) {
      console.warn("Related features by category section elements for Read More page not found.");
      return;
  }

  relatedContainer.innerHTML = ''; // Clear previous cards

  if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0 || !currentFeaturePrimaryCategory || !currentFeatureCoords) {
      relatedWrapper.style.display = 'none';
      return;
  }

  const categoriesKey = `Categories_${currentLang}`;

  let relatedFeatures = geojsonData.features.filter(feature => {
      if (feature.properties.Name === currentFeatureName) {
          return false;
      }
      const featureCategoriesArray = feature.properties && feature.properties[categoriesKey]
                                  ? feature.properties[categoriesKey].split(/[,;]+/)
                                  : [];
      const featurePrimaryCategory = featureCategoriesArray.length > 0 ? featureCategoriesArray[0].trim() : null;

      if(featurePrimaryCategory !== currentFeaturePrimaryCategory) {
          return false;
      }

      const descriereKey = `Descriere_${currentLang}`;
      const description = feature.properties[descriereKey];
      // These locations have separate articles, so they are valid even without a description in the spreadsheet.
      const specialArticleLocations = ["Suprainfinit Gallery", "Centrul de Resurse în Fotografie", 
          "Atelierele Scânteia", "Paper Traffic", "Teatrul Masca", "Casa Memorială Tudor Arghezi — Mărțișor"];

      if ((!description || description.trim() === '') && !specialArticleLocations.includes(feature.properties.Name)) {
          return false; // Exclude if description is empty and it's not a special article location
      }

      // A place has a placeholder if it has no pictures defined in the system.
      const featurePicsDirName = titleToPicsDir(feature.properties.Name);
      const numFeaturePics = picsDirToNum[featurePicsDirName] || 0;
      if (numFeaturePics === 0) {
          return false; // Exclude if the location has no pictures
      }

      // If all checks pass, keep the feature
      return true;
  });

  if (relatedFeatures.length === 0) {
      relatedWrapper.style.display = 'none';
      return;
  }

  // Calculate distances for valid features
  const fromPoint = turf.point(currentFeatureCoords);
  relatedFeatures = relatedFeatures.map(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) {
          return { ...feature, distance: Infinity };
      }
      const toPoint = turf.point(feature.geometry.coordinates);
      const distance = turf.distance(fromPoint, toPoint, { units: 'kilometers' });
      return { ...feature, distance: distance };
  });

  // Sort by distance and take top 5
  relatedFeatures.sort((a, b) => a.distance - b.distance);
  const closestFeatures = relatedFeatures.slice(0, 5);

  if (closestFeatures.length === 0) {
      relatedWrapper.style.display = 'none';
  } else {
      relatedTitleElement.textContent = currentLang === 'ro' ? `Obiective similare din apropriere` : `Similar landmarks nearby`;

      closestFeatures.forEach(featureItem => {
          const card = createRelatedFeatureCardElement(featureItem, () => {
              closeReadMore();
              openReadMore(featureItem.properties.Name); 
          });
          relatedContainer.appendChild(card);
      });
      relatedWrapper.style.display = 'block';
  }
}


// Note: this file (and the map/side-panel elements it manages) is only
// present on index.html and evenimente.html. On evenimente.html the mobile
// discover/filters panels don't exist (no map there), so those cases fall
// back to navigating to index.html instead of toggling panels in place.
function handleToolbarClick(clickedButton) {
  const sidePanel = document.getElementById('sidePanel');
  const discoverPanel = document.getElementById('mobile-discover-panel');
  const filtersPanel = document.getElementById('mobile-filters-panel');

  switch (clickedButton.id) {
    case 'mobile-toolbar-map':
        if (!sidePanel) { window.location.href = 'index.html'; return; }
        sidePanel.style.display = 'none';
        const mobileMenu = document.querySelector('.mobile-menu');
        if (mobileMenu) mobileMenu.style.display = 'none';
        break;
    case 'mobile-toolbar-filters':
        if (!sidePanel || !discoverPanel || !filtersPanel) { window.location.href = 'index.html'; return; }
        discoverPanel.style.display = 'none';
        filtersPanel.style.display = 'flex';
        sidePanel.style.display = 'flex';
        break;
    case 'mobile-toolbar-search':
        if (!sidePanel || !discoverPanel || !filtersPanel) { window.location.href = 'index.html'; return; }
        filtersPanel.style.display = 'none';
        discoverPanel.style.display = 'flex';
        sidePanel.style.display = 'flex';
        break;
    case 'mobile-toolbar-events':
        window.location.href = 'evenimente.html';
        return;
    case 'mobile-toolbar-articles':
        window.location.href = 'articole.html';
        return;
  }

  const buttons = document.querySelectorAll('.mobile-toolbar .toolbar-button');
  buttons.forEach(btn => btn.classList.remove('active'));
  clickedButton.classList.add('active');
}

function resetToolbarToMapView() {
  const buttons = document.querySelectorAll('.mobile-toolbar .toolbar-button');
  buttons.forEach(btn => {
      btn.classList.remove('active');
  });

  const mapButton = document.getElementById('mobile-toolbar-map');
  if (mapButton) {
      mapButton.classList.add('active');
  }
}

function showMapView() {
  closeMobileMenu();
  const mapButton = document.getElementById('mobile-toolbar-map');
  if (mapButton && !mapButton.classList.contains('active')) {
      const buttons = document.querySelectorAll('.mobile-toolbar .toolbar-button');
      buttons.forEach(btn => btn.classList.remove('active'));
      mapButton.classList.add('active');
  }
}

function openMobileArticlesPage() {
  cleanupMobilePanels();
  const articlesPage = document.getElementById('mobile-articles-page');
  articlesPage.style.display = 'flex';
  articlesPage.scrollTop = 0;
}

function closeMobileArticlesPage() {
  const articlesPage = document.getElementById('mobile-articles-page');
  articlesPage.style.display = 'none';
  resetToolbarToMapView();
}

function updateToolbarActiveState(activeBtnId) {
  const buttons = document.querySelectorAll('.mobile-toolbar .toolbar-button');
  buttons.forEach(btn => {
      btn.classList.remove('active');
  });
  const activeButton = document.getElementById(activeBtnId);
  if (activeButton) {
      activeButton.classList.add('active');
  }
}

function setActiveDesktopLink(activeLinkId) {
  const linkIds = ['articles-link', 'archive-link', 'about-us-link', 'engage-link'];
  linkIds.forEach(id => {
      const link = document.getElementById(id);
      if (link) {
          link.style.color = (id === activeLinkId) ? '#AD537C' : '#25121B';
      }
  });
}

let currentArticleAudio = null;

function setupAudioPlayer(audioPlayerContainer) {
    const audioElement = audioPlayerContainer.querySelector('#articleAudioPlayer');
    const progressBar = audioPlayerContainer.querySelector('.progress-bar');
    const playPauseButton = audioPlayerContainer.querySelector('.play-pause-button');
    const rewindButton = audioPlayerContainer.querySelector('.rewind-button');
    const forwardButton = audioPlayerContainer.querySelector('.forward-button');
    const currentTimeSpan = audioPlayerContainer.querySelector('.current-time');
    const totalTimeSpan = audioPlayerContainer.querySelector('.total-time');

    if (!audioElement || !progressBar || !playPauseButton) return;

    let isDraggingProgressBar = false;

    playPauseButton.classList.remove('pause');
    playPauseButton.classList.add('play');

    const updatePlayerState = () => {
        if (audioElement.duration) {
            totalTimeSpan.textContent = formatTime(audioElement.duration);
            progressBar.max = audioElement.duration;
            progressBar.value = audioElement.currentTime;
            progressBar.style.setProperty('--progress', `${(audioElement.currentTime / audioElement.duration) * 100}%`);
        }
        currentTimeSpan.textContent = formatTime(audioElement.currentTime);
    };

    audioElement.addEventListener('canplay', updatePlayerState);
    if (audioElement.readyState >= 1) {
        updatePlayerState();
    }

    audioElement.addEventListener('timeupdate', () => {
        if (!isDraggingProgressBar) {
            updatePlayerState();
        }
    });

    audioElement.addEventListener('ended', () => {
        playPauseButton.classList.remove('pause');
        playPauseButton.classList.add('play');
        audioElement.currentTime = 0;
    });

    playPauseButton.onclick = () => {
        if (audioElement.paused) {
            audioElement.play();
            playPauseButton.classList.remove('play');
            playPauseButton.classList.add('pause');
        } else {
            audioElement.pause();
            playPauseButton.classList.remove('pause');
            playPauseButton.classList.add('play');
        }
    };

    rewindButton.onclick = () => {
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
    };

    forwardButton.onclick = () => {
        audioElement.currentTime = Math.min(audioElement.duration, audioElement.currentTime + 10);
    };

    progressBar.addEventListener('input', () => {
        isDraggingProgressBar = true;
        currentTimeSpan.textContent = formatTime(progressBar.value);
        progressBar.style.setProperty('--progress', `${(progressBar.value / progressBar.max) * 100}%`);
    });

    progressBar.addEventListener('change', () => {
        isDraggingProgressBar = false;
        audioElement.currentTime = progressBar.value;
    });

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
}

function initializePlayerForCurrentArticle() {
  if (currentArticleAudio && !currentArticleAudio.paused) {
      currentArticleAudio.pause();
  }

  const articleContainer = document.getElementById('article-container');
  const audioPlayerContainer = articleContainer.querySelector('.audio-player-container');

  if (audioPlayerContainer) {
      currentArticleAudio = audioPlayerContainer.querySelector('#articleAudioPlayer');
      setupAudioPlayer(audioPlayerContainer);
  }
}

function setupArticleHeaderScroll() {
  if (window.matchMedia("(max-width: 550px)").matches) return;

  const scrollWrapper = document.querySelector('.article-header-scroll-wrapper');
  const leftArrow = document.getElementById('scroll-left-btn');
  const rightArrow = document.getElementById('scroll-right-btn');

  if (!scrollWrapper || !leftArrow || !rightArrow) {
    return;
  }

  const updateArrowState = () => {
    const { scrollLeft, scrollWidth, clientWidth } = scrollWrapper;

    const isAtStart = scrollLeft < 1;
    const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 1;

    leftArrow.classList.toggle('disabled', isAtStart);
    rightArrow.classList.toggle('disabled', isAtEnd);
  };

  const scrollAmount = 300;
  rightArrow.addEventListener('click', () => { scrollWrapper.scrollLeft += scrollAmount; });
  leftArrow.addEventListener('click', () => { scrollWrapper.scrollLeft -= scrollAmount; });

  scrollWrapper.addEventListener('scroll', updateArrowState);

  const observer = new ResizeObserver(updateArrowState);
  observer.observe(scrollWrapper);
}