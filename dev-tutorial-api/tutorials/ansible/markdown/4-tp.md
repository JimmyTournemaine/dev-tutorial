# Ansible - TP
Nous avons vu les principaux concepts d'Ansible. Il en reste de nombreux autres que vous pourrez decouvrir par vous-meme dans la documentation en fonction de vos besoins, je pense notamment aux [filtres](https://docs.ansible.com/ansible/2.9/user_guide/playbooks_filters.html#filters), aux [lookups](https://docs.ansible.com/ansible/2.9/plugins/lookup.html) ou a des commandes comme `ansible-inventory` ou `ansible-lint`.
 
Cependant, vous devriez avoir suffisamment de concepts en tête afin de réaliser le TP qui vous est proposé.
 
## C'est à vous!
L'objectif est de déployer un serveur Tomcat. Afin de protéger un minimum le serveur, nous allons créer un utilisateur et un groupe dédié pour exécuter le service. A noter également que l'exécution de Tomcat requiert l'installation de Java.
Nous allons donc rédiger les tâches de notre rôle afin d'effectuer les actions suivantes :
1. Installer OpenJDK. Nous installerons `java-11-openjdk` en utilisent le module [yum](https://docs.ansible.com/ansible/2.9/modules/yum_module.html)
2. Creation de l'utilisateur 'tomcat' et du groupe primaire 'tomcat' avec le module [user](https://docs.ansible.com/ansible/2.9/modules/user_module.html)
3. Installation du serveur Apache Tomcat 9 en le recuperant sur internet grace au module [get_url](https://docs.ansible.com/ansible/2.9/modules/get_url_module.html) afin de recuperer l'archive dans un dossier temporaire. Il faudra ensuite extraire cette archive dans /opt/tomcat afin de compléter son installation (a vous de trouver le module approprié).
4. Démarrer le service avec le script `startup.sh` fourni dans l'archive.
5. Vérifier que le serveur démarre correctement en envoyant une requête sur le port 8080 de l'hôte.
Il existe des modules `command` ou encore `shell` qui permettent d'exécuter n'importe quelle ligne de commande. En revanche, il est fortement déconseillé de les utiliser car ils ne respectent pas les principes d'Ansible (particulièrement l'idempotence). Il existe une [multitude de modules](https://docs.ansible.com/ansible/2.9/modules/list_of_all_modules.html) qui peuvent être utilisés et il est fortemment probable qu'un module existe pour votre besoin.
Notre rôle sera appelé par le point d'entrée des exécutions Ansible... un *playbook* dont voici un exemple.
```yaml
# playbooks/tomcat.yml
---
- name: Installation d'un serveur Apache Tomcat
hosts: localhost
roles:
  - tomcat
```
Vous devriez avoir toutes les bases qui permettent de développer ce rôle.
N'oubliez pas que lorsque vous ne savez pas quel module utiliser pour une action donnée, il suffit de la rechercher dans la documentation Ansible !
A vous de jouer !
## Solution
 
<details>
<summary>Afficher la solution</summary>
 Il y a de nombreuses façons d'aborder les différentes problématiques de l'installation d'un tel composant.
Voici un exemple de solution qui permet l'installation d'un serveur Tomcat en respectant les taches de la consigne.
<details>
  <summary>playbooks/tomcat.yml</summary>
```yaml
---
- name: Installation d'un serveur Apache Tomcat
hosts: localhost
roles:
  - tomcat
post_tasks:
  - name: Vérifie que la page du Tomcat s'affiche correctement
    uri:
      url: http://{{ inventory_hostname }}:8080/
      status_code: 200
      return_content: yes
    register: tomcat_page
    until: tomcat_page.status == 200
    retries: 10
    delay: 2
```
</details>
<details>
  <summary>roles/tomcat/defaults/main.yml</summary>
```yaml
---
tomcat_user: tomcat
tomcat_group: tomcat
tomcat_version: 9.0.41
tomcat_distribution: "https://downloads.apache.org/tomcat/tomcat-9/v{{ tomcat_version }}/bin/apache-tomcat-{{ tomcat_version }}.tar.gz"
tomcat_checksum_type: sha512
tomcat_checksum: b6450e590a37c5bccf049b1176c441f0964796995e80d4c7c7d9fb74f9ad817107c303b6b83ed3d71c9251b2b8acf334b90a4abdf9deea122e338643cece0766
tomcat_openjdk_package: java-11-openjdk
```
</details>
<details>
  <summary>roles/tomcat/tasks/main.yml</summary>
```yaml
---
- name: Installation de OpenJDK
yum:
  name: "{{ tomcat_openjdk_package }}"
  state: present
- name: Cree le groupe tomcat
group:
  name: "{{ tomcat_group }}"
- name: Cree l'utilisateur tomcat
user:
  name: "{{ tomcat_user }}"
  group: "{{ tomcat_group }}"
  shell: /bin/false
  home: /opt/tomcat
- name: Telecharger Apache Tomcat
get_url:
  url: "{{ tomcat_distribution }}"
  dest: /tmp/tomcat.tar.gz
  checksum: "{{ tomcat_checksum_type }}:{{ tomcat_checksum }}"
- name: Installé Tomcat
unarchive:
  src: /tmp/tomcat.tar.gz
  dest: /opt/tomcat
  owner: "{{ tomcat_user }}"
  remote_src: yes
  extra_opts: [--strip-components=1]
notify: "restart tomcat"
- name: Vérifie que les scripts soient exécutables
file:
  name: "{{ item }}"
  mode: u+x
loop:
  - /opt/tomcat/bin/startup.sh
  - /opt/tomcat/bin/shutdown.sh
```
</details>
<details>
  <summary>roles/tomcat/handlers/main.yml</summary>
```yaml
---
- name: Redémarre le serveur tomcat
shell: /opt/tomcat/bin/shutdown.sh && /opt/tomcat/bin/startup.sh
become: yes
become_user: "{{ tomcat_user }}"
listen: "restart tomcat"
```
</details>
</details>
 