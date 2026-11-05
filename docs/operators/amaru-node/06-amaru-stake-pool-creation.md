---
id: amaru-stake-pool-creation
title: "Creating a Stake Pool with Amaru"
sidebar_label: "Create a Stake Pool"
description: Command cheatsheet to generate block producer keys, configure Amaru to forge blocks, and register a stake pool on preview, preprod or mainnet.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This page is a command cheatsheet for turning an Amaru node into a block producer and registering a stake pool on preview, preprod or mainnet. It assumes Amaru is already installed as a systemd service, see [Advanced Installation](/docs/operators/amaru-node/amaru-advanced-installation) first if you haven't done that yet.

:::info Cheatsheet, not a tutorial
This page only lists the commands. Each section links to the matching page of the official Cardano documentation for a deeper explanation of what the commands do and how to handle keys safely.
:::

:::important Pick your network
Commands that depend on the network are shown in **Preview**, **Preprod** and **Mainnet** tabs.  
Selecting a network in any tab switches every tab on the page.
:::

## Prerequisites

- `cardano-cli` available on both the online and the air-gapped machine.
- A running and synced Haskell `cardano-node` on the **same network** as your Amaru node, reachable from the online machine.
- `CARDANO_NODE_SOCKET_PATH` set on the online machine, pointing to that `cardano-node` socket.
- The network passed to `cardano-cli` with the matching flag:

| Network | `cardano-cli` flag | Socket path used in the examples |
|---|---|---|
| Preview | `--testnet-magic 2` | `/srv/cardano/preview/node.socket` |
| Preprod | `--testnet-magic 1` | `/srv/cardano/preprod/node.socket` |
| Mainnet | `--mainnet` | `/srv/cardano/mainnet/node.socket` |

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

`/etc/cardano/shelley-genesis.json` must be the Shelley genesis file of the selected network.

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
slotsPerKESPeriod=$(jq -r '.slotsPerKESPeriod' /etc/cardano/shelley-genesis.json)
echo slotsPerKESPeriod: ${slotsPerKESPeriod}

export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
currentSlot=$(cardano-cli conway query tip --testnet-magic 2 | jq -r '.slot')
echo currentSlot: ${currentSlot}

kesPeriod=$(( currentSlot / slotsPerKESPeriod ))
echo kesPeriod: ${kesPeriod}
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
slotsPerKESPeriod=$(jq -r '.slotsPerKESPeriod' /etc/cardano/shelley-genesis.json)
echo slotsPerKESPeriod: ${slotsPerKESPeriod}

export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preprod/node.socket"
currentSlot=$(cardano-cli conway query tip --testnet-magic 1 | jq -r '.slot')
echo currentSlot: ${currentSlot}

kesPeriod=$(( currentSlot / slotsPerKESPeriod ))
echo kesPeriod: ${kesPeriod}
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
slotsPerKESPeriod=$(jq -r '.slotsPerKESPeriod' /etc/cardano/shelley-genesis.json)
echo slotsPerKESPeriod: ${slotsPerKESPeriod}

export CARDANO_NODE_SOCKET_PATH="/srv/cardano/mainnet/node.socket"
currentSlot=$(cardano-cli conway query tip --mainnet | jq -r '.slot')
echo currentSlot: ${currentSlot}

kesPeriod=$(( currentSlot / slotsPerKESPeriod ))
echo kesPeriod: ${kesPeriod}
```

</TabItem>
</Tabs>

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

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
cardano-cli conway query kes-period-info --testnet-magic 2 --op-cert-file /var/lib/amaru/secret/node.cert
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preprod/node.socket"
cardano-cli conway query kes-period-info --testnet-magic 1 --op-cert-file /var/lib/amaru/secret/node.cert
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/mainnet/node.socket"
cardano-cli conway query kes-period-info --mainnet --op-cert-file /var/lib/amaru/secret/node.cert
```

