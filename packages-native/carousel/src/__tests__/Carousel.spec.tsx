import { CarouselProps } from "../../typings/CarouselProps";
import { CarouselStyle } from "../ui/styles";
import { render } from "react-native-testing-library";
import { createElement } from "react";
import { Text, View } from "react-native";
import { ListValueBuilder } from "@widgets-resources/piw-utils";
import { Carousel } from "../Carousel";

jest.mock("react-native", () => ({
    InteractionManager: require.requireActual("InteractionManager"),
    Platform: require.requireActual("Platform"),
    Animated: require.requireActual("Animated"),
    I18nManager: require.requireActual("I18nManager"),
    View: require.requireActual("View"),
    Text: require.requireActual("Text"),
    ViewPropTypes: {
        style: jest.fn()
    },
    TouchableOpacity: require.requireActual("TouchableOpacity"),
    Easing: require.requireActual("Easing"),
    FlatList: require.requireActual("FlatList"),
    ScrollView: require.requireActual("ScrollView"),
    StyleSheet: require.requireActual("StyleSheet"),
    Image: require.requireActual("Image"),
    ActivityIndicator: require.requireActual("ActivityIndicator")
}));

jest.mock("prop-types", () => require.requireActual("prop-types"));

describe("Carousel", () => {
    let defaultProps: CarouselProps<CarouselStyle>;
    const listValueBuilder = ListValueBuilder();
    beforeEach(() => {
        defaultProps = {
            name: "carousel",
            contentSource: listValueBuilder.simple(),
            content: jest.fn(() => (
                <View>
                    <Text>MyContent</Text>
                </View>
            )),
            layout: "card",
            showPagination: true,
            activeSlideAlignment: "center",
            loop: false,
            style: []
        };
    });

    /* TODO: enzyme or react-native-testing-lib still not allowing mocking states with hooks
        Thus we can't snapshot test the actual carousel
     */

    it("renders loading", () => {
        expect(render(<Carousel {...defaultProps} />).toJSON()).toMatchSnapshot();
    });

    // it("renders without pagination", () => {
    //     expect(render(<Carousel {...defaultProps} showPagination={false} />).toJSON()).toMatchSnapshot();
    // });
    //
    // it("renders full width", () => {
    //     expect(render(<Carousel {...defaultProps} layout={"fullWidth"} />).toJSON()).toMatchSnapshot();
    // });
    //
    // it("renders numbered pagination if item size is more than 5", () => {
    //     const props = {
    //         ...defaultProps,
    //         contentSource: listValueBuilder.withAmountOfItems(6)
    //     };
    //     expect(render(<Carousel {...props} />).toJSON()).toMatchSnapshot();
    // });
});
