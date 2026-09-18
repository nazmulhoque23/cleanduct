package db

import (
	"testing"
)

// An existing database seeded by the original (unversioned) seed must be
// upgraded in place: new columns filled, new posts added, nothing deleted.
func TestSeedUpgradesExistingDatabase(t *testing.T) {
	conn, err := Open(t.TempDir() + "/old.db")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	if err := Migrate(conn); err != nil {
		t.Fatal(err)
	}
	// Simulate the v1 world: services present, areas without intros, only 3 posts, no seed_meta.
	if _, err := conn.Exec(`INSERT INTO services (slug,name,short_desc,long_desc) VALUES ('air-duct-cleaning','Air Duct Cleaning','x','y')`); err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(`INSERT INTO service_areas (slug,city,state) VALUES ('schaumburg','Schaumburg','IL')`); err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(`INSERT INTO posts (slug,title,excerpt,body,published_at) VALUES ('signs-your-air-ducts-need-cleaning','Owner edited title','e','b','2026-01-01')`); err != nil {
		t.Fatal(err)
	}
	// A lead the owner must not lose.
	if _, err := conn.Exec(`INSERT INTO leads (full_name,email,phone) VALUES ('Keep Me','k@example.com','3125550100')`); err != nil {
		t.Fatal(err)
	}

	if err := Seed(conn); err != nil {
		t.Fatal(err)
	}

	var intro, title string
	if err := conn.QueryRow(`SELECT intro FROM service_areas WHERE slug='schaumburg'`).Scan(&intro); err != nil || intro == "" {
		t.Errorf("expected Schaumburg intro to be filled in, got %q (%v)", intro, err)
	}
	if err := conn.QueryRow(`SELECT title FROM posts WHERE slug='signs-your-air-ducts-need-cleaning'`).Scan(&title); err != nil || title != "Owner edited title" {
		t.Errorf("existing post must not be overwritten, got %q (%v)", title, err)
	}
	var posts, leads int
	_ = conn.QueryRow(`SELECT COUNT(*) FROM posts`).Scan(&posts)
	_ = conn.QueryRow(`SELECT COUNT(*) FROM leads`).Scan(&leads)
	if posts != len(seedPosts) {
		t.Errorf("expected %d posts after upgrade, got %d", len(seedPosts), posts)
	}
	if leads != 1 {
		t.Errorf("leads must survive the seed upgrade, got %d", leads)
	}
	var v string
	_ = conn.QueryRow(`SELECT value FROM seed_meta WHERE key='version'`).Scan(&v)
	if v != itoa(SeedVersion) {
		t.Errorf("expected seed version %d recorded, got %q", SeedVersion, v)
	}

	// Running again is a no-op.
	if err := Seed(conn); err != nil {
		t.Fatal(err)
	}
	_ = conn.QueryRow(`SELECT COUNT(*) FROM posts`).Scan(&posts)
	if posts != len(seedPosts) {
		t.Errorf("second run changed post count to %d", posts)
	}
}

func TestSeedFreshDatabase(t *testing.T) {
	conn, err := Open(t.TempDir() + "/new.db")
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	if err := Migrate(conn); err != nil {
		t.Fatal(err)
	}
	if err := Seed(conn); err != nil {
		t.Fatal(err)
	}
	var services, areas, posts int
	_ = conn.QueryRow(`SELECT COUNT(*) FROM services`).Scan(&services)
	_ = conn.QueryRow(`SELECT COUNT(*) FROM service_areas WHERE intro != ''`).Scan(&areas)
	_ = conn.QueryRow(`SELECT COUNT(*) FROM posts`).Scan(&posts)
	if services == 0 || areas != len(seedAreas) || posts != len(seedPosts) {
		t.Errorf("fresh seed incomplete: services=%d areas=%d posts=%d", services, areas, posts)
	}
}
