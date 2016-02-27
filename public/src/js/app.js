/**
 * Las Vegas Diamond Hotels Map App
 * @namespace {object} app
 */
var app = app || {};


/**
 * Callback for Google Maps. Runs after the maps api is loaded.
 *
 * @function app.init
 * @memberof app
 */
app.init = function() {
    app.model = new app.Hotel();
    app.vm = new app.ViewModel();
    app.hv = new app.HotelView();
    app.mv = new app.MapView();

    // Get the hotel data
    app.model.init();

    // Init Hotel View click event listeners
    app.hv.init();

    // Activate Knockout bindings on the ViewModel
    ko.applyBindings(app.vm);
};


/**
 * Callback for onerror. If a script resource has an error, then a message is displayed.
 *
 * @function app.errorHandler
 * @memberof app
 */
app.errorHandler = function(x) {
    var m = document.getElementById('map');
    m.innerHTML = 'There was an error loading the ' + x + ' script.';
};


/**
 * Hotel
 * @name app.Hotel
 * @class Hotel
 * @memberof app
 */
app.Hotel = function() {
    'use strict';

    var self = this;

    self.hotels = ko.observableArray();
    self.yelp = {};

    /**
     * @typedef Hotels
     * @type Object
     * @property {string} name - Name of hotel
     * @property {string} id - Yelp business ID
     * @property {object} location - Hotel coordinates
     * @property {number} location.lat - Latitude
     * @property {number} location.lng - Longitude
     * @property {number} diamonds - Diamond rating of hotel
     */

    /**
     * Retrieves the hotels json from Firebase server.
     *
     * @function app.Hotel.init
     * @memberof app.Hotel
     * @see {@link https://www.firebase.com/docs/web/guide/retrieving-data.html#section-reading-once}
     * @see {@link https://www.firebase.com/docs/web/api/query/once.html}
     * @returns {Hotels} - Hotel data in json notation
     */
    self.init = function() {
        var hotelsRef;
        var hotelsJSON;
        var i = 0;
        var hotel = [];
        var length = 0;

        // Start the 10 second timer
        self.reqTimeout();

        hotelsRef = new Firebase('https://crackling-heat-3113.firebaseio.com');

        // Read the data only once
        hotelsRef.once('value', function(dataSnapshot) {

            self.yelp = dataSnapshot.child('yelp').val();

            hotelsJSON = dataSnapshot.child('hotels').val();

            // Store all the hotel data in app.Hotel.hotels
            length = hotelsJSON.length;
            for (i; i < length; i++) {
                hotel = hotelsJSON[i];
                hotel.content = null;

                // Save each hotel into a Knockout Observable Array
                self.hotels.push(hotel);
            }

            // Initialize the map with the hotels
            app.vm.init();

        }, function (errorObject) {
            // Called when client does not have permission to read this data
            var errMsg = 'Could not load hotel data. The read failed with error code: ';
                errMsg += errorObject.code + '. Please contact the webmaster.';
            document.getElementById('map').innerHTML = errMsg;
        });
    }; // init

    /**
     * Timer that displays an error message if map has not loaded.
     *
     * @function app.Hotel.reqTimeout
     * @memberof app.Hotel
     */
    self.reqTimeout = function () {
        var m = document.getElementById('map');
        var errMsg = 'Map request timed out. Check your connection and refresh the page.';
        setTimeout( function() {
            // Check to see if the map is loaded
            if(m.children[0].nodeName === 'FIGCAPTION') {
               // Display error message if no map found
               m.innerHTML = errMsg;
            }
        }, 10000);
    }; // reqTimeout

}; // Hotel


/**
 * ViewModel
 * @name app.ViewModel
 * @class ViewModel
 * @memberof app
 */
