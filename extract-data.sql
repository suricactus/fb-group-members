SELECT
  g1.id AS main_id,
  g1.name AS main_name,
  g2.id AS matching_id,
  g1.count_all AS count_all,
  count(GU1.id) AS count_all1,
  count(GU2.id) AS count_match
FROM
  groups_with_totals AS g1
JOIN fb_groups AS g2 ON g1.id >= g2.id
JOIN fb_groups_users AS GU1 ON GU1.group_id = g1.id
LEFT JOIN fb_groups_users AS GU2 ON GU2.group_id = g2.id AND GU1.user_id = GU2.user_id
WHERE 1 = 1
GROUP BY g1.id, g1.name, g2.id, g1.count_all
;

