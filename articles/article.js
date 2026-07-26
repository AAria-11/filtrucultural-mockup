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

  // Bottom photo gallery: click a thumbnail to swap it with the main image.
  document.querySelectorAll('.image-gallery-container').forEach(function (gallery) {
    var mainImg = gallery.querySelector('.main-image img');
    var thumbs = gallery.querySelectorAll('.thumbnail-article img');
    thumbs.forEach(function (thumbImg) {
      thumbImg.addEventListener('click', function () {
        if (mainImg && thumbImg.getAttribute('src')) {
          var tmp = mainImg.src;
          mainImg.src = thumbImg.src;
          thumbImg.src = tmp;
        }
      });
    });
  });
});
