# Ansible - Playbooks

Maintenant que nous savons ordonner à Ansible d'exécuter des tâches, nous allons les organiser dans un fichier descriptif apple *playbook*. Il s'agit d'un fichier YAML qui décrit la liste des tâches à effectuer.

Créons un dossier `playbooks` dans notre dossier de travail ainsi qu'un fichier `ping.yml` qui exécutera notre module `ping` automatiquement.
Renseignez le fichier de la sorte :

```yaml
- name: Ping
 hosts: localhost
 tasks:
   - name: Ping l'hôte
     ping:

   - name: Ping l'hôte en modifiant le retour
     ping:
       data: 'pang'
```

Nous pouvons désormais exécuter le playbook a l'aide de la commande suivante `ansible-playbook <path/to/playbook>`, dans notre cas `ansible-playbook playbooks/ping.yml`.

Dans les logs de résultats, plusieurs éléments sont à noter :
* PLAY: le nom du playbook exécuté, il permettra de suivre l'enchaînement de l'exécution des playbooks dans le cas ou plusieurs playbooks seraient appelés.
* TASK: le nom de la tâche exécutée. Nous observons que nos deux tâches sont exécutés, ainsi qu'un première tâche que nous n'avons pas défini qui indique *Gathering Facts*. Comme son nom l'indique, cette tâche collective les informations du serveur cible avant d'exécuter les tâches de notre playbook.
* PLAY RECAP: le récapitulatif des tâches qui ont été exécutées. Vous devriez avoir 3 tâches en **ok** (nos 2 tâches définies ainsi que le gathering fact). Différents statutes sont en effet possibles pour chaque tâche :

  * ok: la tâche a été effectuée mais n'a pas apporté de modification sur le serveur.
  * changed: la tâche a été effectuée et a apporté une modification sur le serveur.
  * Unreachable: le serveur cible n'a pas pu être joint.
  * failed: la tâche n'a pas pu être effectuée, si ce cas ce produit vous aurez des détails concernant l'erreur dans les logs de la tâche concernée. Par défaut, lorsqu'une erreur est détectée, les playbook s'arrête automatiquement pour le serveur concerné (en cas d'exécution multi-noeud, les tâches contingent pour les serveurs qui n'ont pas rencontré d'erreur sur la tâche).
  * rescued et ignored ne seront pas détaillés car leur utilisation relève généralement de mauvaises pratiques.
  * skipped: indique que la tâche n'a pas été exécutée car une condition n'a pas été vérifiée.

L'existence des différents statutes `changed` et `ok` permet de mettre en emphase un principe fondamental de la configuration via Ansible: **l'idempotence**.

## Idempotence

En mathématiques et en informatique, l'idempotence signifie qu'une opération a le même effet qu'on l'applique une ou plusieurs fois. L'exemple le plus simple en mathématique est la fonction absolute : *abs(abs(x)) = abs(x)*.
Ainsi, dans Ansible, les modules respectent l'idempotence, donc lorsqu'on applique avec les mêmes paramètres une tâche qui a déjà été exécutée précédemment, le résultat est le même et la tâche a le statut `ok`, autrement, elle est notée `changed`.

## Conditions

Il existe de nombreuses conditions qui permettent de *skip* une tâche en fonction des besoins. Toutes ces conditions sont définies grâce au mot-clé `when`. Modifions un peu notre playbook afin de n'exécuter la seconde tâche que lorsque notre serveur cible est un serveur CentOS 6 (le serveur est actuellement un CentOS7).
En exécutant à nouveau le playbook, nous observerons que notre deuxième tâche n'a pas été exécutée.

```yaml
- name: Ping l'hôte en modifiant le retour
 ping:
   data: 'pang'
 when:
   - ansible_facts['distribution'] == "CentOS"
   - ansible_facts['distribution_major_version'] == "6"
```

[Je veux plus de details concernant les conditions](https://docs.ansible.com/ansible/2.9/user_guide/playbooks_conditionals.html)

## Boucles

Les boucles permettent d'étirer sur listes. Vous savez déjà ce qu'est une boucle, alors voici un example d'utilisation avec Ansible.

```yaml
- name: Ajouté 2 utilisateurs
 user:
   name: "{{ item }}"
   state: present
   groups: "wheel"
 loop:
    - testuser1
    - testuser2
```

[Je veux plus de details concernant les boucles](https://docs.ansible.com/ansible/2.9/user_guide/playbooks_loops.html)

## Conclusion

A l'issue de ce chapitre, nous avons vu comment rendre nos tâche réutilisables en utilisant les *playbooks*. Cependant, la factorisation des tâches dans les playbooks est limitée dans des cas réels. En effet, prenons le cas de l'installation d'applications Java sur des serveurs Apache Tomcat.
Nous souhaitons déployer 3 applications sur deux serveurs Tomcat :

| Serveur | Application |
|---------|:-----------:|
| S1      |     A1      |
| S1      |     A2      |
| S2      |     A3      |

Dans ce cas d'exemple, les applications A1 et A2 sont toutes les deux déployées sur un serveur S1. L'application A3 est quant-à-elle déployée sur un second serveur.
Il serait possible de déployer une telle configuration avec les *playbooks* et beaucoup de conditions. Cependant, pour répondre à de tels cas d'usage, Ansible introduit ce que l'on appelle des **rôles**.

Avant d'etudier un tel sujet, nous allons commencer par creer une role plus simple afin d'installer une serveur Apache 2.4 qui nous permettra de servir une page HTML sur le port HTTP (80).
Ainsi, nous allons créer un rôle `apache` qui pourra être paramétré différemment en fonction du serveur.
Créons notre premier rôle grâce à la commande suivante et nous approfondirons l'utilisation des rôles dans le chapitre suivant.

```bash
ansible-galaxy role init roles/apache
```
