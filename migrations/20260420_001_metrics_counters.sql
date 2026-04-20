-- database: log

CREATE TABLE IF NOT EXISTS metrics_counters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric VARCHAR(80) NOT NULL,
  label1_name VARCHAR(40) NOT NULL DEFAULT '',
  label1_value VARCHAR(100) NOT NULL DEFAULT '',
  label2_name VARCHAR(40) NOT NULL DEFAULT '',
  label2_value VARCHAR(100) NOT NULL DEFAULT '',
  cnt BIGINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_metric_labels (metric, label1_name, label1_value, label2_name, label2_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
