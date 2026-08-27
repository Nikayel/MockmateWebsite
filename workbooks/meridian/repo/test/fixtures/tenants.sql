-- Reference fixture data. Not run by this repo's own test suite (nothing in test/ reads
-- this file) - it exists for whoever needs a realistic tenant row to seed a database with.
insert into tenants (id, name, webhook_url, webhook_secret, created_at)
values (
  'ten_northwind',
  'Northwind Mutual',
  'https://northwind.example.com/webhooks/meridian',
  'nw-shared-secret',
  '2025-11-02T08:00:00.000Z'
);
