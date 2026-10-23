---
id: amaru-stake-pool-creation
title: "Creating a Stake Pool with Amaru"
sidebar_label: "Create a Stake Pool"
description: Command cheatsheet to generate block producer keys, configure Amaru to forge blocks, and register a stake pool on a Cardano testnet.
---

This page is a command cheatsheet for turning an Amaru node into a block producer and registering a stake pool on a testnet. It assumes Amaru is already installed as a systemd service, see [Advanced Installation](/docs/operators/amaru-node/amaru-advanced-installation) first if you haven't done that yet.

:::info Cheatsheet, not a tutorial
This page only lists the commands. Each section links to the matching page of the official Cardano documentation for a deeper explanation of what the commands do and how to handle keys safely.
:::

:::important Testnet only
Amaru only forges empty blocks on preprod and preview. Mainnet refuses the block-producing flags.  
The examples below target **preview** `--testnet-magic 2`.
:::

## Prerequisites

- `cardano-cli` available on both the online and the air-gapped machine.
- A running and synced Haskell `cardano-node` on the **same network** (preview), reachable from the online machine.
- `CARDANO_NODE_SOCKET_PATH` set on the online machine, pointing to that `cardano-node` socket.
- The network passed with `--testnet-magic 2` (preview).

:::warning cardano-cli needs a Haskell node
`cardano-cli queries` and `transactions` talk to a node over its local socket.  
These commands must run against a Haskell `cardano-node` synced on the same network as your Amaru node.
:::

Each step is tagged with where it runs:

- **<span className="tag-online">[online]</span>**: a machine with access to the synced Haskell `cardano-node` socket.
- **<span className="tag-air-gapped">[air-gapped]</span>**: an offline machine that holds the cold keys.

---

## 1. Generate Block Producer keys

