// Script de debug pour vérifier la structure de l'IDL et la présence du compte "strategy"
const lendingIdl = require("../target/idl/lending.json");

console.log("IDL keys:", Object.keys(lendingIdl));
console.log("IDL accounts:", lendingIdl.accounts?.map(a => a.name));
console.log("IDL instructions:", lendingIdl.instructions?.map(i => i.name));

if (!lendingIdl.accounts) {
  console.error("❌ ERREUR: La section 'accounts' est absente de l'IDL. Regénère l'IDL avec 'anchor build'.");
  process.exit(1);
}
if (!lendingIdl.accounts.find(a => a.name === "strategy")) {
  console.error("❌ ERREUR: Le compte 'strategy' n'est pas défini dans l'IDL. Regénère l'IDL avec 'anchor build'.");
  process.exit(1);
}
console.log("✅ L'IDL contient bien le compte 'strategy'.");
