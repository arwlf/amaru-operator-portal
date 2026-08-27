/**
 * Inline SVG icons for the mega menu, imported through Docusaurus's SVGR
 * pipeline so they render as React components and inherit `currentColor`.
 * This replaces the old `<img src>` approach, which could only be recolored
 * with CSS filter chains.
 */
import BookIcon from '@site/static/img/icons/book-solid.svg';
import BuildingIcon from '@site/static/img/icons/building-solid.svg';
import WrenchIcon from '@site/static/img/icons/wrench-solid.svg';

const icons = {
  book: BookIcon,
  building: BuildingIcon,
  wrench: WrenchIcon,
};

export default icons;
