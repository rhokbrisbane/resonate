// Packaging/modules magic dance. This code is inserted before all other
// code when the dist is built.
(function (factory) {
    var L;
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['leaflet'], factory);
    } else if (typeof module !== 'undefined') {
        // Node/CommonJS
        L = require('leaflet');
        module.exports = factory(L);
    } else {
        // Browser globals
        if (typeof window.L === 'undefined')
            throw 'Leaflet must be loaded first';
        factory(window.L);
    }
}(function (L) {
(function() {
	'use strict';

	L.Routing = L.Routing || {};

	L.Routing._jsonpCallbackId = 0;
	L.Routing._jsonp = function(url, callback, context, jsonpParam) {
		var callbackId = '_l_routing_machine_' + (L.Routing._jsonpCallbackId++),
		    script;
		url += '&' + jsonpParam + '=' + callbackId;
		window[callbackId] = L.Util.bind(callback, context);
		script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;
		script.id = callbackId;
		document.getElementsByTagName('head')[0].appendChild(script);
	};

	L.Routing.OSRM = L.Class.extend({
		includes: L.Mixin.Events,
		options: {
			serviceUrl: '//router.project-osrm.org/viaroute',
			geometryPrecision: 6
		},

		initialize: function(options) {
			L.Util.setOptions(this, options);
			this._hints = {
				locations: {}
			};
		},

		route: function(waypoints) {
			var url = this._buildRouteUrl(waypoints);

			L.Routing._jsonp(url, function(data) {
				this._routeDone(data, waypoints);
			}, this, 'jsonp');
		},

		_routeDone: function(response, waypoints) {
			if (response.status !== 0) {
				this.fire('error', {
					status: response.status,
					message: response.message
				});
				return;
			}

			var alts = [{
					name: response.route_name,
					geometry: this._decode(response.route_geometry, this.options.geometryPrecision),
					instructions: response.route_instructions,
					summary: response.route_summary,
					waypoints: response.via_points
				}],
			    i;

			for (i = 0; i < response.alternative_geometries.length; i++) {
				alts.push({
					name: response.alternative_names[i],
					geometry: this._decode(response.alternative_geometries[i], this.options.geometryPrecision),
					instructions: response.alternative_instructions[i],
					summary: response.alternative_summaries[i],
					waypoints: response.via_points
				})
			}

			this._saveHintData(response, waypoints);
			this.fire('routefound', {routes: alts});
		},

		_buildRouteUrl: function(waypoints) {
			var locs = [],
			    locationKey,
			    hint;

			for (var i = 0; i < waypoints.length; i++) {
				locationKey = this._locationKey(waypoints[i]);
				locs.push('loc=' + locationKey);

				hint = this._hints.locations[locationKey];
				if (hint) {
					locs.push('hint=' + hint);
				}
			}

			return this.options.serviceUrl + '?' +
				'instructions=true&' +
				locs.join('&') +
				(this._hints.checksum !== undefined ? '&checksum=' + this._hints.checksum : '');
		},

		_locationKey: function(location) {
			return location.lat + ',' + location.lng;
		},

		_saveHintData: function(route, waypoints) {
			var hintData = route.hint_data,
			    loc;
			this._hints = {
				checksum: hintData.checksum,
				locations: {}
			};
			for (var i = hintData.locations.length - 1; i >= 0; i--) {
				loc = waypoints[i];
				this._hints.locations[this._locationKey(loc)] = hintData.locations[i];
			}
		},

		// Adapted from
		// https://github.com/DennisSchiefer/Project-OSRM-Web/blob/develop/WebContent/routing/OSRM.RoutingGeometry.js
		_decode: function(encoded, precision) {
			var len = encoded.length,
			    index=0,
			    lat=0,
			    lng = 0,
			    array = [];

			precision = Math.pow(10, -precision);

			while (index < len) {
				var b,
				    shift = 0,
				    result = 0;
				do {
					b = encoded.charCodeAt(index++) - 63;
					result |= (b & 0x1f) << shift;
					shift += 5;
				} while (b >= 0x20);
				var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
				lat += dlat;
				shift = 0;
				result = 0;
				do {
					b = encoded.charCodeAt(index++) - 63;
					result |= (b & 0x1f) << shift;
					shift += 5;
				} while (b >= 0x20);
				var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
				lng += dlng;
				//array.push( {lat: lat * precision, lng: lng * precision} );
				array.push( [lat * precision, lng * precision] );
			}
			return array;
		}
	});

	L.Routing.osrm = function(options) {
		return new L.Routing.OSRM(options);
	};
})();
(function() {
	'use strict';

	L.Routing = L.Routing || {};

	L.Routing.Line = L.Class.extend({
		includes: L.Mixin.Events,

		options: {
			styles: [
				{color: 'black', opacity: 0.15, weight: 7},
				{color: 'white', opacity: 0.8, weight: 4},
				{color: 'orange', opacity: 1, weight: 2}
			],
			addWaypoints: true
		},

		initialize: function(route, options) {
			L.Util.setOptions(this, options);
			this._route = route;

			this._wpIndices = this._findWaypointIndices();
		},

		addTo: function(map) {
			map.addLayer(this);
		},

		onAdd: function(map) {
			var geom = this._route.geometry,
			    i,
			    pl;

			this._map = map;
			this._layers = [];
			for (i = 0; i < this.options.styles.length; i++) {
				pl = L.polyline(geom, this.options.styles[i])
					.addTo(map);
				if (this.options.addWaypoints) {
					pl.on('mousedown', this._onLineTouched, this);
				}
				this._layers.push(pl);
			}
		},

		onRemove: function(map) {
			var i;
			for (i = 0; i < this._layers.length; i++) {
				map.removeLayer(this._layers[i]);
			}

			delete this._map;
		},

		getBounds: function() {
			return L.latLngBounds(this._route.geometry);
		},

		_findWaypointIndices: function() {
			var wps = this._route.waypoints,
			    indices = [],
			    i;
			for (i = 0; i < wps.length; i++) {
				indices.push(this._findClosestRoutePoint(L.latLng(wps[i])));
			}

			return indices;
		},

		_findClosestRoutePoint: function(latlng) {
			var minDist = Number.MAX_VALUE,
				minIndex,
			    i,
			    d;

			for (i = this._route.geometry.length - 1; i >= 0 ; i--) {
				// TODO: maybe do this in pixel space instead?
				d = latlng.distanceTo(this._route.geometry[i]);
				if (d < minDist) {
					minIndex = i;
					minDist = d;
				}
			}

			return minIndex;
		},

		_findNearestWpBefore: function(i) {
			var j = this._wpIndices.length - 1;
			while (j >= 0 && this._wpIndices[j] > i) {
				j--;
			}

			return j;
		},

		_onLineTouched: function(e) {
			var afterIndex = this._findNearestWpBefore(this._findClosestRoutePoint(e.latlng));
			this.fire('linetouched', {
				afterIndex: afterIndex,
				latlng: e.latlng
			});
		},
	});

	L.Routing.line = function(route, options) {
		return new L.Routing.Line(route, options);
	};
})();
(function() {
	'use strict';

	L.Routing = L.Routing || {};

	L.Routing.Itinerary = L.Control.extend({
		includes: L.Mixin.Events,

		options: {
			units: 'metric'
		},

		initialize: function(router, options) {
			L.setOptions(this, options);
			this._router = router;
		},

		onAdd: function() {
			this._container = L.DomUtil.create('div', 'leaflet-routing-container leaflet-bar');
			L.DomEvent.disableClickPropagation(this._container);
			this._router.on('routefound', this._routeFound, this);
			return this._container;
		},

		onRemove: function() {
			this._router.off('routefound', this._routeFound, this);
		},

		_routeFound: function(e) {
			var i,
			    alt,
			    altDiv;

			this._clearAlts();

			this._routes = e.routes;

			for (i = 0; i < e.routes.length; i++) {
				alt = e.routes[i];
				altDiv = L.DomUtil.create('div', 'leaflet-routing-alt' +
					(i > 0 ? ' leaflet-routing-alt-minimized' : ''),
					this._container);
				altDiv.innerHTML = '<h2>' + alt.name.join(', ') + '</h2>' +
					'<h3>' + this._formatDistance(alt.summary.total_distance) +
					', ' + this._formatTime(alt.summary.total_time) + '</h3>';
				L.DomEvent.addListener(altDiv, 'click', this._onAltClicked, this);

				altDiv.appendChild(this._createItineraryTable(alt));
				this._altElements.push(altDiv);
			}

			this.fire('routeselected', {route: this._routes[0]});
		},

		_clearAlts: function() {
			var i,
				alt;
			// TODO: this is really inelegant
			for (i = 0; this._container && i < this._container.children.length; i++) {
				alt = this._container.children[i];
				if (L.DomUtil.hasClass(alt, 'leaflet-routing-alt')) {
					this._container.removeChild(alt);
					i--;
				}
			}

			this._altElements = [];
		},

		_createItineraryTable: function(r) {
			var table = L.DomUtil.create('table', ''),
			    body = L.DomUtil.create('tbody', '', table),
			    i,
			    instr,
			    row;

			for (i = 0; i < r.instructions.length; i++) {
				instr = r.instructions[i];
				row = L.DomUtil.create('tr', '', body);
				row.innerHTML =
					'<td>' + this._instruction(instr, i) + '</td>' +
					'<td>' + this._formatDistance(instr[2]) + '</td>';
			}

			return table;
		},

		_onAltClicked: function(e) {
			var altElem,
			    j,
			    n,
			    isCurrentSelection;

			altElem = e.target;
			while (!L.DomUtil.hasClass(altElem, 'leaflet-routing-alt')) {
				altElem = altElem.parentElement;
			}

			for (j = 0; j < this._altElements.length; j++) {
				n = this._altElements[j];
				isCurrentSelection = altElem === n;
				L.DomUtil[isCurrentSelection ? 'removeClass' : 'addClass'](n, 'leaflet-routing-alt-minimized');

				if (isCurrentSelection) {
					// TODO: don't fire if the currently active is clicked
					this.fire('routeselected', {route: this._routes[j]});
				}
			}

			L.DomEvent.stop(e);
		},

		_formatDistance: function(d /* Number (meters) */) {
			var v;

			if (this.options.units === 'imperial') {
				d = d / 1.609344;
				if (d >= 1000) {
					return (this._round(d) / 1000) + ' mi';
				} else {
					return this._round(d / 1.760) + ' yd';
				}
			} else {
				v = this._round(d);
				return v >= 1000 ? ((v / 1000) + ' km') : (v + ' m');
			}
		},

		_round: function(d) {
			var pow10 = Math.pow(10, (Math.floor(d) + '').length - 1),
				r = Math.floor(d / pow10 * 2),
				p = r % 2 ? pow10 / 2 : pow10;

			return Math.round(d / p) * p;
		},

		_formatTime: function(t /* Number (seconds) */) {
			if (t > 86400) {
				return Math.round(t / 3600) + ' h';
			} else if (t > 3600) {
				return Math.floor(t / 3600) + ' h ' +
					Math.round((t % 3600) / 60) + ' min';
			} else if (t > 300) {
				return Math.round(t / 60) + ' min';
			} else if (t > 60) {
				return Math.floor(t / 60) + ' min ' +
					(t % 60) + ' s';
			} else {
				return t + ' s';
			}
		},

		_instruction: function(instr, i) {
			var template,
			    driveDir = instr[0].split('-');

			switch (parseInt(driveDir, 10)) {
			case 0:
				template = '';
				break;
			case 1:
				template = (i === 0 ? 'Head' : 'Continue') + ' {dir}' + (instr[1] ? ' on {1}' : '');
				break;
			case 2:
				template = 'Slight right' + (instr[1] ? ' onto {1}' : '');
				break;
			case 3:
				template = 'Right' + (instr[1] ? ' onto {1}' : '');
				break;
			case 4:
				template = 'Sharp right' + (instr[1] ? ' onto {1}' : '');
				break;
			case 5:
				template = 'Turn around';
				break;
			case 6:
				template = 'Sharp left' + (instr[1] ? ' onto {1}' : '');
				break;
			case 7:
				template = 'Left' + (instr[1] ? ' onto {1}' : '');
				break;
			case 8:
				template = 'Slight left' + (instr[1] ? ' onto {1}' : '');
				break;
			case 9:
				template = 'Waypoint reached';
				break;
			case 10:
				template =  'Head {dir}';
				break;
			case 11:
				template =  'Take the {exit} exit in the roundabout';
				break;
			case 12:
				template =  'Leave the roundabout by the {exit} exit';
				break;
			case 13:
				template =  'Stay on roundabout';
				break;
			case 14:
				template =  'Start at end of {1}';
				break;
			case 15:
				template =  'Destination reached';
				break;
			case 16:
				template =  'Enter against allowed direction';
				break;
			case 17:
				template =  'Leave against allowed direction';
				break;
			}

			return L.Util.template(template, L.extend({exit: this._formatOrder(driveDir[1]), dir: this._dir[instr[6]]}, instr));
		},

		_formatOrder: function(n) {
			var i = n % 10 - 1,
				suffix = ['st', 'nd', 'rd'];

			return suffix[i] ? n + suffix[i] : n + 'th';
		},

		_dir: {
			N: 'north',
			NE: 'northeast',
			E: 'east',
			SE: 'southeast',
			S: 'south',
			SW: 'southwest',
			W: 'west',
			NW: 'northwest'
		}
	});

	L.Routing.Itinerary._instructions = {
	};

	L.Routing.itinerary = function(router) {
		return new L.Routing.Itinerary(router);
	};
})();
(function() {
	'use strict';

	var Waypoint = L.Class.extend({
			initialize: function(latLng, name) {
				this.latLng = latLng;
				this.name = name;
			}
		}),
	    GeocoderResults = L.Class.extend({
			initialize: function(results) {
				this._results = results;
			},

			addTo: function(elem) {
				var container = L.DomUtil.create('table', 'leaflet-routing-geocoder-result'),
					sibling = elem.nextSibling,
				    i,
				    tr,
				    td;

				this._elem = elem;

				for (i = 0; i < this._results.length; i++) {
					tr = L.DomUtil.create('tr', '', container);
					tr.setAttribute('data-result-index', i);
					td = L.DomUtil.create('td', '', tr);
					td.textContent = this._results[i].name;
					L.DomEvent.addListener(td, 'click', this._listener(this._results[i]), this);
				}

				L.DomEvent.addListener(elem, 'keydown', this._keyPressed, this);

				container.style.left = elem.offsetLeft;
				container.style.top = elem.offsetTop + elem.offsetHeight;
				container.style.width = elem.offsetWidth;

				if (sibling) {
					elem.parentElement.insertBefore(container, sibling);
				} else {
					elem.parentElement.appendChild(container);
				}

				this._container = container;

				return this;
			},

			onResultSelected: function() {},

			_listener: function(r) {
				return function() {
					this.onResultSelected(r);
				};
			},

			_keyPressed: function(e) {
				var _this = this,
					select = function select(dir) {
						if (_this._selection) {
							L.DomUtil.removeClass(_this._selection.firstChild, 'leaflet-routing-geocoder-selected');
							_this._selection = _this._selection[dir > 0 ? 'nextSibling' : 'previousSibling'];
						}
						if (!_this._selection) {
							_this._selection = _this._container[dir > 0 ? 'firstChild' : 'lastChild'];
						}

						if (_this._selection) {
							L.DomUtil.addClass(_this._selection.firstChild, 'leaflet-routing-geocoder-selected');
						}
					},
					index;

				switch (e.keyCode) {
				// Up
				case 38:
					select(-1);
					L.DomEvent.preventDefault(e);
					break;
				// Up
				case 40:
					select(1);
					L.DomEvent.preventDefault(e);
					break;
				// Enter
				case 13:
					if (this._selection) {
						index = parseInt(this._selection.getAttribute('data-result-index'), 10);
						this.onResultSelected(this._results[index]);
						L.DomEvent.preventDefault(e);
					}
				}
				return true;
			},

			remove: function() {
				if (this._container) {
					L.DomEvent.removeListener(this._elem, 'keydown', this._keyPressed);
					this._container.parentElement.removeChild(this._container);
					delete this._container;
					delete this._elem;
				}
			}
		});

	L.Routing = L.Routing || {};

	L.Routing.Plan = L.Class.extend({
		includes: L.Mixin.Events,

		options: {
			dragStyles: [
				{color: 'black', opacity: 0.15, weight: 7},
				{color: 'white', opacity: 0.8, weight: 4},
				{color: 'orange', opacity: 1, weight: 2, dashArray: '7,12'}
			],
			draggableWaypoints: true,
			addWaypoints: true
		},

		initialize: function(waypoints, options) {
			L.Util.setOptions(this, options);
			this._waypoints = [];
			this.setWaypoints(waypoints);
		},

		isReady: function() {
			var i;
			for (i = 0; i < this._waypoints.length; i++) {
				if (!this._waypoints[i].latLng) {
					return false;
				}
			}

			return true;
		},

		getWaypoints: function() {
			var i,
				wps = [];

			for (i = 0; i < this._waypoints.length; i++) {
				wps.push(this._waypoints[i].latLng);
			}

			return wps;
		},

		setWaypoints: function(waypoints) {
			var args = [0, this._waypoints.length].concat(waypoints);
			this.spliceWaypoints.apply(this, args);
		},

		spliceWaypoints: function() {
			var args = [arguments[0], arguments[1]],
			    i,
			    wp;

			for (i = 2; i < arguments.length; i++) {
				args.push(new Waypoint(arguments[i]));
			}

			[].splice.apply(this._waypoints, args);

			while (this._waypoints.length < 2) {
				wp = new Waypoint();
				this._waypoints.push(wp);
				args.push(wp);
			}

			this._updateMarkers();
			this._fireChanged.apply(this, args);
		},

		onAdd: function(map) {
			this._map = map;
			this._updateMarkers();
		},

		onRemove: function() {
			var i;
			this._removeMarkers();

			if (this._newWp) {
				for (i = 0; i < this._newWp.lines.length; i++) {
					this._map.removeLayer(this._newWp.lines[i]);
				}
			}

			delete this._map;
		},

		createGeocoders: function() {
			var container = L.DomUtil.create('div', 'leaflet-routing-geocoders'),
				waypoints = this._waypoints,
			    i,
			    geocoderElem,
			    addWpBtn;

			this._geocoderContainer = container;
			this._geocoderElems = [];

			for (i = 0; i < waypoints.length; i++) {
				geocoderElem = this._createGeocoder(i);
				container.appendChild(geocoderElem);
				this._geocoderElems.push(geocoderElem);
			}

			addWpBtn = L.DomUtil.create('button', '', container);
			addWpBtn.type = 'button';
			addWpBtn.innerHTML = '+';
			L.DomEvent.addListener(addWpBtn, 'click', function() {
				this.spliceWaypoints(waypoints.length, 0, null);
			}, this);

			this.on('waypointsspliced', this._updateGeocoders);

			return container;
		},

		_createGeocoder: function(i) {
			var geocoderElem;

			geocoderElem = L.DomUtil.create('input', '');
			geocoderElem.placeholder = this._geocoderPlaceholder(i);

			this._updateWaypointName(i);

			L.DomEvent.addListener(geocoderElem, 'keydown', function(e) {
				var i,
					siblings = geocoderElem.parentElement.children,
					thisIndex = null;

				if (e.keyCode === 13 && !this._geocoderResultsOpen) {
					for (i = 0; i < siblings.length && thisIndex === null; i++) {
						if (siblings[i] === geocoderElem) {
							thisIndex = i;
						}
					}

					this.options.geocoder.geocode(e.target.value, function(results) {
						var gr,
							_this = this;
						if (results.length === 1) {
							geocoderElem.value = results[0].name;
							this._waypoints[thisIndex].name = results[0].name;
							this._waypoints[thisIndex].latLng = results[0].center;
							this._updateMarkers();
							this._fireChanged();
						} else {
							gr = new GeocoderResults(results).addTo(geocoderElem);
							this._geocoderResultsOpen = true;
							L.DomEvent.addListener(geocoderElem, 'blur', function() {
								// Don't remove before onResultSelected has got a chance to fire
								// TODO: this looks like a hack
								setTimeout(function() {
									gr.remove();
									_this._geocoderResultsOpen = false;
								}, 50);
							});
							gr.onResultSelected = function(r) {
								gr.remove();
								geocoderElem.value = r.name;
								_this._waypoints[thisIndex].name = r.name;
								_this._waypoints[thisIndex].latLng = r.center;
								_this._updateMarkers();
								_this._fireChanged();
							};
						}
					}, this);
				}
			}, this);

			return geocoderElem;
		},

		_updateGeocoders: function(e) {
			var newElems = [],
			    i,
			    geocoderElem,
			    beforeElem;
			for (i = e.added.length - 1; i >= 0 ; i--) {
				geocoderElem = this._createGeocoder(e.index + i);
				if (e.index >= this._geocoderElems.length) {
					// lastChild is the "add new wp" button
					beforeElem = this._geocoderContainer.lastChild;
				} else {
					beforeElem = this._geocoderElems[e.index];
				}
				this._geocoderContainer.insertBefore(geocoderElem, beforeElem);
				newElems.push(geocoderElem);
			}
			newElems.reverse();

			for (i = e.index; i < e.index + e.nRemoved; i++) {
				this._geocoderContainer.removeChild(this._geocoderElems[i]);
			}

			newElems.splice(0, 0, e.index, e.nRemoved);
			[].splice.apply(this._geocoderElems, newElems);

			for (i = 0; i < this._geocoderElems.length; i++) {
				this._geocoderElems[i].placeholder = this._geocoderPlaceholder(i);
			}
		},

		_geocoderPlaceholder: function(i) {
			return i === 0 ?
				'Start' :
				(i < this._geocoderElems.length - 1 ?
								'Via ' + i :
								'End');
		},

		_updateWaypointName: function(i, force) {
			var wp = this._waypoints[i];
			if (this.options.geocoder && wp.latLng && (force || !wp.name)) {
				this.options.geocoder.reverse(wp.latLng, 67108864 /* zoom 18 */, function(rs) {
					if (rs.length > 0 && rs[0].center.distanceTo(wp.latLng) < 200) {
						wp.name = rs[0].name;
					} else {
						wp.name = '';
					}
					this._geocoderElems[i].value = wp.name;
				}, this);
			}
		},

		_removeMarkers: function() {
			var i;
			if (this._markers) {
				for (i = 0; i < this._markers.length; i++) {
					if (this._markers[i]) {
						this._map.removeLayer(this._markers[i]);
					}
				}
			}
			this._markers = [];
		},

		_updateMarkers: function() {
			var i,
			    icon,
			    options,
			    m;

			if (!this._map) {
				return;
			}

			this._removeMarkers();

			for (i = 0; i < this._waypoints.length; i++) {
				if (this._waypoints[i].latLng) {
					icon = (typeof(this.options.waypointIcon) === 'function') ?
						this.options.waypointIcon(i, this._waypoints[i].name, this._waypoints.length) :
						this.options.waypointIcon;
					options = {
						draggable: true
					};
					if (icon) {
						options.icon = icon;
					}

					m = L.marker(this._waypoints[i].latLng, options).addTo(this._map);
					if (this.options.draggableWaypoints) {
						this._hookWaypointEvents(m, i);
					}
				} else {
					m = null;
				}
				this._markers.push(m);
			}
		},

		_fireChanged: function() {
			this.fire('waypointschanged', {waypoints: this.getWaypoints()});

			if (arguments.length >= 2) {
				this.fire('waypointsspliced', {
					index: Array.prototype.shift.call(arguments),
					nRemoved: Array.prototype.shift.call(arguments),
					added: arguments
				});
			}
		},

		_hookWaypointEvents: function(m, i) {
			m.on('dragstart', function(e) {
				this.fire('waypointdragstart', this._createWaypointEvent(i, e));
			}, this);
			m.on('drag', function(e) {
				this.fire('waypointdrag', this._createWaypointEvent(i, e));
			}, this);
			m.on('dragend', function(e) {
				this.fire('waypointdragend', this._createWaypointEvent(i, e));
				this._waypoints[i].latLng = e.target.getLatLng();
				this._waypoints[i].name = '';
				this._updateWaypointName(i, true);
				this._fireChanged();
			}, this);
		},

		_createWaypointEvent: function(i, e) {
			return {index: i, latlng: e.target.getLatLng()};
		},

		dragNewWaypoint: function(e) {
			var i;
			this._newWp = {
				afterIndex: e.afterIndex,
				marker: L.marker(e.latlng).addTo(this._map),
				lines: []
			};

			for (i = 0; i < this.options.dragStyles.length; i++) {
				this._newWp.lines.push(L.polyline([
					this._waypoints[e.afterIndex].latLng,
					e.latlng,
					this._waypoints[e.afterIndex + 1].latLng
				], this.options.dragStyles[i]).addTo(this._map));
			}

			this._markers.splice(e.afterIndex + 1, 0, this._newWp.marker);
			this._map.on('mousemove', this._onDragNewWp, this);
			this._map.on('mouseup', this._onWpRelease, this);
		},

		_onDragNewWp: function(e) {
			var i;
			this._newWp.marker.setLatLng(e.latlng);
			for (i = 0; i < this._newWp.lines.length; i++) {
				this._newWp.lines[i].spliceLatLngs(1, 1, e.latlng);
			}
		},

		_onWpRelease: function(e) {
			var i;
			this._map.off('mouseup', this._onWpRelease, this);
			this._map.off('mousemove', this._onDragNewWp, this);
			for (i = 0; i < this._newWp.lines.length; i++) {
				this._map.removeLayer(this._newWp.lines[i]);
			}
			this.spliceWaypoints(this._newWp.afterIndex + 1, 0, e.latlng);
			delete this._newWp;
		}
	});

	L.Routing.plan = function(waypoints, options) {
		return new L.Routing.Plan(waypoints, options);
	};
})();
(function() {
	'use strict';

	L.Routing.Control = L.Routing.Itinerary.extend({
		options: {
		},

		initialize: function(options) {
			L.Util.setOptions(this, options);

			this._router = this.options.router || new L.Routing.OSRM();
			this._plan = this.options.plan || L.Routing.plan(undefined, { geocoder: this.options.geocoder });
			if (this.options.geocoder) {
				this._plan.options.geocoder = this.options.geocoder;
			}
			if (this.options.waypoints) {
				this._plan.setWaypoints(this.options.waypoints);
			}

			L.Routing.Itinerary.prototype.initialize.call(this, this._router, options);

			this.on('routeselected', this._routeSelected, this);
			this._plan.on('waypointschanged', this._route, this);

			this._route();
		},

		onAdd: function(map) {
			var container = L.Routing.Itinerary.prototype.onAdd.call(this, map);

			this._map = map;
			this._map.addLayer(this._plan);

			if (this.options.geocoder) {
				container.insertBefore(this._plan.createGeocoders(), container.firstChild);
			}

			return container;
		},

		onRemove: function(map) {
			if (this._line) {
				map.removeLayer(this._line);
			}
			map.removeLayer(this._plan);
			return L.Routing.Itinerary.prototype.onRemove.call(this, map);
		},

		setWaypoints: function(waypoints) {
			this._plan.setWaypoints(waypoints);
		},

		spliceWaypoints: function() {
			var removed = this._plan.spliceWaypoints.apply(this._plan, arguments);
			return removed;
		},

		getPlan: function() {
			return this._plan;
		},

		_routeSelected: function(e) {
			var route = e.route;
			this._clearLine();

			this._line = L.Routing.line(route);
			this._line.addTo(this._map);
			this._map.fitBounds(this._line.getBounds());
			this._hookEvents(this._line);
		},

		_hookEvents: function(l) {
			l.on('linetouched', function(e) {
				this._plan.dragNewWaypoint(e);
			}, this);
		},

		_route: function() {
			this._clearLine();
			this._clearAlts();
			if (this._plan.isReady()) {
				this._router.route(this._plan.getWaypoints());
			}
		},

		_clearLine: function() {
			if (this._line) {
				this._map.removeLayer(this._line);
				delete this._line;
			}
		}
	});

	L.Routing.control = function(options) {
		return new L.Routing.Control(options);
	};
})();
    return L.Routing;
}));
// Packaging/modules magic dance end. This code is inserted after all other
// code when the dist is built.
