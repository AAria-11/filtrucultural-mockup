// Drives the audio player and photo gallery on the standalone article pages
// (articol-*.html). Each page has exactly one instance of these elements.

// Expands the long CDRF footnote (see .expanded #footnotes-more-text in styles.css/site.css).
window.toggleCDRFText = function (event) {
  if (event) event.preventDefault();
  var el = document.getElementById('footnotes-cdrf');
  if (!el) return;
  el.classList.toggle('expanded');
  var btn = document.getElementById('expand-text-btn');
  if (btn) {
    btn.textContent = el.classList.contains('expanded') ? 'Vezi mai puțin ↑' : 'Continuați să citiți ↓';
  }
};

// Used by inline "aici" footnote links to jump to a section on the same page.
window.scrollToSection = function (id, event) {
  if (event) event.preventDefault();
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

document.addEventListener('DOMContentLoaded', function () {
  var audio = document.getElementById('articleAudioPlayer');
  var playPauseBtn = document.querySelector('.play-pause-button');
  var rewindBtn = document.querySelector('.rewind-button');
  var forwardBtn = document.querySelector('.forward-button');
  var progressBar = document.querySelector('.audio-player-container .progress-bar');
  var currentTimeEl = document.querySelector('.current-time');
  var totalTimeEl = document.querySelector('.total-time');

  function formatTime(seconds) {
    if (!isFinite(seconds)) return '00:00';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  if (audio && playPauseBtn) {
    playPauseBtn.classList.add('play');

    audio.addEventListener('loadedmetadata', function () {
      totalTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', function () {
      if (audio.duration) {
        progressBar.value = (audio.currentTime / audio.duration) * 100;
      }
      currentTimeEl.textContent = formatTime(audio.currentTime);
    });

    playPauseBtn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play();
        playPauseBtn.classList.remove('play');
        playPauseBtn.classList.add('pause');
      } else {
        audio.pause();
        playPauseBtn.classList.remove('pause');
        playPauseBtn.classList.add('play');
      }
    });

    audio.addEventListener('ended', function () {
      playPauseBtn.classList.remove('pause');
      playPauseBtn.classList.add('play');
    });

    if (rewindBtn) {
      rewindBtn.addEventListener('click', function () {
        audio.currentTime = Math.max(0, audio.currentTime - 15);
      });
    }

    if (forwardBtn) {
      forwardBtn.addEventListener('click', function () {
        audio.currentTime = Math.min(audio.duration || audio.currentTime, audio.currentTime + 15);
      });
    }

    if (progressBar) {
      progressBar.addEventListener('input', function () {
        if (audio.duration) {
          audio.currentTime = (progressBar.value / 100) * audio.duration;
        }
      });
    }
  }

  // Bottom photo gallery: click any image to expand it full-screen. Desktop
  // gets click arrows + keyboard, mobile gets native swipe (same lightbox
  // pattern used for the map pin galleries on index.html).
  document.querySelectorAll('.image-gallery-container').forEach(function (gallery) {
    var mainImg = gallery.querySelector('.main-image img');
    var thumbImgs = Array.from(gallery.querySelectorAll('.thumbnail-article img'));
    if (!mainImg) return;

    // Original gallery order, captured once — clicking an image never
    // rearranges the thumbnail row.
    var images = [mainImg.getAttribute('src')].concat(
      thumbImgs.map(function (t) { return t.getAttribute('src'); })
    );

    var numPicsLabel = gallery.querySelector('.num-pics-label');
    if (numPicsLabel && window.matchMedia('(max-width: 550px)').matches) {
      numPicsLabel.textContent = '1 / ' + images.length;
    }

    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightbox-img');
    var lightboxCounter = lightbox ? lightbox.querySelector('.lightbox-counter') : null;
    var lightboxMobile = document.getElementById('lightbox-mobile');
    var scrollContainer = document.getElementById('scrollContainer');
    var mobileCounter = document.getElementById('mobileLightboxCounter');
    var currentIndex = 0;

    function updateDesktopImage() {
      lightboxImg.src = images[currentIndex];
      if (lightboxCounter) lightboxCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
    }

    window.openLightbox = function (index) {
      if (!lightbox || !lightboxImg) return;
      currentIndex = index;
      updateDesktopImage();
      lightbox.style.display = 'flex';
      document.addEventListener('keydown', onKeydown);
    };

    window.closeLightbox = function () {
      if (!lightbox) return;
      lightbox.style.display = 'none';
      document.removeEventListener('keydown', onKeydown);
    };

    window.changeImage = function (step) {
      currentIndex = (currentIndex + step + images.length) % images.length;
      updateDesktopImage();
    };

    function onKeydown(event) {
      if (event.key === 'ArrowLeft') window.changeImage(-1);
      else if (event.key === 'ArrowRight') window.changeImage(1);
      else if (event.key === 'Escape') window.closeLightbox();
    }

    window.openLightboxMobile = function (index) {
      if (!lightboxMobile || !scrollContainer) return;
      scrollContainer.innerHTML = '';
      images.forEach(function (src) {
        var img = document.createElement('img');
        img.src = src;
        scrollContainer.appendChild(img);
      });
      if (mobileCounter) mobileCounter.textContent = (index + 1) + ' / ' + images.length;
      scrollContainer.onscroll = function () {
        var i = Math.round(scrollContainer.scrollLeft / scrollContainer.clientWidth);
        if (mobileCounter) mobileCounter.textContent = (i + 1) + ' / ' + images.length;
      };
      lightboxMobile.style.display = 'flex';
      scrollContainer.scrollLeft = index * scrollContainer.clientWidth;
    };

    window.closeLightboxMobile = function () {
      if (!lightboxMobile || !scrollContainer) return;
      lightboxMobile.style.display = 'none';
      scrollContainer.innerHTML = '';
    };

    function openAt(index) {
      if (window.matchMedia('(max-width: 550px)').matches) {
        window.openLightboxMobile(index);
      } else {
        window.openLightbox(index);
      }
    }

    mainImg.addEventListener('click', function () { openAt(0); });
    thumbImgs.forEach(function (thumbImg, i) {
      thumbImg.addEventListener('click', function () { openAt(i + 1); });
    });

    if (lightbox) {
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) window.closeLightbox();
      });
    }
  });
});
