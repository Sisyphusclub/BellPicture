ALTER TABLE `account` ADD `issuer` text NOT NULL DEFAULT '';--> statement-breakpoint
UPDATE `account`
SET `issuer` = CASE
	WHEN `provider_id` = 'credential' THEN 'local:credential'
	ELSE 'local:oauth:' || `provider_id`
END
WHERE `issuer` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_account_idx` ON `account` (`issuer`,`account_id`);
