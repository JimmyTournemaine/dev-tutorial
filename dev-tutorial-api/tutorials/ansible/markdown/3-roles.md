# Ansible - Rôles

## Présentation de la structure

Votre rôle vient d'être automatiquement créé avec toute sa hiérarchie que nous allons étudier.

* `roles/apache/README.md`: contient la documentation du role
* `roles/apache/defaults/main.yml`: contient les variables par défaut, qui pourront être surchargées via les inventaires que nous étudierons au chapitre suivant. Retenez qu'on indique des variables par défaut qui en fonction de l'environnement d'exécution pourront être surchargées. Les variables par défaut contiennent donc les variables qui ciblent votre environnement de production.
* `roles/apache/files/`: contient tout type de fichier qui pourra être envoyé sur le serveur.
* `roles/apache/handlers/main.yml`: contient des tâches appelées `handlers`. Les *handlers* sont des tâches qui seront exécutées à la fin d'un playbook lorsque certaines tâches ont généré une modification sur le serveur (si une tâche qui déclenche le handler passe à l'état `changed`).
* `roles/apache/meta/main.yml`: contient des métadonnées concernant le rôle. Le renseignement dépend de votre projet. En revanche, la balise `dependencies` peut être utilisée afin d'exécuter un autre rôle en amont.
* `roles/apache/tasks/main.yml`: contient la liste des tâches à exécuter.
* `roles/apache/templates/`: contient les templates à déployer sur le serveur. Ansible utilise le moteur de *templating* Jinja2.
* `roles/apache/vars/main.yml`: contient des variables de paramétrage du rôle qui ne peuvent pas être surchargées.

## Playbook et rôle

Nous avons maintenant créer notre rôle mais rappelez-vous, le point d'entrée d’Ansible est toujours un playbook.
Nous allons donc créer un nouveau playbook dont la seule fonction sera d'appeler notre rôle.

```yaml
# playbooks/apache.yml
---
- name: Installation Apache 2.4
 hosts: localhost
 roles:
   - apache
```

Nous pourrons donc appeler notre playbooks avec la commande `ansible-playbook playbook/apache.yml` mais il ne se passera rien car il faut maintenant développer notre rôle.
Afin de réaliser notre objectif, nous allons tout d'abord devoir installer le serveur Apache sur notre environnement. Ce service s'appelle `httpd` et peut être installé via `yum`.

```yaml
# roles/apache/tasks/main.yml
---
- name: Installe le service
 yum:
   name: httpd
   state: present
```

## `become`

Relançons le *playbook* afin de vérifier que cette première tâche s'exécute correctement.
Malheureusement pour nous, le service ne peut pas être installé. En effet seul l'utilisateur root peut effectuer des installations de services et notre utilisateur `ansible` n'a pas de telles permissions.
Cependant, notre utilisateur est *sudo* c'est-à-dire qu'il a l'autorisation d'exécuter des commandes en tant que root en préfixant les commandes avec `sudo`.
Dans nos fichiers Ansible, cette élévation des permissions est également possible en utilisant `become: yes`.
`become` peut être ajouté à plusieurs niveaux. Dans notre cas, nous allons le définir au niveau de notre playbook pour que `become` soit effectif sur l'ensemble de notre exécution.

```yaml
# playbooks/apache.yml
---
- name: Installation Apache 2.4
 hosts: localhost
 become: yes
 roles:
   - apache
```

Exécutons à nouveau le playbook qui va nous permettre d'installer le serveur.

## Démarrage du serveur

Nous souhaitons maintenant démarrer le service afin de vérifier que le serveur se lance correctement.

Sur un serveur réel, nous gérerions le service avec le module `service`.
Exceptionnellement, comme nous travaillons dans un container `systemd` n'est pas disponible.
Nous allons donc démarrer notre serveur en appelant la commande `httpd -k start` (commande appelée normalement par le service).

```yaml
# roles/apache/tasks/main.yml
[...]
# - name: Démarre le service
#   service:
#     name: httpd
#     state: started
- name: Démarre le service (non-privileged container)
 shell: httpd -k start
 become: yes
 become_user: apache
```

## Variables

