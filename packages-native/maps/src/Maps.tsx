import { flattenStyles } from "@native-mobile-resources/util-widgets/src";
import { ActionValue, DynamicValue } from "mendix";
import { Icon } from "mendix/components/native/Icon";
import { Component, createElement, createRef } from "react";
import { ActivityIndicator, Platform, TouchableOpacity, View, Text, Dimensions } from "react-native";
import MapView, { LatLng, Marker as MarkerView, Region } from "react-native-maps";

import { DefaultZoomLevelEnum, MapsProps, MarkersType as MarkerProps } from "../typings/MapsProps";
import { defaultMapsStyle, MapsStyle } from "./ui/Styles";
import { CachedGeocoder } from "./util/CachedGeocoder";
import { executeAction } from "@widgets-resources/piw-utils/src";
import Big from "big.js";

type Props = MapsProps<MapsStyle>;

interface State {
    status: Status;
    centerRegion?: LatLng;
    zoomLevel?: number;
    markers?: Marker[];
    centerMarker?: Marker;
}

const enum Status {
    LoadingMarkers = "loadingMarkers",
    LoadingMap = "loadingMap",
    MapReady = "mapReady",
    CameraAlmostReady = "cameraAlmostReady",
    CameraReady = "cameraReady"
}

interface Marker {
    key: string;
    props: MarkerProps;
    coordinate: LatLng;
}

export class Maps extends Component<Props, State> {
    readonly state: State = {
        status: Status.LoadingMarkers
    };

    private readonly onMapReadyHandler = this.onMapReady.bind(this);
    private readonly styles = flattenStyles(defaultMapsStyle, this.props.style);
    private readonly mapViewRef = createRef<MapView>();
    private readonly geocoder = new CachedGeocoder();
    private readonly updateLocationHandler = this.updateLocation.bind(this);
    private readonly onRegionChangeCompleteHandler = async (region: Region): Promise<void> => {
        const marker = {
            key: "centerMarker",
            props: { iconSize: 32, color: "#fff312" },
            coordinate: { latitude: region.latitude, longitude: region.longitude }
        };
        let markers;
        if (this.state.markers) {
            markers = this.state.markers.filter(x => x.key !== "centerMarker");
            markers.push(marker);
        }
        // this.renderMarker(marker)
        await this.setState({
            centerRegion: { latitude: region.latitude, longitude: region.longitude },
            centerMarker: marker,
            // eslint-disable-next-line react/no-access-state-in-setstate
            markers: markers ? markers : this.state.markers
        });
        console.log(
            "region lat" + region.latitude,
            "region lon" + region.longitude,
            "region lat" + region.latitudeDelta,
            "region lon" + region.longitudeDelta
        );
        this.onRegionChangeComplete.bind(this);
    };

    componentDidMount(): void {
        this.parseMarkers();
    }

    componentDidUpdate(): void {
        if (this.state.status === Status.LoadingMarkers) {
            this.parseMarkers();
        }
    }

    componentWillReceiveProps(): void {
        if (this.state.status === Status.CameraReady) {
            this.parseMarkers();
        }
    }

