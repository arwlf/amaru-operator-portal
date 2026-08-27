module.exports = {
  guideSidebar: [
    {
      type: "category",
      label: "Guide: Running an Amaru Node",
      collapsed: false,
      link: {
        type: "doc",
        id: "operators/amaru-node/amaru-user-guide",
      },
      items: [
        "operators/amaru-node/amaru-fast-forward",
        "operators/amaru-node/amaru-tui",
        {
          type: "category",
          label: "Advanced Installation on Mainnet",
          link: {
            type: "doc",
            id: "operators/amaru-node/amaru-advanced",
          },
          items: [
            "operators/amaru-node/amaru-advanced-hardening",
            "operators/amaru-node/amaru-advanced-installation",
          ],
        },
      ],
    },
  ],
};