Nous allons maintenant modifier la configuration de notre serveur afin que celui-ci puisse servir notre propre page HTML que nous allons créer dans le dossier `files` de notre rôle puis nous allons ajouter une tâche qui va le copier sur notre serveur dans /srv/
Pour ce faire, vous pouvez utiliser le module [copy](https://docs.ansible.com/ansible/2.9/modules/copy_module.html).

<details>
 <summary>Afficher la solution</summary>

```yaml
# roles/apache/tasks/main.yml
- name: Déploie le fichier HTML vers le serveur
 copy:
   src: index.html
   dest: /srv/index.html
   owner: apache
   group: apache
```
</details>

Lorsque le service `httpd` est installé sur un serveur CentOS, un utilisateur `apache` et son groupe sont automatiquement créés. Sur d'autres systèmes d'exploitation, l'utilisateur serait `www-data` mais un administrateur pour créer un utilisateur avec n'importe quel nom et le dédier au service apache.
Afin de permettre aux serveurs de surcharger cette valeur, nous allons variabiliser ces valeurs en indiquant des valeurs par défaut.

```yaml
# roles/apache/defaults/main.yml
apache_user: apache
apache_group: apache
apache_directory: /srv

# roles/apache/tasks/main.yml
- name: Déploie le fichier HTML vers le serveur
 copy:
   src: index.html
   dest: "{{ apache_directory }}/index.html"
   owner: "{{ apache_user }}"
   group: "{{ apache_group }}"

- name: Démarre le service (non-privileged container)
 shell: httpd -k start
 become: yes
 become_user: "{{ apache_user }}"
```

## Configurer notre serveur - Utiliser les templates

Maintenant que nous avons déployé notre page HTML, il est nécessaire de configurer le serveur Apache afin qu'il fasse pointer la racine du serveur vers notre fichier HTML.
Cette configuration est en dehors du périmètre de ce tutoriel donc je vais vous partager le résultat attendu. Cependant, nous allons variabiliser certains éléments pour profiter de la puissance des templates.

Le résultat de configuration attendu :

```xml
<LocationMatch "^/+$">
   Options -Indexes
   ErrorDocument 403 /srv/index.html
</LocationMatch>

<Directory /srv>
   AllowOverride None
   Require all granted
</Directory>
```

Nous utilisons le module `template` pour déployer notre configuration.

```yaml
# roles/apache/handlers/main.yml
- name: Déploie la configuration de votre serveur
 template:
   src: welcome.conf.j2
   dest: /etc/httpd/conf.d/welcome.conf
   owner: "{{ apache_user }}"
   group: "{{ apache_group }}"
```

Maintenant il suffit de variabiliser la configuration par rapport aux variables que nous avions précédemment définies.

<details>
 <summary>Afficher la solution</summary>

```xml
{{ ansible_managed | comment }}

<LocationMatch "^/+$">
   Options -Indexes
   ErrorDocument 403 {{ apache_directory }}/index.html
</LocationMatch>

<Directory {{ apache_directory }}>
   AllowOverride None
   Require all granted
</Directory>
```

Rien d'impressionnant, nous avons juste remplacé les valeurs en dur par des variables de substitution. A noter cependant la première ligne du fichier `{{ ansible_managed | comment }}` qui permet d'indiquer en commentaire un texte configurable globalement dans Ansible. Considéré comme un bonne pratique, il permet d'indiquer aux administrateurs du serveur que le fichier est géré par Ansible et que toute modification qu'ils effectuaient à la main serait perdue lors du prochain déploiement via Ansible.

</details>

## Handlers

Un peu plus tôt dans ce chapitre, nous avons introduit la notion de handlers. Ce sont des tâches qui sont déclenchées à la fin d'un playbook lorsque l'événement écouté a été déclenché précédemment.

Actuellement, notre serveur redémarre toujours à la fin du rôle ce qui permet de mettre à jour sa configuration. Cependant, ce comportement ne respecte pas le principe d'**idempotence**.
Si vous avez joué plusieurs fois le *playbook*, vous avez dû vous apercevoir que le résultat de la tâche de redémarrage est toujours a `changed`. Hors, si votre configuration n'est pas modifiée, il n'y a aucune raison de redémarrer notre serveur.
Nous allons donc nous appuyer sur un *handler* pour redémarrer le serveur uniquement si sa configuration est modifiée.

```yaml
# roles/apache/tasks/main.yml
- name: Déploie la configuration de votre serveur
 template:
   src: welcome.conf.j2
   dest: /etc/httpd/conf.d/welcome.conf
   owner: "{{ apache_user }}"
   group: "{{ apache_group }}"
 notify: "restart apache"

# roles/apache/handlers/main.yml
---
- name: Redémarre le service (non-privileged container)
 command: httpd -k restart
 become: yes
 become_user: "{{ apache_user }}"
 listen: "restart apache"
```

Désormais, notre serveur ne sera redémarré que si la configuration est modifiée.
