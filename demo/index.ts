import StableBirr, { ethers } from "@tolbel/sbirr";
import { mint } from "./funs/mint";
import { burn } from "./funs/burn";
import { transfer } from "./funs/transfer";
import { blacklist } from "./funs/blacklist";
import { unblacklist } from "./funs/unblacklist";
import { freeze } from "./funs/freeze";
import { unfreeze } from "./funs/unfreeze";
import { configureMinter } from "./funs/configureMinter";
import { removeMinter } from "./funs/removeMinter";

const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: process.env.ALCHEMY_RPC_URL!,
  privateKey: process.env.PRIVATE_KEY!,
  contractAddress: process.env.CONTRACT_ADDRESS!,
});

const recipient = process.env.METAMASK_ADDRESS!;

async function main() {
  try {
    // const balance = await sbirr.contract.getBalance(
    //   "0x0b44c56e29107b0964b3923f059ee64cc6d8041a"
    // );
    // console.log({ balance });
    // const freezeResult = await sbirr.contract.isFrozen(
    //   "0x0b44c56e29107b0964b3923f059ee64cc6d8041a"
    // );
    // console.log({ freezeResult });
    // const wipeFrozenBalance = await sbirr.contract.wipeFrozenBalance({
    //   account: "0x0b44c56e29107b0964b3923f059ee64cc6d8041a",
    //   caseId: "MERCHANT_001",
    // });
    // console.log({ wipeFrozenBalance });
    // // Test mint
    // const mintResult = await mint(sbirr, recipient);
    // console.log({ mint: mintResult });
    // check balance;
    // const balance = await sbirr.contract.getBalance(recipient);
    // console.log({ balance });
    // const burnResult = await burn(sbirr, recipient, "1.5", "MERCHANT_001");
    // console.log({ burn: burnResult });
    //
    // const transferResult = await transfer(
    //   sbirr,
    //   "0x0b44c56e29107b0964b3923f059ee64cc6d8041a",
    //   "0.1"
    // );
    // console.log({ transfer: transferResult });
    //
    // const blacklistResult = await blacklist(
    //   sbirr,
    //   "0x0b44c56e29107b0964b3923f059ee64cc6d8041a"
    // );
    // console.log({ blacklist: blacklistResult });
    //
    // const unblacklistResult = await unblacklist(
    //   sbirr,
    //   "0x0b44c56e29107b0964b3923f059ee64cc6d8041a"
    // );
    // console.log({ unblacklist: unblacklistResult });
    //
    // const freezeResult = await freeze(
    //   sbirr,
    //   "0x0b44c56e29107b0964b3923f059ee64cc6d8041a",
    //   "Test freeze"
    // );
    // console.log({ freeze: freezeResult });
    // const unfreezeResult = await unfreeze(
    //   sbirr,
    //   "0x0b44c56e29107b0964b3923f059ee64cc6d8041a",
    //   "Test complete"
    // );
    // console.log({ unfreeze: unfreezeResult });
    const configureResult = await configureMinter(
      sbirr,
      recipient,
      "max",
      true
    );
    console.log({ configureMinter: configureResult });

    // const removeResult = await removeMinter(sbirr, recipient);
    // console.log({ removeMinter: removeResult });
  } catch (error) {
    console.log({ error });
  }
}

main();
