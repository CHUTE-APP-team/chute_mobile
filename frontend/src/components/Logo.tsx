import { Image, ImageStyle, StyleProp } from "react-native";

const SIZES = {
  small: 36,
  medium: 64,
  large: 110,
};

interface Props {
  size?: "small" | "medium" | "large";
  style?: StyleProp<ImageStyle>;
}

export default function Logo({ size = "medium", style }: Props) {
  const dim = SIZES[size];
  return (
    <Image
      source={require("../../assets/images/logo-chute.png")}
      style={[{ width: dim, height: dim, resizeMode: "contain" }, style]}
      fadeDuration={0}
    />
  );
}
