insert into zones (id, name, latitude, longitude, criticality) values
  (1, 'Centro Historico', -13.5166000, -71.9789000, 'Alta'),
  (2, 'Wanchaq', -13.5256000, -71.9558000, 'Alta'),
  (3, 'San Sebastian', -13.5309000, -71.9386000, 'Media'),
  (4, 'San Jeronimo', -13.5439000, -71.8889000, 'Media'),
  (5, 'Santiago', -13.5350000, -71.9847000, 'Alta')
on conflict (id) do update set name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude, criticality = excluded.criticality;

insert into schedules (id, zone_id, day, time, waste) values
  (1, 1, 'Lunes, miercoles y viernes', '06:30 - 08:30', 'Organico y reciclable'),
  (2, 2, 'Martes, jueves y sabado', '07:00 - 09:00', 'No reciclable y reciclable'),
  (3, 3, 'Lunes, jueves y sabado', '05:30 - 07:30', 'Organico'),
  (4, 4, 'Miercoles y sabado', '08:00 - 10:00', 'Mixto segregado'),
  (5, 5, 'Martes y viernes', '06:00 - 08:00', 'Reciclable')
on conflict (id) do update set day = excluded.day, time = excluded.time, waste = excluded.waste;

insert into trucks (id, code, driver, status, zone_id, latitude, longitude) values
  (1, 'C-01', 'Luis Huaman', 'En ruta', 1, -13.5166000, -71.9789000),
  (2, 'C-02', 'Rosa Ccahuana', 'En ruta', 2, -13.5256000, -71.9558000),
  (3, 'C-03', 'Mario Quispe', 'Mantenimiento', 3, -13.5309000, -71.9386000),
  (4, 'C-04', 'Elena Condori', 'En ruta', 5, -13.5350000, -71.9847000)
on conflict (id) do update set code = excluded.code, driver = excluded.driver, status = excluded.status, zone_id = excluded.zone_id, latitude = excluded.latitude, longitude = excluded.longitude;

insert into routes (id, truck_id, zone_id, progress, eta, delay, latitude, longitude) values
  (1, 2, 2, 62, '12 min', 'Sin retraso', -13.5256000, -71.9558000),
  (2, 1, 1, 86, '5 min', 'Sin retraso', -13.5166000, -71.9789000),
  (3, 4, 5, 31, '28 min', 'Retraso moderado', -13.5350000, -71.9847000)
on conflict (id) do update set progress = excluded.progress, eta = excluded.eta, delay = excluded.delay, latitude = excluded.latitude, longitude = excluded.longitude;

insert into reports (id, citizen, zone, type, detail, status) values
  (1, 'Ana Quispe', 'Wanchaq', 'Acumulacion de basura', 'Contenedor lleno cerca al mercado.', 'En revision'),
  (2, 'Jose Huaman', 'Santiago', 'Retraso', 'No paso el camion en el horario indicado.', 'Pendiente')
on conflict (id) do update set citizen = excluded.citizen, zone = excluded.zone, type = excluded.type, detail = excluded.detail, status = excluded.status;

insert into collections (id, zone_id, truck_id, kg, status, date) values
  (1, 1, 1, 420, 'Confirmada', '2026-06-10'),
  (2, 2, 2, 360, 'Confirmada', '2026-06-10'),
  (3, 5, 4, 210, 'Parcial', '2026-06-09')
on conflict (id) do update set kg = excluded.kg, status = excluded.status, date = excluded.date;

select setval('zones_id_seq', (select max(id) from zones));
select setval('schedules_id_seq', (select max(id) from schedules));
select setval('trucks_id_seq', (select max(id) from trucks));
select setval('routes_id_seq', (select max(id) from routes));
select setval('reports_id_seq', (select max(id) from reports));
select setval('collections_id_seq', (select max(id) from collections));
