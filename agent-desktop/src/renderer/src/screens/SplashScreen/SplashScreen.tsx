import { useEffect } from "react";
import splashBg from "../../assets/cubecloud-splash-bg.svg";
import { useBrandWordmark } from "../../components/useBrandWordmark";

interface SplashScreenProps {
  onFinished: () => void;
}

function SplashScreen({ onFinished }: SplashScreenProps): React.JSX.Element {
  useEffect(() => {
    onFinished();
  }, [onFinished]);

  const splashLogo = useBrandWordmark();

  return (
    <div className="splash-screen">
      <img className="splash-bg" src={splashBg} alt="" />
      <img className="splash-logo" src={splashLogo} alt="Cubecloud 智方云" />
    </div>
  );
}

export default SplashScreen;
