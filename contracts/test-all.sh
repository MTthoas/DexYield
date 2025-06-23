#!/bin/bash

echo "🚀 Lancement des tests DexYield"
echo "==============================="

echo "🏦 Test 1: Protocole de Lending"
echo "-------------------------------"
anchor test tests/lending.ts

echo ""
echo "🏪 Test 2: Marketplace"
echo "---------------------"
anchor test tests/contract.ts



echo ""
echo "🎉 Tests terminés!"
