-- GitHub descriptions can contain emoji shortcodes (":fire:") that show as literal text on our pages.
UPDATE projects
SET short_description = TRIM(REGEXP_REPLACE(REGEXP_REPLACE(short_description, ':[a-z0-9_+-]{2,40}:', ''), '[[:space:]]{2,}', ' '))
WHERE short_description REGEXP ':[a-z0-9_+-]{2,40}:';
