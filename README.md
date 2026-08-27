# Amaru Operator Portal

Documentation site for operators running an [Amaru](https://github.com/pragma-org/amaru) node on Cardano: installation, configuration, hardening, and day-to-day operation.  
Built with [Docusaurus 3](https://docusaurus.io/) and published to GitHub Pages at [arwlf.github.io/amaru-operator-portal](https://arwlf.github.io/amaru-operator-portal).

## Relationship to developers.cardano.org

This site is a staging ground for content meant to be potentially upstreamed into the official [Cardano Developer Portal](https://developers.cardano.org/docs/operators/).  
It was built with the same Docusaurus setup and conventions to facilitate the merging of these guides. 


### Local development setup

```bash
yarn install
yarn build      # also validates builder tools and links
yarn start      # dev server on localhost:3000
```

Requires [Node.js](https://nodejs.org/) 22 (see `.nvmrc`) and [Yarn](https://classic.yarnpkg.com/) 1.20+. Built with [Docusaurus](https://docusaurus.io/).