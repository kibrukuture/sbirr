import { ethers } from "hardhat";

async function main() {
  const contract = await ethers.getContractAt(
    "StableBirr",
    "0xFaa6E8Ee77368613c804f51029CAb30677967F67"
  );

  const admin = await contract.schnlAdmin();
  const operator = await contract.schnlOperator();

  console.log("📋 Contract Roles:");
  console.log("Admin:", admin);
  console.log("Operator:", operator);
  console.log(
    "\n🔑 Your Address:",
    "0x96b5586e4040859A60C844d4590a474F04Cde34C"
  );
  console.log(
    "\n✅ Operator Match:",
    operator.toLowerCase() ===
      "0x96b5586e4040859A60C844d4590a474F04Cde34C".toLowerCase()
  );
}

main();
