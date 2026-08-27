/**
 * Client-side redirects for internal path reorganization.
 * Used by @docusaurus/plugin-client-redirects.
 */
const redirects = [
  {to: '/docs/operators/amaru-node/amaru-user-guide', from: '/docs/operators/amaru-node/guide-running-an-amaru-node'},
  {to: '/docs/operators/amaru-node/amaru-fast-forward', from: '/docs/operators/amaru-node/amaru-running-preprod'},
  {to: '/docs/operators/amaru-node/amaru-advanced', from: '/docs/operators/amaru-node/amaru-running-mainnet'},
  {to: '/docs/operators/amaru-node/amaru-advanced-hardening', from: '/docs/operators/amaru-node/amaru-mainnet-hardening'},
  {to: '/docs/operators/amaru-node/amaru-advanced-installation', from: '/docs/operators/amaru-node/amaru-mainnet-installation'},
];

module.exports = redirects;
