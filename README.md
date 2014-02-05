# Suivi temps réel du 4LTrophy


## Introduction

Le défi technique qui s'est présenté à nous est de trouver un moyen de suivre le déplacement d'une 4L dans le désert marocain et d'afficher son itinéraire sur une carte dynamique.

Pour cela, nous avons utilisé :

- un GPS équipé d'une puce GSM (capable d'envoyer des SMS) : le TK-102
- une clé 3G USB : la E1752 de Huawei
- deux cartes SIM et les abonnements mobiles qui vont avec
- un serveur debian où connecter la clé 3G et exécuter une peu de code, avec un serveur MySQL installé
- un site [Kiubi](http://www.kiubi.com)


## Fonctionnement global

Le fonctionnement global est le suivant :

1. Le GPS envoie à intervalle régulier sa position par l'intermédiaire de SMS à la clé 3G.
2. Le serveur écoute la clé 3G et enregistre les SMS qui arrivent dans une base de données.
3. Un petit script sur le serveur va trier et décomposer les SMS pour en extraire l'itinéraire de la journée. Il va ensuite publier cet itinéraire dans le site Kiubi.
4. Le site affiche une carte où est dessiné l'itinéraire.

Le choix des cartes SIMs et des abonnements qui vont avec est important. Le GPS va envoyer beaucoup de SMS et qui plus est de l'étranger. Il faut bien vérifier d'une part que le GPS pourra envoyer des SMS vers la France et d'autre part à quel coût. On parle là de plusieurs centaines de SMS !

Petit conseil, durant la phase de tests en France, souscrivez des forfaits SMS illimités pour ne pas avoir de mauvaises surprises.


## Préparation du GPS TK-102

Il n'y a pas grand-chose à faire, recharger la batterie, glisser une carte SIM dedans et lui envoyer un SMS d'initialisation `begin123456` à partir de son téléphone. Il devrait répondre au bout de quelques dizaines de secondes `BEGIN OK!`.

Au démarrage, le GPS met une à deux minutes à se localiser. Après vous pouvez demander sa position en lui envoyant le SMS : `smslink123456`. Il répondra par SMS un lien à ouvrir sur Google Maps.

Le GPS possède un autre format qui nous intéresse plus. Il s'obtient en envoyant `smstext123456`. Il répond alors quelque chose comme ça :

	lat: 48.071676 long: 007.347595 speed: 000.0 05/02/14 10:17 
	bat:F signal:F imei:012345678901234

On a dans l'ordre :

- la latitude
- la longitude
- la vitesse de déplacement
- la date et heure de la dernière position GPS connue
- l'état de charge la batterie
- la force du signal GPS
- le numéro imei du GPS


## Clé 3G

La clé que nous utilisons est une clé qui trainait au fond d'un placard, nous n'avons pas de recommandation spécifique. Il nous a juste fallu la désimlocker pour qu'elle accepte la nouvelle carte SIM.

Nous utilisons [Gnokii](http://gnokii.org/). Ce programme à l'avantage d'être disponible de base sur debian et de supporter la E1752 de Huawei. Grâce à la commande suivante, nous l’installons aux côtés de quelques paquets supplémentaires pour gérer correctement la clé via USB :

    # apt-get install usb-modeswitch ppp wvdial gnokii-cli gnokii-smsd-mysql

Le paquet `gnokii-smsd-mysql` est un module de gnokki qui va se charger pour nous de publier tous les SMS reçus par la clé dans une base de données MySQL.

Il faut ensuite créer le fichier de configuration :

    # mkdir -p /root/.config/gnokii/
    # touch /root/.config/gnokii/config

Éditer ce fichier et renseigner les lignes suivantes. Le port du modem est à trouver via `dmsg`. Remplacer au besoin **/dev/ttyUSB0** par le bon port.

	[global]
	model = AT  
	port = /dev/ttyUSB0  
	connection = serial

Il faut mettre maintenant en place une base de données (ici `smsd`) qui va recevoir les mails :

    # mysqladmin -uroot -p create smsd
    # mysql smsd -u root -p < /usr/share/doc/gnokii-smsd-mysql\          /sms.tables.mysql.sql
    # mysql smsd -u root -p < sql/view.sql

Démarrer gnokii en mettant le bon **MOTDEPASSEMYSQL**.

    # smsd -u root -p 'MOTDEPASSEMYSQL' -d smsd -m mysql -f /var/log/smsd.log -b SM -S 10

Vous pouvez maintenant :

- envoyer des SMS avec la clé en insérant des enregistrements dans la table `outbox`. Gnokii met à jour cette table au fur et à mesure des envois.
- consulter tous les SMS reçus dans la table  `inbox`.

Il suffit maintenant d'insérer un enregistrement dans la table `outbox` en indiquant le numéro de téléphone du GPS et le message `smstext123456` pour recevoir dans la table `inbox` la réponse du GPS !


## Cartogaphie

Dans le site Kiubi, nous avons créé une page qui contient un billet par étape du 4LTrophy. Tous ces billets sont vides et appartiennent au groupe `etape`. C'est dans ces billets, et plus précisément dans le champ `texte2` de ces billets, qu'on stockera les itinéraires.

Ce dépot contient un type de billet préconfiguré. Copiez le dossier `theme/fr/billets/etape_carte` dans votre thème graphique personnalisé puis créez un billet par étape. N'oubliez pas de mettre le billet dans le groupe  `etape`.

Ce type billet contient les 4 champs suivants :

 - Date : la date de l'étape
 - Etape : le nom de l'étape
 - Point de centrage : un point de centrage de la carte
 - Points GPS : l'itinéraire (ce champ sera remplis automatiquement)

Le point de centrage permet d'afficher la région d'une étape tant qu'il n'y a pas d'itinéraire de renseigné pour cette étape.


L'affichage de la carte se fait sur une bonne vieille google map. Pour cela, il faut inclure les scripts suivant dans la page :

<pre lang="html">
&lt;script type="text/javascript" src="//cdn.kiubi-web.com/js/kiubi.api.pfo.jquery-1.0.min.js">&lt;/script>
&lt;script type="text/javascript" src="http://maps.google.com/maps/api/js?sensor=false">&lt;/script>
&lt;script type="text/javascript" src="/theme/fr/js/moment.min.js">&lt;/script>
&lt;script type="text/javascript" src="/theme/fr/js/map.js">&lt;/script>
</pre>

Il faut également copier les fichiers contenus dans le dossier `theme/js` de ce dépôt au même endroit dans le thème personnalisé. De même pour les images contenues dans le dossier `theme/img`.

La carte est alors affichée dans le `<div id="map">` contenu dans la page. Mais comment sont affichés les itinéraires ? La page exécute du javascript, via l'objet `KGmaps` qui va utiliser l'API Front-office pour récupérer le contenu des billets du groupe `etape`. On calcule ici toutes les données relatives au temps et à la distance parcourue. Les points sont ensuite rajoutés un à un sur la carte.


## Mise à jour du site Kiubi

Afin de mettre à jour ces billets automatiquement à partir de notre serveur, nous utilisons l'API Developers. Pour s'y connecter, il faut générer une clé API personnelle dans son back-office. Notez cette clé, elle servira dans la suite. Toutes les informations relatives à l'API Developers sont disponibles dans l'[aide en ligne de Kiubi](http://aide.kiubi.com/api-developers.html).

Installer les scripts `app/4ltrophy.php` et `app/kiubi_api_dbo_client.php` dans un coin de votre serveur. Éditer le script `4ltrophy.php` et paramétrer les lignes :

    $conf['api_key'] = '**VOTRE CLE API**';
    $conf['code_site'] = '**LE CODE SITE**';
    $conf['mysql_pass'] = '**MOT DE PASSE MYSQL**';

Il ne reste plus qu'à lancer le script `4ltrophy.php` à intervalle régulier, avec l'aide de CRON par exemple. Ce script va se connecter à la base de données, extraire les itinéraires des SMS puis va les publier dans les billets du site Kiubi.

Le script est en fait un peu plus malin que ça, car il va également nettoyer les itinéraires. Les points identiques sont ignorés : on ne trace pas de nouveaux points si la voiture est à l'arrêt par exemple. De même, les points à moins de 300 mètres les uns des autres sont ignorés, à cause de l'imprécision du GPS.


