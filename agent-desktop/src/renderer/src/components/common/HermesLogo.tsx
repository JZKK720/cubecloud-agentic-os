import cubecloudMark from "../../assets/cubecloud-mark.svg";

function HermesLogo({ size = 32 }: { size?: number }): React.JSX.Element {
  return (
    <img
      src={cubecloudMark}
      width={size}
      height={size}
      alt="Cubecloud"
    />
  );
}

export default HermesLogo;
