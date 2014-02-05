var kmap;
var steps = [];
var KGmaps = function(id, steps){
	this.steps = steps;
	this.kmD=0, this.kmT=0, this.cur=0, this.tobuild=[], this.pointstep=3, this.minkm=0.3, this.stop='STOP', this.mois='février', this.page='index';	
	this.icon_start='/theme/img/icon_start.png';
	this.icon_car='/theme/img/icon_car.png';
	this.icon_point='/theme/img/icon_gps.png';
	this.icon_stop='/theme/img/icon_end.png';
	var init = steps[0].centre.split(',');
	var initlat = init[0], initlng = init[1], initzoom = 6;
	var today = new Date();
	for(var i=0; i<steps.length; i++) {
		var points = steps[i].points.split(';');
		this.tobuild.push(points);
		if(steps[i].date == today.getDate()+' '+this.mois) {
			var found = i;
			if(i>0 && (!points.length || points[0]=='')) {
				found = i-1;
			}
			this.cur = found;			
			init = steps[found].centre.split(',');
			initlat = init[0], initlng = init[1];
		}		
	}	

	this.infowindow = new google.maps.InfoWindow({content: 'Chargement...'});	
	this.map = new google.maps.Map(document.getElementById(id), {
		center: new google.maps.LatLng(initlat, initlng),
		zoom: initzoom,
		mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT
        },
        panControl: true,
        panControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP
        },
        zoomControl: true,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.RIGHT_TOP
        },
        scaleControl: false,
        streetViewControl: true,
        streetViewControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP
        },
		styles: [{"featureType":"water","stylers":[{"visibility":"on"},{"color":"#acbcc9"}]},{"featureType":"landscape","stylers":[{"color":"#f2e5d4"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#c5c6c6"}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#e4d7c6"}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#fbfaf7"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#c5dac6"}]},{"featureType":"administrative","stylers":[{"visibility":"on"},{"lightness":33}]},{"featureType":"road"},{"featureType":"poi.park","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":20}]},{},{"featureType":"road","stylers":[{"lightness":20}]}]
	});

	this.addPanel();
	this.build();	
};
KGmaps.prototype.addPanel = function() {
	$("#panel").append('<ul class="catalog"></ul>');
	for(var d=0; d<this.steps.length; d++) {
		$("#panel ul").append('<li><a data-id="'+d+'" href="#">'+this.steps[d].date+'<span>'+this.steps[d].name+'</span></a></li>');
	}	
};
KGmaps.prototype.build = function() {
	this.lines = [];
	this.kmT = 0;
	for(var b=0; b<this.tobuild.length; b++) {
		this.addLine(this.tobuild[b]);
	}
};
KGmaps.prototype.points2line = function(points) {
	var ln = [], last = null, km, next;	
	for(var p=0; p<points.length; p++) {
		var latlng = points[p].split(',');		
		if(latlng[1]) {
			if(p<points.length-1) {
				next = points[p+1].split(',');		
				km = this.distance(latlng, next);
				if(km < this.minkm && latlng[3]!=this.stop) {
					continue;
				}
			} else {
				km = this.distance(last, latlng);
				if(km < this.minkm && latlng[3]!=this.stop) {
					continue;
				}
			}
			ln.push([latlng[0], latlng[1], latlng[2], latlng[3]]);
			last = latlng;
			if(latlng[3]==this.stop) break;
		}
	}
	return ln;	
};
KGmaps.prototype.addLine = function(points) {
	var ln = this.points2line(points);
	this.kmD = 0;
	this.lines.push({
		'line': this.buildLine(ln),
		'pts': this.buildLineMarkers(ln, this.lines.length),
		'init': ln
	});
};
KGmaps.prototype.setLine = function(cur, points) {
	var ln = this.points2line(points);
	this.kmD = 0;
	this.lines[cur] = {
		'line': this.buildLine(ln),
		'pts': this.buildLineMarkers(ln, cur),
		'init': ln
	};
};
KGmaps.prototype.buildLine = function(line) {
	var p = [];
	for(var i=0; i<line.length; i++) {
		p.push(new google.maps.LatLng(line[i][0], line[i][1]));
	}
	return new google.maps.Polyline({
		path: p,
		map: this.map,
		visible: false,
		strokeColor: '#343391',
		strokeOpacity: 0.6,
		strokeWeight: 6
	});			
};
KGmaps.prototype.buildLineMarkers = function(line, cur) {
	var self = this;
	var m = [];
	var last = null;
	for(var p=0; p<line.length; p+=this.pointstep) {
		var kmL = 0;
		if(p+this.pointstep >= line.length) p = line.length - 1;		
		if(last != null) {
			var diffD = moment(line[0][2]).from(moment(line[p][2]), true);			
			for(var k=last+1; k<=line.length; k++) {
				if(k>p) break;
				var km = this.distance(line[k-1], line[k]);				
				kmL -= -km;					
				this.kmD -= -km;
				this.kmT -= -km;				
			}		
		}	
		var html = '<h5 class="cat">'+this.steps[cur].name+' - KM '+parseInt(this.kmD)+'</h5>';
		html+='<dl>';
		html+='<dt>Position :</dt><dd>'+parseFloat(line[p][0])+' , '+parseFloat(line[p][1])+'</dd>';		
		var heure = line[p][2].substr(11, 5);
		if(parseInt(this.kmD)==0) {
			html+='<dt>Heure de départ :</dt><dd>'+heure+'</dd>';
		} else if(line[p][3]==this.stop) {
			html+='<dt>Heure d\'arrivée :</dt><dd>'+heure+'</dd>';
		} else {
			html+='<dt>Heure de passage :</dt><dd>'+heure+'</dd>';
		}
		if(last != null) {
			html+='<dt>Temps depuis le début de l\'étape :</dt><dd>'+diffD+'</dd>';
			html+='<dt>KM parcourus depuis le dernier point :</dt><dd>'+kmL.toFixed(3)+'</dd>';
			html+='<dt>KM parcourus sur toute l\'étape :</dt><dd>'+this.kmD.toFixed(3)+'</dd>';
		}
		if(this.kmT > 0) {
			html+='<dt>KM parcourus depuis le début de la course :</dt><dd>'+this.kmT.toFixed(3)+'</dd>';
		}
		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(line[p][0], line[p][1]),
			map: this.map,
			visible: false,
			icon: line[p][3]==this.stop?this.icon_stop:(p==0?this.icon_start:(p==line.length-1?this.icon_car:this.icon_point)),
			html: html
		});		
		if(line[p][3]==this.stop) {
			$("#panel ul li a[data-id='"+cur+"']").data('stop', true);
		}
		google.maps.event.addListener(marker, 'click', function() {			
			self.infowindow.setContent('<div class="bulle">'+this.html+'</div>');
			self.infowindow.open(self.map, this);
		});
		m.push(marker);
		last = p;
	}
	return m;
};
KGmaps.prototype.show = function(cur) {	
	if(cur == null) cur = this.cur;	
	$("#panel ul li a").removeClass('activepoint').find("p").remove();
	$("#panel ul li a[data-id='"+cur+"']").addClass('activepoint').append('<p class="arrow"></p>');
	if(!this.lines[cur].pts.length) return;				
	this.cur = cur;
	this.lines[cur].line.setVisible(true);
	var LatLngList = [];
	for(var p=0; p<this.lines[cur].pts.length; p++) {
		this.lines[cur].pts[p].setVisible(true);		
	}
	for(var p=0; p<this.lines[cur].init.length; p++) {
		LatLngList.push(new google.maps.LatLng(this.lines[cur].init[p][0], this.lines[cur].init[p][1]));
	}
	var last = this.lines[cur].pts[this.lines[cur].pts.length-1];
	this.infowindow.setContent('<div class="bulle">'+last.html+'</div>');
	this.infowindow.open(this.map, last);
	
	var bounds = new google.maps.LatLngBounds();
	for (var i=0; i<LatLngList.length; i++) {
	  bounds.extend(LatLngList[i]);
	}
	this.map.fitBounds(bounds);
	this.map.panBy(-300, 0);
};
KGmaps.prototype.reset = function() {
	this.infowindow.close();
	for(var cur=0; cur<this.lines.length; cur++) {
		this.lines[cur].line.setVisible(false);
		for(var p=0; p<this.lines[cur].pts.length; p++) {
			this.lines[cur].pts[p].setVisible(false);
		}
	}
};
KGmaps.prototype.bounce = function(cur) {
	if(!this.lines[cur].pts.length) return;				
	var m = this.lines[cur].pts[this.lines[cur].pts.length-1];
	m.setAnimation(google.maps.Animation.BOUNCE);
	setTimeout(function(){
		m.setAnimation(null);
	}, 5000);
};
KGmaps.prototype.autoreload = function(page, cur) {
	if(page == null) page = this.page;
	if(cur == null) cur = this.cur;
	if($('#panel ul li a[data-id="'+cur+'"]').data('stop') == true) return;
	var self = this;
	setInterval(function(){
		kiubi.cms.getPostsOfPage(page, 'extra_fields=texts').done(function(meta, data){
			var points = data[cur].text2;
			if(self.steps[cur].points == points) return;			
			self.steps[cur].points = points;			
			self.tobuild[cur] = points.split(';');
			self.reset();
			self.build();
			if(self.cur == cur) {
				self.show(cur);
				self.bounce(cur);
			} else {
				self.show(self.cur);
			}
		});
	}, 10000);
};
KGmaps.prototype.distance = function(start, end) {
	var lat1 = start[0];
    var radianLat1 = lat1 * (Math.PI / 180);
    var lng1 = start[1];
    var radianLng1 = lng1 * (Math.PI / 180);
    var lat2 = end[0];
    var radianLat2 = lat2 * (Math.PI / 180);
    var lng2 = end[1];
    var radianLng2 = lng2 * (Math.PI / 180);
    var earth_radius = 6371;
    var diffLat = (radianLat1 - radianLat2);
    var diffLng = (radianLng1 - radianLng2);
    var sinLat = Math.sin(diffLat / 2);
    var sinLng = Math.sin(diffLng / 2);
    var a = Math.pow(sinLat, 2.0) + Math.cos(radianLat1) * Math.cos(radianLat2) * Math.pow(sinLng, 2.0);
    var distance = earth_radius * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
	return parseFloat(distance);
};
$(function(){	
	moment.lang('fr');	
	kmap = new KGmaps('map_canvas', steps);
	kmap.show();			
	kmap.autoreload();
	$(document).on('click', '#panel ul li a', function(){
		kmap.reset();
		kmap.show($(this).data('id'));
		return false;
	});
	$('#map_open,#showfullmap').on('click', function () {
		$("#cont").addClass("none");
		$("#Show_cont").removeClass("none");
	})
	$('#Show_cont').on('click', function () {
		$("#cont").removeClass("none");
	});
	$(".inner ul li a").each(function (i) {
		$(document).on('click', ".inner ul li a:eq(" + i + ")", function () {
			$(this).blur();
			var tab_id = i + 1;
			if(!$("#tab" + tab_id).length) return false;			
			if($(this).data('type')=='lien_ext') {
				window.location = $(this).data('link');
				return false;
			}			
			$(".inner ul li a").removeClass("active");
			$("#tabs .active").removeClass("active");
			$(this).addClass("active");
			$("#tabs > div").stop(false, false).hide();
			$("#tab" + tab_id).stop(false, false).show();
			$("#cont").attr('class', 'col-md-11 '+$("#tab" + tab_id).data('size'));
			return false;
		});
	});
	$(".inner ul li a:first").click();
	$(".gradientmenu").pxgradient({
		step: 10,
		colors: ["#fdfeff", "#cfeefa"],
		dir: "y"
	});
});