app.ViewModel = function() {
    'use strict';

    var self = this;

    self.hotelList = ko.observableArray();
    self.filterList = ko.observableArray();
    self.filterText = ko.observable('');
    self.ratingsChecked = ko.observableArray();
    self.ratings = ko.observableArray([
        {ratingValue: 5, icon: 'aaaaa', color: 'red'},
        {ratingValue: 4, icon: 'aaaa', color: 'yellow'},
        {ratingValue: 3, icon: 'aaa', color: 'green'},
        {ratingValue: 2, icon: 'aa', color: 'purple'},
    ]);

    /**
     * @function app.ViewModel.getRatings
     * @memberof app.ViewModel
     * @returns {array} - List of diamond rating value, icon, and color
     */
    self.getRatings = function() {
        return self.ratings();
    };

    /**
     * @function app.ViewModel.nameSort
     * @memberof app.ViewModel
     * @returns {array} - Alphabetically sorted list of hotel names
     */
    self.nameSort = function(left, right) {
        return left.name == right.name ? 0 : (left.name < right.name ? -1 : 1);
    };

    /**
     * @function app.ViewModel.getHotels
     * @memberof app.ViewModel
     * @returns {array} - An array of objects for each hotel
     */
    self.getHotels = ko.computed(function() {
        // Unwrap the observable to return an array
        var hotelArray = app.model.hotels();

        // Sort the array by hotel name
        hotelArray.sort(self.nameSort);

        return hotelArray;
    });

    /**
     * @function app.ViewModel.getHotelsLength
     * @memberof app.ViewModel
     * @returns {number} - The length of the hotels array
     */
    self.getHotelsLength = ko.computed(function() {
        return app.model.hotels().length;
    });

    /**
     * @function app.ViewModel.getKeys
     * @memberof app.ViewModel
     * @returns {object} - Yelp API keys
     */
    self.getKeys = function() {
        return app.model.yelp;
    };

    /**
     * Saves the list of hotels and initializes the map.
     *
     * @function app.ViewModel.init
     * @memberof app.ViewModel
     */
    self.init = function() {
        self.hotelList(self.getHotels());
        app.mv.initMap();
    };

    /**
     * Slides in the filter menu and resizes the map.
     *
     * @function app.ViewModel.slideIn
     * @memberof app.ViewModel
     */
    self.slideIn = function() {
        app.hv.slideInLeft();
        google.maps.event.trigger(app.mv.map,'resize');
    };

    /**
     * Slides out the filter menu, resizes the map, and centers the map on the marker.
     * If the screen height is greater than 400px, it will pan the map down 120px to make room for the infoWindow.
     *
     * @function app.ViewModel.slideOut
     * @memberof app.ViewModel
     */
    self.slideOut = function() {
        app.hv.slideOutLeft();
        google.maps.event.trigger(app.mv.map,'resize');
        app.mv.map.setCenter(app.mv.currentLocation);
        if(window.screen.height > 400) app.mv.map.panBy(0, -120);
    };

    /**
     * Prevents the page from refreshing when the <ENTER> key is pressed.
     *
     * @function app.ViewModel.noEnter
     * @memberof app.ViewModel
     * @returns {boolean} - False
     */
    self.noEnter = function(data, event) {
        // Prevent form submission
        return false;
    };

    /**
     * Runs when a hotel is selected in the list view.
     *
     * @function app.ViewModel.gotoHotel
     * @memberof app.ViewModel
     */
    self.gotoHotel = function(hotel) {
        // Re-center the map on the marker that was clicked
        app.mv.map.setCenter(hotel.location);

        // Pan down 120px (keeps tall infoWindow from getting cutoff)
        // Do not pan if in landscape mode
        if(window.screen.height > 400) app.mv.map.panBy(0, -120);

        app.mv.infoWindow.close();

        // Manually trigger the click event for the marker
        google.maps.event.trigger(hotel.marker, 'click');
    };

    /**
     * Toggles diamond rating checkbox, and filters hotels displayed by rating.
     *
     * @function app.ViewModel.filterRatings
     * @memberof app.ViewModel
     */
    self.filterRatings = function(data, event) {
        self.hotelDisplay();

        // Return true to toggle checkbox
        return true;
    };

    /**
     * Displays the Diamond Rating Definitions.
     *
     * @function app.ViewModel.open
     * @memberof app.ViewModel
     */
    self.open = function() {
        app.hv.openInfo();
    };

    /**
     * Hides the Diamond Rating Definitions.
     *
     * @function app.ViewModel.close
     * @memberof app.ViewModel
     */
    self.close = function() {
        app.hv.closeInfo();
    };

    /**
     * Real time filtering of hotels displayed in the list and map.
     *
     * @function app.ViewModel.hotelDisplay
     * @memberof app.ViewModel
     * @returns {object} - Filtered list of hotels
     */
    self.hotelDisplay = ko.computed(function() {
        var result = -1;
        var temp = [];
        var query = self.filterText().toLowerCase();
        var rlength = self.ratingsChecked().length;
        var diamond = 0;
        var match = -1;

        // Copy the original hotel list array
        self.filterList(self.hotelList());

        if (!query && rlength <= 0) {
            // Make all the hotel markers visible
            self.filterList().forEach(function(hotel, index) {
                // Prevents error if marker is not set yet
                if(hotel.marker) hotel.marker.setVisible(true);
            });

            // Return all the hotels
            return self.filterList;
        } else {
            self.filterList().forEach(function(hotel, index) {
                // Check if the query matches with the hotel name
                result = hotel.name.toLowerCase().indexOf(query);
                diamond = hotel.diamonds;

                // Ratings check
                if(rlength > 0)
                    match = self.ratingsChecked.indexOf(diamond);
                else
                    match = 0;

                if(result >= 0 && match >= 0) {
                    hotel.marker.setVisible(true);
                    temp.push(hotel);
                } else {
                    hotel.marker.setVisible(false);
                    app.mv.infoWindow.close();
                }
            }); // forEach

            // Save the filtered hotels back to the ko observable array
            self.filterList(temp);

            return self.filterList;
        } // else
    }); // hotelDisplay

}; // ViewModel


