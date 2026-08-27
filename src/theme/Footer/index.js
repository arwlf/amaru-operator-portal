// Footer removed for the Amaru-only site. Kept as a no-op override (rather
// than deleted) since @docusaurus/theme-classic's Layout always renders
// <Footer/>; returning null here is simpler than swizzling Layout too.
export default function Footer() {
  return null;
}
