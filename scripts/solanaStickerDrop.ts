import { readFile } from "node:fs/promises";
import process from "node:process";
import { mplCore, createCollection, create, fetchCollection } from "@metaplex-foundation/mpl-core";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  generateSigner,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";

type Command = "create-collection" | "mint";

type MintRecipient = {
  owner: string;
  uri: string;
  name?: string;
};

function usage(): void {
  console.error(`Usage:

  bun run solana:sticker -- create-collection \\
    --keypair ./wallet.json \\
    --name "Cozy Devs Sticker Claim" \\
    --uri "https://example.com/collection.json" \\
    [--rpc https://api.mainnet-beta.solana.com]

  bun run solana:sticker -- mint \\
    --keypair ./wallet.json \\
    --collection <COLLECTION_ADDRESS> \\
    --recipients ./recipients.json \\
    [--rpc https://api.mainnet-beta.solana.com]

recipients.json format:
[
  {
    "owner": "SOLANA_WALLET_ADDRESS",
    "uri": "https://example.com/metadata/1.json",
    "name": "Cozy Devs Sticker #1"
  }
]`);
  process.exit(1);
}

function requiredOption(options: Map<string, string>, key: string) {
  const value = options.get(key);
  if (!value) {
    usage();
    throw new Error(`Missing required option: ${key}`);
  }
  return value;
}

function parseArgs(argv: string[]) {
  if (argv.length === 0) usage();

  const [command, ...rest] = argv;
  if (command !== "create-collection" && command !== "mint") usage();

  const options = new Map<string, string>();
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (!arg.startsWith("--")) usage();

    const [rawKey, inlineValue] = arg.split("=", 2);
    const key = rawKey.slice(2);
    const value = inlineValue ?? rest[++index];
    if (!value || value.startsWith("--")) usage();
    options.set(key, value);
  }

  return { command, options } as { command: Command; options: Map<string, string> };
}

async function loadSigner(keypairPath: string, rpc: string) {
  const secretKeyJson = await readFile(keypairPath, "utf8");
  const secretKey = Uint8Array.from(JSON.parse(secretKeyJson) as number[]);

  const umi = createUmi(rpc).use(mplCore());
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  return { umi, signer };
}

async function createCollectionCommand(options: Map<string, string>) {
  const keypairPath = requiredOption(options, "keypair");
  const name = requiredOption(options, "name");
  const uri = requiredOption(options, "uri");
  const rpc = options.get("rpc") ?? "https://api.mainnet-beta.solana.com";

  const { umi } = await loadSigner(keypairPath, rpc);
  const collection = generateSigner(umi);

  await createCollection(umi, {
    collection,
    name,
    uri,
  }).sendAndConfirm(umi);

  console.log(JSON.stringify({
    command: "create-collection",
    collection: collection.publicKey,
    name,
    uri,
    rpc,
  }, null, 2));
}

async function mintCommand(options: Map<string, string>) {
  const keypairPath = requiredOption(options, "keypair");
  const collectionAddress = requiredOption(options, "collection");
  const recipientsPath = requiredOption(options, "recipients");
  const rpc = options.get("rpc") ?? "https://api.mainnet-beta.solana.com";

  const { umi } = await loadSigner(keypairPath, rpc);
  const collection = await fetchCollection(umi, publicKey(collectionAddress));

  const recipients = JSON.parse(await readFile(recipientsPath, "utf8")) as MintRecipient[];
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("Recipients file must be a non-empty JSON array.");
  }

  const minted: Array<{ owner: string; asset: string; name: string; uri: string }> = [];

  for (let index = 0; index < recipients.length; index++) {
    const recipient = recipients[index];
    if (!recipient?.owner || !recipient?.uri) {
      throw new Error(`Recipient at index ${index} is missing owner or uri.`);
    }

    const asset = generateSigner(umi);
    const name = recipient.name ?? `Cozy Devs Sticker #${index + 1}`;

    await create(umi, {
      asset,
      collection,
      owner: publicKey(recipient.owner),
      name,
      uri: recipient.uri,
    }).sendAndConfirm(umi);

    minted.push({
      owner: recipient.owner,
      asset: asset.publicKey,
      name,
      uri: recipient.uri,
    });
  }

  console.log(JSON.stringify({
    command: "mint",
    collection: collection.publicKey,
    mintedCount: minted.length,
    minted,
    rpc,
  }, null, 2));
}

const { command, options } = parseArgs(process.argv.slice(2));

if (command === "create-collection") {
  await createCollectionCommand(options);
} else {
  await mintCommand(options);
}