    render(): JSX.Element {
        return (
            <View style={this.styles.container} testID={this.props.name}>
                {this.state.status !== Status.LoadingMarkers && (
                    <View
                        style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            height: Dimensions.get("window").height
                        }}
                    >
                        <MapView
                            ref={this.mapViewRef}
                            provider={this.props.provider === "default" ? null : this.props.provider}
                            mapType={this.props.mapType}
                            showsUserLocation={this.props.showsUserLocation}
                            showsMyLocationButton={this.props.showsUserLocation}
                            showsTraffic={false}
                            minZoomLevel={toZoomValue(this.props.minZoomLevel)}
                            maxZoomLevel={toZoomValue(this.props.maxZoomLevel)}
                            rotateEnabled={this.props.interactive}
                            scrollEnabled={this.props.interactive}
                            pitchEnabled={false}
                            zoomEnabled={this.props.interactive}
                            style={{ flex: 1, alignSelf: "stretch" }}
                            liteMode={!this.props.interactive}
                            cacheEnabled={!this.props.interactive}
                            showsPointsOfInterest={false}
                            mapPadding={{ top: 40, right: 20, bottom: 20, left: 20 }}
                            onMapReady={this.onMapReadyHandler}
                            onRegionChangeComplete={this.onRegionChangeCompleteHandler}
                        >
                            {this.state.markers && this.state.markers.map(marker => this.renderMarker(marker))}
                        </MapView>
                        {this.props.regionIcon ? (
                            <View
                                style={{
                                    position: "absolute",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <View style={{ width: 25, height: 25, marginTop: -25, marginLeft: 3 }}>
                                    <Icon
                                        icon={
                                            this.props.regionIcon && this.props.regionIcon.status === "available"
                                                ? this.props.regionIcon.value
                                                : { type: "glyph", iconClass: "Glyph" }
                                        }
                                    />
                                </View>
                            </View>
                        ) : (
                            <View
                                style={{
                                    position: "absolute",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    width: 5,
                                    height: 5,
                                    borderRadius: 2.5,
                                    backgroundColor: "blue"
                                }}
                            />
                        )}
                        <TouchableOpacity
                            onPress={this.updateLocationHandler}
                            style={{
                                borderWidth: 1,
                                borderRadius: 2.5,
                                backgroundColor: "#76CA02",
                                borderColor: "#76CA02",
                                padding: 5,
                                width: "100%"
                            }}
                        >
                            <Text style={{ color: "#ffffff", alignSelf: "center" }}>{this.props.setLocationText}</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {(this.state.status === Status.LoadingMarkers || this.state.status === Status.LoadingMap) && (
                    <View style={this.styles.loadingOverlay}>
                        <ActivityIndicator color={this.styles.loadingIndicator.color} size="large" />
                    </View>
                )}
            </View>
        );
    }

    private async updateLocation(): Promise<void> {
        if (this.state.centerRegion) {
            if (this.props.latitudeAttribute) {
                await this.props.latitudeAttribute.setValue(toPrecision(this.state.centerRegion.latitude, 8));
            }
            if (this.props.longitudeAttribute) {
                await this.props.longitudeAttribute.setValue(toPrecision(this.state.centerRegion.longitude, 8));
            }
            if (this.props.changeNanoflow && this.props.changeNanoflow.canExecute) {
                this.props.changeNanoflow.execute();
            }
        }
    }

    private renderMarker({ key, props, coordinate }: Marker): JSX.Element {
        return (
            <MarkerView
                key={key}
                coordinate={coordinate}
                title={this.props.interactive ? props.title && props.title.value : ""}
                description={this.props.interactive ? props.description && props.description.value : ""}
                onPress={this.props.interactive ? () => onMarkerPress(props.onClick) : undefined}
                pinColor={props.color || this.styles.marker.color}
                opacity={this.styles.marker.opacity}
            >
                {props.icon && props.icon.value && (
                    <Icon
                        icon={props.icon.value}
                        color={props.color || this.styles.marker.color}
                        size={props.iconSize}
                    />
                )}
            </MarkerView>
        );
    }

    private onMapReady(): void {
        if (Platform.OS === "android") {
            this.updateCamera(false);
            this.setState({ status: this.props.interactive ? Status.MapReady : Status.CameraReady });
        }
        this.onRegionChangeComplete();
    }

    private onRegionChangeComplete(): void {
        if (Platform.OS === "android" && this.state.status === Status.MapReady) {
            this.setState({ status: Status.CameraReady });
        }

        if (Platform.OS === "ios") {
            switch (this.state.status) {
                case Status.LoadingMap:
                    this.setState({ status: Status.MapReady });
                    this.updateCamera(false);
                    break;
                case Status.MapReady:
                    this.setState({
                        status: this.props.provider === "default" ? Status.CameraAlmostReady : Status.CameraReady
                    });
                    break;
                case Status.CameraAlmostReady:
                    this.setState({ status: Status.CameraReady });
            }
        }
    }

    private async parseMarkers(): Promise<void> {
        const parsedMarkers = await Promise.all(
            this.props.markers.map(async (marker, index) => ({
                key: `map_marker_${index}`,
                props: marker,
                coordinate: await this.parseCoordinate(marker.latitude, marker.longitude, marker.address)
            }))
        );
        if (this.props.showRegionMarker) {
            if (!this.state.centerRegion) {
                await this.setState({ centerRegion: await this.getCenter() });
            }
            const markerProps = {
                iconSize: 32
            };
            // eslint-disable-next-line no-debugger
            parsedMarkers.push({
                props: markerProps,
                key: "map_marker_center",
                coordinate: this.state.centerRegion ? this.state.centerRegion : await this.getCenter()
            });
        }

        if (parsedMarkers.some(marker => marker.coordinate == null)) {
            return;
        }

        this.setState(
            {
                // eslint-disable-next-line react/no-access-state-in-setstate
                status: this.state.status === Status.LoadingMarkers ? Status.LoadingMap : this.state.status,
                markers: parsedMarkers as Marker[]
            },
            () => {
                if (this.state.status === Status.CameraReady) {
                    this.updateCamera(true);
                }
            }
        );
    }

    private async updateCamera(animate: boolean): Promise<void> {
        if (!this.mapViewRef.current) {
            return;
        }

        if (this.props.fitToMarkers && this.props.markers.length > 1) {
            this.mapViewRef.current.fitToElements(animate);
            return;
        }

        const camera = {
            center: await this.getCenter(),
            zoom: toZoomValue(this.props.defaultZoomLevel),
            altitude: toAltitude(this.props.defaultZoomLevel)
        };

        if (animate) {
            this.mapViewRef.current.animateCamera(camera);
        } else {
            this.mapViewRef.current.setCamera(camera);
        }
    }

    private async getCenter(): Promise<LatLng> {
        const center =
            this.props.markers.length === 1 && this.props.fitToMarkers
                ? await this.parseCoordinate(
                      this.props.markers[0].latitude,
                      this.props.markers[0].longitude,
                      this.props.markers[0].address
                  )
                : await this.parseCoordinate(
                      this.props.centerLatitude,
                      this.props.centerLongitude,
                      this.props.centerAddress
                  );

        return center || { latitude: 51.9066346, longitude: 4.4861703 };
    }

    private parseCoordinate(
        latitudeProp?: DynamicValue<BigJs.Big>,
        longitudeProp?: DynamicValue<BigJs.Big>,
        addressProp?: DynamicValue<string>
    ): Promise<LatLng | null> {
        if (latitudeProp && latitudeProp.value && longitudeProp && longitudeProp.value) {
            const latitude = Number(latitudeProp.value);
            const longitude = Number(longitudeProp.value);

            if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
                throw new Error(`Invalid coordinate provided: (${latitude}, ${longitude})`);
            }

            return Promise.resolve({ latitude, longitude });
        }

        if (addressProp && addressProp.value) {
            return this.geocoder.geocode(addressProp.value);
        }

        return Promise.resolve(null);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}

function isValidLatitude(latitude: number): boolean {
    return !isNaN(latitude) && latitude <= 90 && latitude >= -90;
}

function isValidLongitude(longitude: number): boolean {
    return !isNaN(longitude) && longitude <= 180 && longitude >= -180;
}

function onMarkerPress(action?: ActionValue): void {
    executeAction(action);
}

function toZoomValue(level: DefaultZoomLevelEnum): number {
    switch (level) {
        case "world":
            return 3;
        case "continent":
            return 5;
        case "country":
            return 7;
        case "city":
            return 10;
        case "town":
            return 12;
        case "streets":
            return 15;
        case "building":
            return 20;
    }
}

function toAltitude(level: DefaultZoomLevelEnum): number {
    switch (level) {
        case "world":
            return 16026161;
        case "continent":
            return 4006540;
        case "country":
            return 1001635;
        case "city":
            return 125204;
        case "town":
            return 31301;
        case "streets":
            return 3914;
        case "building":
            return 122;
    }
}
function toPrecision(number: number, decimal: number): Big {
    const numberAsString = number.toString();
    let splitChar = ".";
    if (!numberAsString.includes(".") && numberAsString.includes(",")) {
        splitChar = ",";
    }
    const split = numberAsString.split(splitChar);
    return new Big(split[0] + splitChar + split[1].substring(0, decimal));
}
