import { useEffect } from "react";
import splashBg from "../../assets/cubecloud-splash-bg.svg";
import splashLogo from "../../assets/cubecloud-wordmark.svg";

interface SplashScreenProps {
  onFinished: () => void;
}

function SplashScreen({ onFinished }: SplashScreenProps): React.JSX.Element {
  useEffect(() => {
    onFinished();
  }, [onFinished]);

  return (
    <div className="splash-screen">
      <img className="splash-bg" src={splashBg} alt="" />
      <img className="splash-logo" src={splashLogo} alt="Cubecloud Desktop" />
    </div>
  );
}

export default SplashScreen;
