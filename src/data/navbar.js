/**
 * Navbar mega menu items for the Cardano Developer Portal.
 * Extracted from docusaurus.config.js for maintainability.
 *
 * Each mega menu is defined ONCE: an optional featured tile plus link
 * columns. The flat `items` array that Docusaurus's mobile drawer consumes
 * is derived from that definition, so the desktop and mobile menus cannot
 * drift apart.
 *
 * Shapes:
 *   featured: {title, description, image, to|href, cta, placement}
 *     placement 'start' puts the tile before the columns, 'end' after.
 *   columns:  [{title, items: [{label, description?, to|href, icon?}]}]
 *     icon is a name from src/theme/NavbarItem/DropdownNavbarItem/icons.js.
 */

/** Flatten a mega menu definition into the mobile drawer's link list,
 *  keeping the featured tile in its desktop position. */
function toMobileItems({featured, columns}) {
  const items = [];
  const featuredItem = featured
    ? {...(featured.to ? {to: featured.to} : {href: featured.href}), label: featured.title}
    : null;
  if (featuredItem && featured.placement !== 'end') {
    items.push(featuredItem);
  }
  for (const column of columns) {
    for (const {to, href, label} of column.items) {
      items.push(href ? {href, label} : {to, label});
    }
  }
  if (featuredItem && featured.placement === 'end') {
    items.push(featuredItem);
  }
  return items;
}

function megaMenu({label, featured, columns}) {
  return {
    type: 'dropdown',
    label,
    position: 'left',
    items: toMobileItems({featured, columns}),
    mega: true,
    customProps: {featured, columns},
  };
}

function getNavbarItems(repository, discordInvite) {
  return [
    megaMenu({
      label: 'Operators',
      columns: [
        {
          title: 'Running an Amaru Node',
          items: [
            {to: '/docs/operators/amaru-node/amaru-user-guide/', label: 'Getting Started', description: 'Scope, network options, and where to start', icon: 'book'},
            {to: '/docs/operators/amaru-node/amaru-fast-forward/', label: 'Run on Preprod', description: 'Quick start on the preprod testnet', icon: 'wrench'},
            {to: '/docs/operators/amaru-node/amaru-advanced/', label: 'Run on Mainnet', description: 'Production-grade path: hardening, install, operate', icon: 'building'},
            {to: '/docs/operators/amaru-node/amaru-stake-pool-creation/', label: 'Create a Stake Pool', description: 'Generate keys and register a pool on testnet', icon: 'wrench'},
          ],
        },
      ],
    }),
    {
      href: discordInvite,
      position: 'right',
      className: 'header-discord-link',
      'aria-label': 'Join the Amaru Discord',
    },
    {
      href: repository,
      position: 'right',
      className: 'header-github-link',
      'aria-label': 'GitHub repository',
    },
  ];
}

module.exports = getNavbarItems;
