import edcTowerLogo from "@/assets/edc-tower-logo-clean.png.asset.json";

interface EdcLogoProps {
  className?: string;
  size?: number;
}

/**
 * Glassmorphic EDC TOWER logo — uses the transparent logo as a mask
 * over the flowing UAE-flag → orange gradient defined by `.logo-flow` in index.css.
 * Renders identically across login, splash and in-app screens.
 */
const EdcLogo = ({ className = "", size }: EdcLogoProps) => (
  <div
    className={`logo-flow ${className}`}
    style={{
      WebkitMaskImage: `url(${edcTowerLogo.url})`,
      maskImage: `url(${edcTowerLogo.url})`,
      ...(size ? { width: size, height: size } : null),
    }}
    aria-label="EDC TOWER"
    role="img"
  />
);

export default EdcLogo;