</TabItem>
</Tabs>

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

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
cardano-cli conway stake-address build \
    --stake-verification-key-file stake.vkey \
    --out-file stake.addr \
    --testnet-magic 2
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
cardano-cli conway stake-address build \
    --stake-verification-key-file stake.vkey \
    --out-file stake.addr \
    --testnet-magic 1
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
cardano-cli conway stake-address build \
    --stake-verification-key-file stake.vkey \
    --out-file stake.addr \
    --mainnet
```

</TabItem>
</Tabs>

### Payment address <span className="tag-air-gapped">[air-gapped]</span>

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
cardano-cli conway address build \
    --payment-verification-key-file payment.vkey \
    --stake-verification-key-file stake.vkey \
    --out-file payment.addr \
    --testnet-magic 2
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
cardano-cli conway address build \
    --payment-verification-key-file payment.vkey \
    --stake-verification-key-file stake.vkey \
    --out-file payment.addr \
    --testnet-magic 1
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
cardano-cli conway address build \
    --payment-verification-key-file payment.vkey \
    --stake-verification-key-file stake.vkey \
    --out-file payment.addr \
    --mainnet
```

</TabItem>
</Tabs>

_Copy `payment.addr` to the online machine._

### Fund and check balance <span className="tag-online">[online]</span>

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
cardano-cli conway query utxo --address $(cat payment.addr) --testnet-magic 2
```

:::tip
Use the [Cardano faucet](https://docs.cardano.org/cardano-testnets/tools/faucet) to get test ADA. Select the **Preview** testnet and paste your `payment.addr`.
:::

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preprod/node.socket"
cardano-cli conway query utxo --address $(cat payment.addr) --testnet-magic 1
```

