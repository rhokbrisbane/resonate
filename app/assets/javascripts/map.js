
var initMap = function initMap() {
  window.map = L.map('map', {
    scrollWheelZoom: false
  });
  L.tileLayer('http://{s}.tile.stamen.com/{style}/{z}/{x}/{y}.png', {style: 'toner'}).addTo(map);
  L.control.locate({
    follow: true,
    icon: 'icon-target'
  }).addTo(map);

  $.getJSON('/organisations.json', function(organisations) {
    window.markers = L.featureGroup();

    $.each(organisations, function(i, org) {
      var latlng = [org.latitude, org.longitude]

      var marker = L.circleMarker(latlng, {
        color: 'red'
      });
      marker.bindPopup(org.name);
      markers.addLayer(marker);
    });

    map.addLayer(markers);
    map.fitBounds( markers.getBounds() );
  });
}

$(function() {
  if ($('#map').length) { initMap(); }
});
