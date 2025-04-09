# Security

Security features

## initialize_user_deposit

L'instruction initialize_user_deposit permet de créer explicitement un compte UserDeposit pour un utilisateur, avant tout dépôt.

Depuis Anchor 0.31, l’option init_if_needed est désactivée par défaut pour éviter les risques de réinitialisation de compte.
👉 Il est donc recommandé de séparer l’initialisation (initialize_user_deposit) du dépôt (deposit).

Pourquoi faire ?

- ✅ Préparer un compte UserDeposit sécurisé
- ✅ Éviter d’activer init_if_needed
- ✅ Gérer proprement le flux côté client (front ou script)
