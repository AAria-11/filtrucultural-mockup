// Bottom mobile toolbar for pages that don't load app-part1/2/3.js (the map
// page and evenimente.html define their own richer handleToolbarClick that
// toggles panels in place instead of navigating away).
function handleToolbarClick(clickedButton) {
  var destinations = {
    'mobile-toolbar-map': 'index.html',
    'mobile-toolbar-filters': 'index.html',
    'mobile-toolbar-search': 'index.html',
    'mobile-toolbar-events': 'evenimente.html',
    'mobile-toolbar-articles': 'articole.html'
  };
  var dest = destinations[clickedButton.id];
  if (dest) window.location.href = dest;
}