:::tip
Use the [Cardano faucet](https://docs.cardano.org/cardano-testnets/tools/faucet) to get test ADA. Select the **Preprod** testnet and paste your `payment.addr`.
:::

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/mainnet/node.socket"
cardano-cli conway query utxo --address $(cat payment.addr) --mainnet
```

:::caution Real ADA
On mainnet, fund `payment.addr` with real ADA. Plan for the stake address deposit (`stakeAddressDeposit`, 2 ADA), the pool deposit (`stakePoolDeposit`, 500 ADA), transaction fees and your pledge. Check the current values in the protocol parameters.
:::

</TabItem>
</Tabs>

---

## 4. Register the Stake Address

For more details, see [Register Stake Address](https://developers.cardano.org/docs/operators/block-producer/register-stake-address/) in the official Cardano documentation.

### Registration certificate <span className="tag-air-gapped">[air-gapped]</span>

Since the Conway era, the certificate has to include the stake address deposit (`stakeAddressDeposit`). Its value is 2 ADA (`2000000` lovelace) on Preview, Preprod and Mainnet.

```bash
cardano-cli conway stake-address registration-certificate \
    --stake-verification-key-file stake.vkey \
    --key-reg-deposit-amt 2000000 \
    --out-file stake.cert
```

:::tip Check the current deposit
The air-gapped machine cannot query the chain. Check the current value on the online machine first:

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
cardano-cli conway query protocol-parameters --testnet-magic 2 | jq .stakeAddressDeposit
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preprod/node.socket"
cardano-cli conway query protocol-parameters --testnet-magic 1 | jq .stakeAddressDeposit
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/mainnet/node.socket"
cardano-cli conway query protocol-parameters --mainnet | jq .stakeAddressDeposit
```

</TabItem>
</Tabs>

:::

_Copy `stake.cert` to the online machine._

### Build the transaction <span className="tag-online">[online]</span>

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

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

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preprod/node.socket"
currentSlot=$(cardano-cli conway query tip --testnet-magic 1 | jq -r '.slot')
echo Current Slot: $currentSlot

cardano-cli conway transaction build \
    --tx-in $(cardano-cli conway query utxo --address $(cat payment.addr) --testnet-magic 1 --out-file /dev/stdout | jq -r 'keys[0]') \
    --change-address $(cat payment.addr) \
    --testnet-magic 1 \
    --certificate-file stake.cert \
    --invalid-hereafter $(( currentSlot + 1000 )) \
    --witness-override 2 \
    --out-file tx.raw
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/mainnet/node.socket"
currentSlot=$(cardano-cli conway query tip --mainnet | jq -r '.slot')
echo Current Slot: $currentSlot

cardano-cli conway transaction build \
    --tx-in $(cardano-cli conway query utxo --address $(cat payment.addr) --mainnet --out-file /dev/stdout | jq -r 'keys[0]') \
    --change-address $(cat payment.addr) \
    --mainnet \
    --certificate-file stake.cert \
    --invalid-hereafter $(( currentSlot + 1000 )) \
    --witness-override 2 \
    --out-file tx.raw
```

</TabItem>
</Tabs>

_Copy `tx.raw` to the air-gapped machine._

### Sign the transaction <span className="tag-air-gapped">[air-gapped]</span>

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
cardano-cli conway transaction sign \
    --tx-body-file tx.raw \
    --signing-key-file payment.skey \
    --signing-key-file stake.skey \
    --testnet-magic 2 \
    --out-file tx.signed
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
cardano-cli conway transaction sign \
    --tx-body-file tx.raw \
    --signing-key-file payment.skey \
    --signing-key-file stake.skey \
    --testnet-magic 1 \
    --out-file tx.signed
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
cardano-cli conway transaction sign \
    --tx-body-file tx.raw \
    --signing-key-file payment.skey \
    --signing-key-file stake.skey \
    --mainnet \
    --out-file tx.signed
```

</TabItem>
</Tabs>

_Copy `tx.signed` to the online machine._

### Submit the transaction <span className="tag-online">[online]</span>

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
cardano-cli conway transaction submit --tx-file tx.signed --testnet-magic 2
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
cardano-cli conway transaction submit --tx-file tx.signed --testnet-magic 1
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
cardano-cli conway transaction submit --tx-file tx.signed --mainnet
```

</TabItem>
</Tabs>

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

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
cardano-cli conway query protocol-parameters --testnet-magic 2 --out-file protocol.json
minPoolCost=$(jq -r '.minPoolCost' protocol.json)
echo "Minimum pool cost: $minPoolCost lovelace"
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preprod/node.socket"
cardano-cli conway query protocol-parameters --testnet-magic 1 --out-file protocol.json
minPoolCost=$(jq -r '.minPoolCost' protocol.json)
echo "Minimum pool cost: $minPoolCost lovelace"
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/mainnet/node.socket"
cardano-cli conway query protocol-parameters --mainnet --out-file protocol.json
minPoolCost=$(jq -r '.minPoolCost' protocol.json)
echo "Minimum pool cost: $minPoolCost lovelace"
```

</TabItem>
</Tabs>

### Pool registration certificate <span className="tag-air-gapped">[air-gapped]</span>

`--pool-cost` must be at least the `minPoolCost` returned in the previous step. At the time of writing, that's 75 ADA (`75000000` lovelace) on preview and preprod, and 170 ADA (`170000000` lovelace) on mainnet.

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
cardano-cli conway stake-pool registration-certificate \
    --cold-verification-key-file cold.vkey \
    --vrf-verification-key-file vrf.vkey \
    --pool-pledge 9000000000 \
    --pool-cost 75000000 \
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

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
cardano-cli conway stake-pool registration-certificate \
    --cold-verification-key-file cold.vkey \
    --vrf-verification-key-file vrf.vkey \
    --pool-pledge 9000000000 \
    --pool-cost 75000000 \
    --pool-margin 0.01 \
    --pool-reward-account-verification-key-file stake.vkey \
    --pool-owner-stake-verification-key-file stake.vkey \
    --testnet-magic 1 \
    --single-host-pool-relay relay1.yourpool.example.com \
    --pool-relay-port 3001 \
    --metadata-url https://YOUR_METADATA_URL \
    --metadata-hash $(cat poolMetaDataHash.txt) \
    --out-file pool.cert
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
cardano-cli conway stake-pool registration-certificate \
    --cold-verification-key-file cold.vkey \
    --vrf-verification-key-file vrf.vkey \
    --pool-pledge 9000000000 \
    --pool-cost 170000000 \
    --pool-margin 0.01 \
    --pool-reward-account-verification-key-file stake.vkey \
    --pool-owner-stake-verification-key-file stake.vkey \
    --mainnet \
    --single-host-pool-relay relay1.yourpool.example.com \
    --pool-relay-port 3001 \
    --metadata-url https://YOUR_METADATA_URL \
    --metadata-hash $(cat poolMetaDataHash.txt) \
    --out-file pool.cert
```

</TabItem>
</Tabs>

:::note Relay options
- IP relay: `--pool-relay-ipv4 <ip> --pool-relay-port <port>`.
- Multiple relays: (repeat line) `--single-host-pool-relay <dns> --pool-relay-port <port>`.
- SRV record: `--multi-host-pool-relay <domain>` (no port).
:::

<details>
<summary>Details of using an <strong>SRV record</strong></summary>

With `--multi-host-pool-relay`, the certificate only holds the name of a DNS SRV record. The relay hosts and ports are resolved from DNS, so you can add, remove or move relays later with a DNS change instead of a new registration certificate.

1. At your DNS provider, create one SRV entry per relay, all with the same name. `_cardano._tcp.` is the usual prefix:

    ```
    _cardano._tcp.relays.yourpool.example.com. 3600 IN SRV 10 10 3001 relay1.yourpool.example.com.
    _cardano._tcp.relays.yourpool.example.com. 3600 IN SRV 10 10 3001 relay2.yourpool.example.com.
    ```

    The fields are priority, weight, port and target. Each target must have its own A or AAAA record.

2. Check that the record resolves:

    ```bash
    dig +short SRV _cardano._tcp.relays.yourpool.example.com
    # 10 10 3001 relay1.yourpool.example.com.
    # 10 10 3001 relay2.yourpool.example.com.
    ```

3. In the registration certificate command, replace the `--single-host-pool-relay` and `--pool-relay-port` lines with:

    ```bash
        --multi-host-pool-relay _cardano._tcp.relays.yourpool.example.com \
    ```

:::warning
- The name in the certificate must match the SRV record name exactly. Changing that name later means submitting a new pool registration certificate.
- Some explorers and tools handle SRV relays poorly. If that matters to you, also register one relay with `--single-host-pool-relay` as a fallback.
:::

</details>

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

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
currentSlot=$(cardano-cli conway query tip --testnet-magic 2 | jq -r '.slot')
echo Current Slot: $currentSlot

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

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preprod/node.socket"
currentSlot=$(cardano-cli conway query tip --testnet-magic 1 | jq -r '.slot')
echo Current Slot: $currentSlot

cardano-cli conway transaction build \
    --tx-in $(cardano-cli conway query utxo --address $(cat payment.addr) --testnet-magic 1 --out-file /dev/stdout | jq -r 'keys[0]') \
    --change-address $(cat payment.addr) \
    --testnet-magic 1 \
    --certificate-file pool.cert \
    --certificate-file deleg.cert \
    --invalid-hereafter $(( currentSlot + 1000 )) \
    --witness-override 3 \
    --out-file tx.raw
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/mainnet/node.socket"
currentSlot=$(cardano-cli conway query tip --mainnet | jq -r '.slot')
echo Current Slot: $currentSlot

cardano-cli conway transaction build \
    --tx-in $(cardano-cli conway query utxo --address $(cat payment.addr) --mainnet --out-file /dev/stdout | jq -r 'keys[0]') \
    --change-address $(cat payment.addr) \
    --mainnet \
    --certificate-file pool.cert \
    --certificate-file deleg.cert \
    --invalid-hereafter $(( currentSlot + 1000 )) \
    --witness-override 3 \
    --out-file tx.raw
```

:::note Several UTxOs at payment.addr
Check the address first with the `cardano-cli conway query utxo --address $(cat payment.addr) --mainnet`  
If there are several UTxO, `keys[0]` will only use the first one. If the first one is too small for the pool deposit of 500 ADA (`500000000` lovelace), pass every UTxO instead :

```bash
TX_INS=($(cardano-cli conway query utxo --address $(cat payment.addr) --mainnet --out-file /dev/stdout | jq -r 'keys[] | "--tx-in", .'))
echo "${TX_INS[@]}"
```

Then replace the `--tx-in $(...)` line of the command above with `"${TX_INS[@]}" \`:

```bash
cardano-cli conway transaction build \
    "${TX_INS[@]}" \
    --change-address $(cat payment.addr) \
    --mainnet \
    --certificate-file pool.cert \
    --certificate-file deleg.cert \
    --invalid-hereafter $(( currentSlot + 1000 )) \
    --witness-override 3 \
    --out-file tx.raw
```

You can also list the UTxOs by hand:

```bash
cardano-cli conway transaction build \
    --tx-in <txhash>#<index> \
    --tx-in <txhash>#<index> \
    --change-address $(cat payment.addr) \
    --mainnet \
    --certificate-file pool.cert \
    --certificate-file deleg.cert \
    --invalid-hereafter $(( currentSlot + 1000 )) \
    --witness-override 3 \
    --out-file tx.raw
```

All inputs are at the same address, so `payment.skey` signs them all and `--witness-override` does not change. The change goes back to `payment.addr` as a single UTxO.
:::

</TabItem>
</Tabs>

_Copy `tx.raw` to the air-gapped machine._

### Sign the transaction (payment + cold + stake) <span className="tag-air-gapped">[air-gapped]</span>

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
cardano-cli conway transaction sign \
    --tx-body-file tx.raw \
    --signing-key-file payment.skey \
    --signing-key-file cold.skey \
    --signing-key-file stake.skey \
    --testnet-magic 2 \
    --out-file tx.signed
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
cardano-cli conway transaction sign \
    --tx-body-file tx.raw \
    --signing-key-file payment.skey \
    --signing-key-file cold.skey \
    --signing-key-file stake.skey \
    --testnet-magic 1 \
    --out-file tx.signed
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
cardano-cli conway transaction sign \
    --tx-body-file tx.raw \
    --signing-key-file payment.skey \
    --signing-key-file cold.skey \
    --signing-key-file stake.skey \
    --mainnet \
    --out-file tx.signed
```

</TabItem>
</Tabs>

_Copy `tx.signed` to the online machine._

### Submit the transaction <span className="tag-online">[online]</span>

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
cardano-cli conway transaction submit --tx-file tx.signed --testnet-magic 2
```

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
cardano-cli conway transaction submit --tx-file tx.signed --testnet-magic 1
```

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
cardano-cli conway transaction submit --tx-file tx.signed --mainnet
```

</TabItem>
</Tabs>

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

<Tabs groupId="network" queryString="network" className="tabsblock" defaultValue="preview">
<TabItem value="preview" label="Preview">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preview/node.socket"
cardano-cli conway query stake-snapshot --stake-pool-id $(cat stakepoolid.txt) --testnet-magic 2
```

This query can take a long time to return. It's quicker to check online on [Cardanoscan (preview)](https://preview.cardanoscan.io/pools).

</TabItem>
<TabItem value="preprod" label="Preprod">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/preprod/node.socket"
cardano-cli conway query stake-snapshot --stake-pool-id $(cat stakepoolid.txt) --testnet-magic 1
```

This query can take a long time to return. It's quicker to check online on [Cardanoscan (preprod)](https://preprod.cardanoscan.io/pools).

</TabItem>
<TabItem value="mainnet" label="Mainnet">

```bash
export CARDANO_NODE_SOCKET_PATH="/srv/cardano/mainnet/node.socket"
cardano-cli conway query stake-snapshot --stake-pool-id $(cat stakepoolid.txt) --mainnet
```

This query can take a long time to return. It's quicker to check online on [Cardanoscan (mainnet)](https://cardanoscan.io/pools).

</TabItem>
</Tabs>
