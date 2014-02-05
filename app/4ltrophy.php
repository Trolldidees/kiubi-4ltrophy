<?php
/**
 * Gestionnaire 4LTrophy
 * @license Beerware
 */

include dirname(__FILE__).'/kiubi_api_dbo_client.php';

$conf['api_key'] = ''; // La clé API DBO
$conf['code_site'] = ''; // Le code site
$conf['group'] = 'etape'; // nom du groupe de billet des ?tapes
$conf['mois'] = 'février'; // mois du billet
$conf['jour'] = date('d'); // jour du billet qui va être mis à jour
$conf['date'] = date('Y-m-d'); // date des points gps à insérer/mettre à jour, en temps normal le jour en cours

$conf['minkm'] = 0.3; // 0.3 km de différence minimum entre 2 points pour que le point soit pris en compte
$conf['mysql_host'] = 'localhost';
$conf['mysql_user'] = 'root';
$conf['mysql_pass'] = ''; // Mot de passe SQL
$conf['mysql_bdd']  = 'smsd';

/**
* Gestionnaire des itinéraires
*/
class gps
{
	private $sql;
	private $conf;
	
	/**
	 * Constructeur
	 * 
	 * @param array $conf	Paramètre de configuration
	 */
	function __construct($conf) {
		$this->conf = $conf;
		$sql = mysql_connect($conf['mysql_host'], $conf['mysql_user'], $conf['mysql_pass']);
		if(!$sql) {
			echo "Connexion SQL impossible";
			die(3);
		}
		mysql_select_db($conf['mysql_bdd']);
		$this->sql = $sql;
	}
	
	/**
	 * Met à jour l'itinéraire d'une journée à partir des SMS
	 */
	function update() {
		$r = mysql_query("select date from source_kiubi where gps=1 order by date desc limit 1", $this->sql);
		$last = mysql_fetch_assoc($r);
		mysql_query("insert ignore into source_kiubi (select distinct TrackerDateTime as date, lat, lng, '1' from geo_positions where TrackerDateTime>='".$last['date']."')", $this->sql);
	}
	
	/**
	 * Retourne l'itinéraire d'une journée
	 * @return array()
	 */
	function find() {
		$r = mysql_query("select distinct date, lat, lng from source_kiubi where date>='".$this->conf['date']."' and date<='".$this->conf['date']." 23:59:59' order by date asc", $this->sql);
		if(!$r) return null;
		$res = array();
		while($t = mysql_fetch_assoc($r)) {
			$res[] = $t;
		}
		return $res;
	}
	
	/**
	 * Analyse les points d'un itinéraire
	 * @param array $points
	 * @return array
	 */
	function dedoublonne($points) {
		$ok = array();
		$last = 0;
		$skip = 0;
		for($i=0; $i<count($points); $i++) {
			if($i<count($points)-1) {
				$dist = $this->distance($points[$i], $points[$i+1]);
				$points[$i]['dist'] = $dist;
				if($dist < $this->conf['minkm']) {
					$skip++;
					continue;
				}
			} else {
				$dist = $this->distance($points[$last], $points[$i]);
				$points[$i]['dist'] = $dist;
				if($dist < $this->conf['minkm']) {
					$skip++;
					continue;
				}
			}
			$skip = 0;
			$last = $i;
			$ok[] = $points[$i];
		}
		if(count($ok)) {	
			$h = date('G', strtotime($ok[count($ok)-1]['date']));
			// si heure>18 et ça fait 3 points que le gps n'a pas bougé -> arrivé
			// si heure>20 -> arrivé
			if(($h>18 && $skip>1) || $h>20) {
				$ok[count($ok)-1]['stop'] = 'STOP';
			} 
		}
		return $ok;
	}
	
	/**
	 * Calcul la distance entre deux points
	 * @param array $start
	 * @param array $end
	 * @return float
	 */
	function distance($start, $end) {
		$lat1 = $start['lat'];
		$radianLat1 = $lat1 * (pi() / 180);
		$lng1 = $start['lng'];
		$radianLng1 = $lng1 * (pi() / 180);
		$lat2 = $end['lat'];
		$radianLat2 = $lat2 * (pi() / 180);
		$lng2 = $end['lng'];
		$radianLng2 = $lng2 * (pi() / 180);
		$earth_radius = 6371;
		$diffLat = ($radianLat1 - $radianLat2);
		$diffLng = ($radianLng1 - $radianLng2);
		$sinLat = sin($diffLat / 2);
		$sinLng = sin($diffLng / 2);
		$a = pow($sinLat, 2.0) + cos($radianLat1) * cos($radianLat2) * pow($sinLng, 2.0);
		$distance = $earth_radius * 2 * asin(min(1, sqrt($a)));
		return $distance;
	}
}

// Construction de l'itinéraire du jour
$gps = new gps($conf);
$gps->update();
$points = $gps->find();
if($points === null || !count($points)) {
	echo "Aucun point\n";
	die();
}
$points = $gps->dedoublonne($points);
$data = '';
foreach($points as $p) {
	$data .= $p['lat'].','.$p['lng'].','.$p['date'];
	if(isset($p['stop'])) {
		$data .= ',STOP';
	}
	$data .= ';';
}

// Connexion à l'API DBO
$api = new Kiubi_API_DBO_Client($conf['api_key']);
$r = $api->get('sites/'.$conf['code_site'].'/cms/posts?group='.$conf['group'].'&extra_fields=texts');
if($r->hasSucceed()) {
	$posts = $r->getData();
	foreach($posts as $p) {
		if($p['title']!=$conf['jour'].' '.$conf['mois']) continue;
		$rr = $api->put('sites/'.$conf['code_site'].'/cms/posts/'.$p['post_id'], array('text2'=>$data));
		if($rr->hasSucceed()) {
			echo "OK\n";
		} else die(2);
	}
	echo "FIN\n";
} else die(1);
echo "\n";
