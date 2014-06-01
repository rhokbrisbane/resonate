


window.getCurrentLocation = function(cb) {
  if (localStorage && localStorage.getItem('current_location')) {
    return cb(localStorage.getItem('current_location').split(','));
  } else {
    return $.getJSON("https://freegeoip.net/json/?callback=?", function(data) {
      var latlng;
      latlng = [data.latitude, data.longitude];
      localStorage.setItem('current_location', latlng);
      return cb(latlng);
    });
  }
}


$(function() {
  window.map = L.map('map', {
    scrollWheelZoom: false
  });
  L.tileLayer('http://{s}.tile.stamen.com/{style}/{z}/{x}/{y}.png', {style: 'toner'}).addTo(map);
  L.control.locate({
    follow: true,
    icon: 'icon-target'
  }).addTo(map);

  getCurrentLocation(function(location) {
    map.setView(location, 15);
  });


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

});