For more details, see [Block Producer Keys](https://developers.cardano.org/docs/operators/block-producer/block-producer-keys/) in the official Cardano documentation.

### Cold keys <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway node key-gen \
  --cold-verification-key-file cold.vkey \
  --cold-signing-key-file cold.skey \
  --operational-certificate-issue-counter cold.counter
```

### KES keys <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway node key-gen-KES \
  --verification-key-file kes.vkey \
  --signing-key-file kes.skey
```

### VRF keys <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway node key-gen-VRF \
  --verification-key-file vrf.vkey \
  --signing-key-file vrf.skey
```

### Current KES period <span className="tag-online">[online]</span>

```bash
slotsPerKESPeriod=$(jq -r '.slotsPerKESPeriod' /etc/cardano/shelley-genesis.json)
echo slotsPerKESPeriod: ${slotsPerKESPeriod}

export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
currentSlot=$(cardano-cli conway query tip --testnet-magic 2 | jq -r '.slot')
echo currentSlot: ${currentSlot}

kesPeriod=$(( currentSlot / slotsPerKESPeriod ))
echo kesPeriod: ${kesPeriod}
```

### Operational certificate <span className="tag-air-gapped">[air-gapped]</span>

Replace `<KES_PERIOD>` with the `kesPeriod` value from the previous step.

```bash
cardano-cli conway node issue-op-cert \
  --kes-verification-key-file kes.vkey \
  --cold-signing-key-file cold.skey \
  --operational-certificate-issue-counter cold.counter \
  --kes-period <KES_PERIOD> \
  --out-file node.cert
```

---

## 2. Configure Amaru as a Block Producer

For more details, see [Deployment](https://developers.cardano.org/docs/operators/block-producer/deployment/) in the official Cardano documentation.

Transfer `node.cert`, `vrf.skey` and `kes.skey` to the online Block Producer, under `/var/lib/amaru/secret/`.

### File permissions <span className="tag-online">[online]</span>

```bash
sudo chown amaru:amaru -R /var/lib/amaru/secret
sudo chmod 500 /var/lib/amaru/secret
sudo chmod 400 /var/lib/amaru/secret/{node.cert,vrf.skey,kes.skey}
```

### Update the Amaru configuration <span className="tag-online">[online]</span>

```bash title="/etc/default/amaru"
[...]
AMARU_OPERATOR_KES=/var/lib/amaru/secret/kes.skey
AMARU_OPERATOR_CERT=/var/lib/amaru/secret/node.cert
AMARU_OPERATOR_VRF=/var/lib/amaru/secret/vrf.skey
```

### Ensure the node.cert is valid <span className="tag-online">[online]</span>
```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
cardano-cli conway query kes-period-info --testnet-magic 2 --op-cert-file /var/lib/amaru/secret/node.cert
```

### Restart the node <span className="tag-online">[online]</span>

```bash
sudo systemctl restart amaru
```
---

## 3. Generate Wallet keys

For more details, see [Generating Wallet Keys](https://developers.cardano.org/docs/operators/block-producer/generating-wallet-keys/) in the official Cardano documentation.

### Payment keys <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway address key-gen \
    --verification-key-file payment.vkey \
    --signing-key-file payment.skey
```

### Stake keys <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway stake-address key-gen \
    --verification-key-file stake.vkey \
    --signing-key-file stake.skey
```

### Stake address <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway stake-address build \
    --stake-verification-key-file stake.vkey \
    --out-file stake.addr \
    --testnet-magic 2
```

### Payment address <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway address build \
    --payment-verification-key-file payment.vkey \
    --stake-verification-key-file stake.vkey \
    --out-file payment.addr \
    --testnet-magic 2
```

_Copy `payment.addr` to the online machine._

### Fund and check balance <span className="tag-online">[online]</span>

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
cardano-cli conway query utxo --address $(cat payment.addr) --testnet-magic 2
```

:::tip
On testnet, use the [Cardano faucet](https://docs.cardano.org/cardano-testnets/tools/faucet) to get test ADA. Select the Preview testnet and paste your `payment.addr`.
:::

---

## 4. Register the Stake Address

For more details, see [Register Stake Address](https://developers.cardano.org/docs/operators/block-producer/register-stake-address/) in the official Cardano documentation.

### Registration certificate <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway stake-address registration-certificate \
    --stake-verification-key-file stake.vkey \
    --out-file stake.cert
```

_Copy `stake.cert` to the online machine._

### Build the transaction <span className="tag-online">[online]</span>

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
currentSlot=$(cardano-cli conway query tip --testnet-magic 2 | jq -r '.slot')
echo Current Slot: $currentSlot

cardano-cli conway transaction build \
    --tx-in $(cardano-cli conway query utxo --address $(cat payment.addr) --testnet-magic 2 --out-file /dev/stdout | jq -r 'keys[0]') \
    --change-address $(cat payment.addr) \
    --testnet-magic 2 \
    --certificate-file stake.cert \
    --invalid-hereafter $(( currentSlot + 1000 )) \
    --witness-override 2 \
    --out-file tx.raw
```

_Copy `tx.raw` to the air-gapped machine._

### Sign the transaction <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway transaction sign \
    --tx-body-file tx.raw \
    --signing-key-file payment.skey \
    --signing-key-file stake.skey \
    --testnet-magic 2 \
    --out-file tx.signed
```

_Copy `tx.signed` to the online machine._

### Submit the transaction <span className="tag-online">[online]</span>

```bash
cardano-cli conway transaction submit --tx-file tx.signed --testnet-magic 2
```

---

## 5. Register the Stake Pool

For more details, see [Register Stake Pool](https://developers.cardano.org/docs/operators/block-producer/register-stake-pool/) in the official Cardano documentation.

### Metadata file <span className="tag-air-gapped">[air-gapped]</span>

The ticker must be 3 to 5 characters long, using only `A-Z` and `0-9`.

```bash
cat > poolMetaData.json << EOF
{
  "name": "Your Pool Name",
  "description": "Your pool description",
  "ticker": "TICK",
  "homepage": "https://yourpool.example.com"
}
EOF
```

### Metadata hash <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway stake-pool metadata-hash \
      --pool-metadata-file poolMetaData.json \
      --out-file poolMetaDataHash.txt
cat poolMetaDataHash.txt
```

Upload `poolMetaData.json` to a website that you administer.

### Verify the hosted metadata <span className="tag-online">[online]</span>

The URL must use HTTPS, must not redirect, and must be 64 characters or fewer.

```bash
cardano-cli conway stake-pool metadata-hash --pool-metadata-file <(curl -s https://YOUR_METADATA_URL)
```

The resulting hash must match `poolMetaDataHash.txt`.

### Protocol parameters <span className="tag-online">[online]</span>

```bash
cardano-cli conway query protocol-parameters --testnet-magic 2 --out-file protocol.json
minPoolCost=$(jq -r '.minPoolCost' protocol.json)
echo "Minimum pool cost: $minPoolCost lovelace"
```

### Pool registration certificate <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway stake-pool registration-certificate \
    --cold-verification-key-file cold.vkey \
    --vrf-verification-key-file vrf.vkey \
    --pool-pledge 9000000000 \
    --pool-cost 170000000 \
    --pool-margin 0.01 \
    --pool-reward-account-verification-key-file stake.vkey \
    --pool-owner-stake-verification-key-file stake.vkey \
    --testnet-magic 2 \
    --single-host-pool-relay relay1.yourpool.example.com \
    --pool-relay-port 3001 \
    --metadata-url https://YOUR_METADATA_URL \
    --metadata-hash $(cat poolMetaDataHash.txt) \
    --out-file pool.cert
```

:::note Relay options
- Multiple relays: repeat `--single-host-pool-relay <dns> --pool-relay-port <port>`.
- IP relay: `--pool-relay-ipv4`.
- SRV record: `--multi-host-pool-relay <domain>` (no port).
:::

_Copy `pool.cert` to the online machine._

### Delegation certificate <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway stake-address stake-delegation-certificate \
    --stake-verification-key-file stake.vkey \
    --cold-verification-key-file cold.vkey \
    --out-file deleg.cert
```

_Copy `deleg.cert` to the online machine._

### Build the transaction <span className="tag-online">[online]</span>

```bash
currentSlot=$(cardano-cli conway query tip --testnet-magic 2 | jq -r '.slot')
cardano-cli conway transaction build \
    --tx-in $(cardano-cli conway query utxo --address $(cat payment.addr) --testnet-magic 2 --out-file /dev/stdout | jq -r 'keys[0]') \
    --change-address $(cat payment.addr) \
    --testnet-magic 2 \
    --certificate-file pool.cert \
    --certificate-file deleg.cert \
    --invalid-hereafter $(( currentSlot + 1000 )) \
    --witness-override 3 \
    --out-file tx.raw
```

_Copy `tx.raw` to the air-gapped machine._

### Sign the transaction (payment + cold + stake) <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway transaction sign \
    --tx-body-file tx.raw \
    --signing-key-file payment.skey \
    --signing-key-file cold.skey \
    --signing-key-file stake.skey \
    --testnet-magic 2 \
    --out-file tx.signed
```

_Copy `tx.signed` to the online machine._

### Submit the transaction <span className="tag-online">[online]</span>

```bash
cardano-cli conway transaction submit --tx-file tx.signed --testnet-magic 2
```

:::warning
Only keep `node.cert`, `vrf.skey` and `kes.skey` on your online Block Producer.  
All other keys and certificates must be kept on the air-gapped machine.
:::

---

## 6. Verify the registration

### Pool ID <span className="tag-air-gapped">[air-gapped]</span>

```bash
cardano-cli conway stake-pool id --cold-verification-key-file cold.vkey --output-format hex > stakepoolid.txt
cat stakepoolid.txt
```
_Copy `stakepoolid.txt` to the online machine._

### Check on-chain <span className="tag-online">[online]</span>

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
cardano-cli conway query stake-snapshot --stake-pool-id $(cat stakepoolid.txt) --testnet-magic 2
```

This query can take a long time to return. It's quicker to check online on [Cardanoscan (preview)](https://preview.cardanoscan.io/pools).
