CREATE TEMPORARY TABLE groups_with_totals (
  id int unique not null,
  name text not null,
  count_all int not null
);

INSERT INTO groups_with_totals (id, name, count_all)
  SELECT
    G0.id,
    G0.name,
    count(*) AS count_all
  FROM fb_groups AS G0
  JOIN fb_groups_users AS GU0 ON GU0.group_id = G0.id
  GROUP BY G0.id;


EXPLAIN SELECT
  g1.id AS main_id,
  g1.name AS main_name,
  g2.id AS matching_id,
  g1.count_all AS count_all,
  count(NULLIF(GU1.user_id = GU2.user_id, 0)) AS count_match
FROM
  groups_with_totals AS g1
JOIN fb_groups AS g2 ON g1.id = g2.id AND g1.id >= g2.id
JOIN fb_groups_users AS GU1 ON GU1.group_id = g1.id
LEFT JOIN fb_groups_users AS GU2 ON GU2.group_id = g2.id
WHERE 1
  AND g1.id < 10
GROUP BY g1.id, g1.name, g2.id, g2.name
;


-- select count(*), g.id, g.name from fb_groups_users gu join fb_groups g on gu.group_id = g.id group by g.name order by 1 desc;