/**
 * HotelView
 * @name app.HotelView
 * @class HotelView
 * @memberof app
 */
app.HotelView = function() {
    'use strict';

    var self = this;

    self.slide = document.getElementById('slide');
    self.animateIn = 'animated slideInLeft no-overlay';
    self.animateOut = 'animated fadeOutLeft overlay';
    self.h3 = document.getElementsByTagName('h3');
    self.def = document.getElementById('definitions');

    /**
     * Updates the class property to slide the menu in.
     *
     * @function app.HotelView.slideInLeft
     * @memberof app.HotelView
     */
    self.slideInLeft = function() {
        self.slide.className = self.animateIn;
    };

    /**
     * Updates the class property to slide the menu out.
     *
     * @function app.HotelView.slideOutLeft
     * @memberof app.HotelView
     */
    self.slideOutLeft = function() {
        self.slide.className = self.animateOut;
    };

    /**
     * Adds 'block' to display property.
     *
     * @function app.HotelView.openInfo
     * @memberof app.HotelView
     */
    self.openInfo = function() {
        self.def.style.display = 'block';
    };

    /**
     * Removes 'block' from display property.
     *
     * @function app.HotelView.closeInfo
     * @memberof app.HotelView
     */
    self.closeInfo = function() {
        self.def.style.display = '';
    };

    /**
     * Toggles arrow icon and toggles display of the section under the header.
     *
     * @function app.HotelView.toggleDisplay
     * @memberof app.HotelView
     */
    self.toggleDisplay = function(headElem, iconClass) {
        if (iconClass != 'icons icon-down') {
            iconClass  = 'icons icon-down';

            // Show the section under the heading
            headElem.nextElementSibling.style.display = 'block';
        } else {
            iconClass = 'icons icon-right';

            // Hide the section under the heading
            headElem.nextElementSibling.style.display = 'none';
        }

        return iconClass;
    };

    /**
     * Updates the class property for the icon inside the header.
     *
     * @function app.HotelView.setIcon
     * @memberof app.HotelView
     */
    self.setIcon = function(e) {
        var elem;

        // Fix for when the triangle icon is clicked inside the h3
        if(e.target.nodeName === 'H3') {
            elem = e.target;
        } else {
            // Traverse up the DOM one level
            elem = e.target.parentNode;
        }

        elem.firstChild.className = self.toggleDisplay(elem, elem.firstChild.className);
    };

    /**
     * Creates click event listeners for each h3 heading.
     *
     * @function app.HotelView.init
     * @memberof app.HotelView
     */
    self.init = function() {
        var i = 0;
        var len = self.h3.length;

        for(i; i < len; i++) {
            // Add a click event for each h3 heading
            self.h3[i].addEventListener('click', self.setIcon, false);
        } // for
    };

}; // HotelView


