# Ansible - Introduction
 
Ansible est une plateforme de gestion de déploiements de serveurs en multi-nœuds. Il permet l'exécution de tâches ad-hoc et la gestion de configuration. Les différents nœuds sont gérés via SSH dans la majorité des cas mais Ansible est également capable de piloter des serveurs Windows via WinRM.
 
Le système utilise des fichiers YAML pour exprimer des descriptions réutilisables appelés *playbooks*.
Ces playbooks seront exécutés sur un ou plusieurs serveurs organisés en groupes avec d'éventuelles spécificités propres aux serveurs ou aux groupes selon les besoins. Cette organisation des serveurs est décrite également dans des fichiers XML que l'on appelle les *inventaires*.
 
Mais commençons par le commencement, votre environnement devrait etre monte désormais et vous devriez vous situer dans `/etc/ansible`.
Toute la configuration d’Ansible se trouvera dans cette hiérarchie qui est sommaire pour le moment.
 
Pour commencer vérifions que ansible fonctionne correctement en utilisant quelques commandes ad-hoc en local.
Les commandes ad-hoc sont appelées avec la commande `ansible`.
 
La syntaxe simplifiée utilisée pour appeler une commande ad-hoc est la suivante :
```bash
ansible -m <module> [-a <arguments>] target
```
 
Testons tout d'abord qu'Ansible est en capacité d'exécuter une command ad-hoc très simple : `ansible -m ping localhost`
Ici, nous utilisons le module `ping` sans argument en ayant comme cible `localhost`.
 
Comme tout module dans Ansible, ce dernier est complètement documenté.
Allons vérifier les possibilités qu'offrent le module ping dans la documentation en recherchant [ansible ping module](http://letmegooglethat.com/?q=ansible+ping+module) dans votre moteur de recherche favoris.
 
Vous devriez désormais pouvoir relancer la commande ad-hoc précédente en modifiant la valeur de retour attendue par Ansible. Exécutez donc cette commande pour que le serveur cible retourne "pang".
 