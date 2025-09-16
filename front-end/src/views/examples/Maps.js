/*!

=========================================================
* Argon Dashboard React - v1.1.0
=========================================================

* Product Page: https://www.creative-tim.com/product/argon-dashboard-react
* Copyright 2019 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/argon-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React from "react";
// react plugin used to create google maps
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

// reactstrap components
import { Card, Container, Row } from "reactstrap";

// core components
import Header from "components/Headers/Header.js";
const MAP_CENTER = { lat: 40.748817, lng: -73.985428 };
const MAP_OPTIONS = {
  disableDefaultUI: false,
  fullscreenControl: true,
  mapTypeControl: false,
  scrollwheel: false,
  styles: [
    {
      featureType: "administrative",
      elementType: "labels.text.fill",
      stylers: [{ color: "#444444" }]
    },
    {
      featureType: "landscape",
      elementType: "all",
      stylers: [{ color: "#f2f2f2" }]
    },
    {
      featureType: "poi",
      elementType: "all",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "road",
      elementType: "all",
      stylers: [{ saturation: -100 }, { lightness: 45 }]
    },
    {
      featureType: "road.highway",
      elementType: "all",
      stylers: [{ visibility: "simplified" }]
    },
    {
      featureType: "road.arterial",
      elementType: "labels.icon",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "transit",
      elementType: "all",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "water",
      elementType: "all",
      stylers: [{ color: "#5e72e4" }, { visibility: "on" }]
    }
  ]
};

const MAP_CONTAINER_STYLE = {
  borderRadius: "inherit",
  height: "100%",
  width: "100%"
};

const MapWrapper = ({ apiKey }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey
  });

  if (loadError) {
    return (
      <div style={{ height: `600px` }} className="map-canvas" id="map-canvas">
        <div className="d-flex h-100 align-items-center justify-content-center">
          <span className="text-danger">Unable to load Google Maps</span>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ height: `600px` }} className="map-canvas" id="map-canvas">
        <div className="d-flex h-100 align-items-center justify-content-center">
          <span className="text-muted">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: `600px` }} className="map-canvas" id="map-canvas">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={MAP_CENTER}
        zoom={12}
        options={MAP_OPTIONS}
      >
        <Marker position={MAP_CENTER} />
      </GoogleMap>
    </div>
  );
};

class Maps extends React.Component {
  render() {
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt--7" fluid>
          <Row>
            <div className="col">
              <Card className="shadow border-0">
                <MapWrapper
                  apiKey={
                    process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY"
                  }
                />
              </Card>
            </div>
          </Row>
        </Container>
      </>
    );
  }
}

export default Maps;