/**
 * MapView
 * @name app.MapView
 * @class MapView
 * @memberof app
 */
app.MapView = function() {
    'use strict';

    var self = this;

    self.infoWindow = null;
    self.currentLocation = null;
    self.currentMapCenter = null;
    self.originalMapCenter = {lat: 36.1049534, lng: -115.1724043};
    self.mapDiv = document.getElementById('map');
    self.mapOptions = {
        disableDefaultUI: true,
        center: self.originalMapCenter,
        zoom: 15,
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP
        }
    };
    self.preload = '<div class="preload">Loading...<div class="spin"></div></div>';

    // Source: https://sites.google.com/site/gmapsdevelopment/
    self.markerUrl = 'http://maps.google.com/mapfiles/ms/icons/';
    self.markerColors = ['pink', 'blue', 'purple', 'green', 'yellow', 'red'];

    /**
     * Displays a Google Map and adds resize event listeners.
     *
     * @function app.MapView.init
     * @memberof app.MapView
     * @see {@link https://developers.google.com/maps/documentation/javascript/reference}
     */
    self.initMap = function() {
        // Create the map
        self.map = new google.maps.Map(self.mapDiv, self.mapOptions);

        // Create the info window that will be re-used by each marker
        self.infoWindow = new google.maps.InfoWindow();

        // Create the markers
        self.createMarkers();

        // Trigger map resize if the window changes size
        google.maps.event.addDomListener(window, 'resize', function() {
            google.maps.event.trigger(self.map, 'resize');
        });

        // Update center of the map on resize
        google.maps.event.addListener(self.map, 'resize', function () {
            self.currentMapCenter = self.map.getCenter();
            self.map.setCenter(self.currentMapCenter);
        });
    }; // initMap

    /**
     * Creates map markers.
     *
     * @function app.MapView.createMarkers
     * @memberof app.MapView
     */
    self.createMarkers = function() {
        var c = 0;
        var hotel = {};
        var allHotels = app.vm.getHotels();
        var length = app.vm.getHotelsLength();

        for (c; c < length; c++) {
            hotel = allHotels[c];

            // Marker color corresponds to diamond rating
            hotel.color = self.markerColors[hotel.diamonds];

            // Add hotel markers to the map
            hotel.marker = new google.maps.Marker({
                map: self.map,
                position: hotel.location,
                title: hotel.name,
                animation: null,
                visible: true,
                icon:  self.markerUrl + hotel.color + '.png'
            }); // marker

            self.setInfoWin(hotel);
        } // for
    }; // createMarkers

    /**
     * Sets the animation and icon properties for the map marker.
     *
     * @function app.MapView.animateMarker
     * @memberof app.MapView
     */
    self.animateMarker = function(hotel) {
        // Animate the marker
        hotel.marker.setAnimation(google.maps.Animation.BOUNCE);

        // Display the dot version of the marker
        hotel.marker.icon = self.markerUrl + hotel.color + '-dot.png';

        // Animate the marker for 2.1 seconds
        setTimeout(function() {
            hotel.marker.setAnimation(null);
            hotel.marker.icon = self.markerUrl + hotel.color + '.png';
        }, 2100);
    }; // animateMarker

    /**
     * Gets the content or reads already set content for the infoWindow. Sets currentLocation, and creates a click event listener.
     *
     * @function app.MapView.setInfoWin
     * @memberof app.MapView
     */
    self.setInfoWin = function(hotel) {
        // Open the infoWindow when a marker is clicked
        google.maps.event.addListener(hotel.marker, 'click', function() {
            if(!hotel.content) {
                self.infoWindow.setContent(self.preload);
                self.getContent(hotel);
            }
            else
                self.infoWindow.setContent(hotel.content);

            self.infoWindow.open(self.map, hotel.marker);
            self.animateMarker(hotel);
            self.currentLocation = hotel.location;
        });

    }; // setInfoWin

    /**
     * Calls the Yelp API via JSONP AJAX and sets the content of the infoWindow.
     *
     * @function app.MapView.getContent
     * @memberof app.MapView
     */
    self.getContent = function(hotel) {
        /**
         * Generates a random number and returns it as a string for OAuthentication
         * @return {string}
         */
        function nonce_generate() {
          return (Math.floor(Math.random() * 1e12).toString());
        }

        // Proof of concept of how to connect to an oAuth API with JS
        // For real world use you'd want a backend that hides your keys
        var yelpUrl = 'http://api.yelp.com/v2/business/' + hotel.id;
        var auth = app.vm.getKeys();
        var parameters = {
          oauth_consumer_key: auth.CONSUMER_KEY,
          oauth_token: auth.TOKEN,
          oauth_nonce: nonce_generate(),
          oauth_timestamp: Math.floor(Date.now() / 1000),
          oauth_signature_method: 'HMAC-SHA1',
          oauth_version: '1.0',
          callback: 'cb'
        };
        var encodedSignature = oauthSignature.generate('GET',
                                                        yelpUrl,
                                                        parameters,
                                                        auth.CONSUMER_SECRET,
                                                        auth.TOKEN_SECRET);
        parameters.oauth_signature = encodedSignature;

        $jsonp.send(yelpUrl, {
            callbackName: 'cb',
            data: parameters,
            onSuccess: function(json){
                hotel.content = self.getTemplate(hotel.name,
                                                 hotel.diamonds,
                                                 json.image_url,
                                                 json.snippet_text,
                                                 json.url);
                self.infoWindow.setContent(hotel.content);
            },
            onTimeout: function(){
                hotel.content = null;
                self.infoWindow.setContent('Error retrieving Yelp data.<br>Please try again.');
            },
                timeout: 5
        });

    }; // getContent

    /**
     * Matches the icon to diamond rating and formats html for the hotel image and review snippet.
     *
     * @function app.MapView.getTemplate
     * @memberof app.MapView
     * @returns {string} - HTML containing hotel name, diamond rating, image, and review.
     */
    self.getTemplate = function(name, diamonds, image, review, url) {
        var i = 0;
        var d = app.vm.getRatings();
        var dlength = d.length;
        var template = '';
        var icon = '';

        // Match the diamond rating to the icon text
        for(i; i < dlength; i++) {
            if(d[i].ratingValue === diamonds) {
                icon = d[i].icon;
                break;
            }
        }

        template = '<h4>' + name + '</h4>';
        template += '<i class="diamonds small">' + icon + '</i>';
        template += '<div class="gm-info-container">';
        template += '  <div class="gm-info-image"><img src="' + image + '"></div>';
        template += '  <div class="gm-info-text">';
        template +=    '<img src="images/yelp_reviews.png" alt="Yelp Reviews"><br>';
        template +=    review + ' <a href="' + url + '">read more</a>';
        template += '  </div>';
        template += '</div>';

        return template;
    }; // getTemplate

}; // MapView


/**
 * jsonp.js, (c) Przemek Sobstel 2012, License: MIT
 * {@link  https://github.com/sobstel/jsonp.js | jsonp.js}
 *
 * Changes from original: Added data option to pass parameters.
 *
 * @param  {string} - url
 * @param  {object} - options
 * @return {object} - json
 */
var $jsonp = (function(){
  var that = {};

  that.send = function(src, opt) {
    var options = opt || {},
      callback_name = options.callbackName || 'callback',
      on_success = options.onSuccess || function(){},
      on_timeout = options.onTimeout || function(){},
      timeout = options.timeout || 10,
      params = options.data || {};

    var query = "?";
    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            query += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
        }
    }

    var timeout_trigger = window.setTimeout(function(){
      window[callback_name] = function(){};
      on_timeout();
    }, timeout * 1000);

    window[callback_name] = function(data){
      window.clearTimeout(timeout_trigger);
      on_success(data);
    };

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = src + query;

    document.getElementsByTagName('head')[0].appendChild(script);
  };

  return that;
})();