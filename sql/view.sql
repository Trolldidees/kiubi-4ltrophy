CREATE TABLE `source_kiubi` (
  `date` datetime NOT NULL,
  `lat` varchar(255) NOT NULL DEFAULT '',
  `lng` varchar(255) NOT NULL DEFAULT '',
  `gps` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`date`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `geo_positions`
AS SELECT
   `inbox`.`smsdate` AS `ReceivingDateTime`,substring_index(substring_index(`inbox`.`text`,'lat: ',-(1)),' ',1) AS `lat`,substring_index(substring_index(`inbox`.`text`,'long: ',-(1)),' ',1) AS `lng`,if((locate('speed: ',`inbox`.`text`) > 0),substring_index(substring_index(`inbox`.`text`,'speed: ',-(1)),' ',1),NULL) AS `speed`,if((locate(' bat:',`inbox`.`text`) > 0),str_to_date(substring_index(substring_index(`inbox`.`text`,' bat:',1),' ',-(3)),'%d/%m/%y %H:%i'),NULL) AS `TrackerDateTime`,if((locate('bat:',`inbox`.`text`) > 0),substring_index(substring_index(`inbox`.`text`,'bat:',-(1)),' ',1),NULL) AS `bat`,if((locate('signal:',`inbox`.`text`) > 0),substring_index(substring_index(`inbox`.`text`,'signal:',-(1)),' ',1),NULL) AS `signal`,if((locate('imei:',`inbox`.`text`) > 0),substring_index(substring_index(`inbox`.`text`,'imei:',-(1)),' ',1),NULL) AS `imei`
FROM `inbox` where (`inbox`.`text` like 'lat: %long: %');
