package db

import (
	"database/sql"
	"log"
	"strings"
)

// Seed inserts placeholder content the first time the app runs (when the
// services table is empty). Replace this content with real business data
// or manage it through the admin API later.
func Seed(conn *sql.DB) error {
	var n int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM services`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	log.Println("db: seeding placeholder content")

	tx, err := conn.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// ---- Services -------------------------------------------------------
	services := []struct {
		slug, name, short, long, icon, cat string
		price                              int
		featured                           bool
	}{
		{"air-duct-cleaning", "Air Duct Cleaning",
			"Whole-home negative-pressure cleaning that removes years of dust, dander and debris from every supply and return.",
			"Our technicians connect a truck-mounted HEPA vacuum to your main trunk line to place the entire system under negative pressure. Rotating brushes and compressed-air whips then agitate each supply and return run, pushing loosened debris toward the vacuum instead of into your rooms. Every register is removed, washed and re-seated, and we finish with a before/after camera inspection so you can see exactly what came out.",
			"wind", "residential", 299, true},
		{"dryer-vent-cleaning", "Dryer Vent Cleaning",
			"Clear lint buildup from the full vent run to cut fire risk and get your dryer drying in one cycle again.",
			"Clogged dryer vents are one of the leading causes of house fires. We snake the entire vent line from the dryer connection to the exterior hood, remove compacted lint and nesting material, verify airflow with an anemometer and confirm the exterior damper closes properly.",
			"flame", "residential", 129, true},
		{"chimney-sweep", "Chimney Sweep & Fireplace Cleaning",
			"Creosote removal, flue inspection and cap check so your fireplace burns clean and safe all winter.",
			"We brush the full flue, remove creosote and soot from the smoke shelf and firebox, inspect the damper and liner with a camera and check the cap and crown for damage. You get a written report with photos.",
			"home", "residential", 189, true},
		{"uv-light-installation", "UV Light & Air Purification",
			"In-duct UV-C and purification systems that neutralize mold, bacteria and odors at the source.",
			"A UV-C germicidal light mounted at the evaporator coil keeps the coil free of biological growth and treats every cubic foot of air that passes through the system. We size the unit to your air handler and wire it directly to the blower circuit.",
			"sun", "residential", 449, true},
		{"duct-sanitizing", "Duct Sanitizing & Odor Removal",
			"EPA-registered fogging treatment applied after cleaning to eliminate mold spores, bacteria and stubborn smells.",
			"After a full cleaning we fog an EPA-registered, hospital-grade antimicrobial through the supply side of the system. It is safe for people and pets, leaves no residue and removes odors from smoke, pets and moisture.",
			"sparkles", "residential", 99, false},
		{"duct-repair-sealing", "Duct Repair & Sealing",
			"Fix disconnected, crushed or leaking ducts so conditioned air actually reaches your rooms.",
			"Typical homes lose 20–30% of heated or cooled air through leaks. We locate leaks with a pressure test, seal joints with mastic, replace damaged flex runs and rehang sagging sections.",
			"wrench", "residential", 0, false},
		{"hvac-inspection", "HVAC & Air Duct Inspection",
			"Camera inspection and airflow diagnostics that tell you whether you need a cleaning at all.",
			"Not sure if your ducts need cleaning? We run a camera through the system, check static pressure and filter condition, and give you an honest recommendation with photos — even if the answer is \"not yet\".",
			"search", "residential", 79, false},
		{"commercial-air-duct-cleaning", "Commercial Air Duct Cleaning",
			"NADCA-standard cleaning for offices, clinics, restaurants and multi-unit buildings, scheduled around your hours.",
			"We service rooftop units, long trunk lines and VAV boxes with commercial-grade equipment, work nights and weekends to avoid disrupting your business and provide documentation for compliance and insurance.",
			"building", "commercial", 0, false},
		{"commercial-dryer-vent-cleaning", "Commercial Dryer Vent Cleaning",
			"Laundromats, hotels and multi-family buildings — keep long shared vent runs clear and code-compliant.",
			"Shared and extended vent runs accumulate lint fast. We clean stacked and manifold systems, verify airflow at each unit and provide a service log for fire-code documentation.",
			"flame", "commercial", 0, false},
	}
	for i, s := range services {
		var price sql.NullInt64
		if s.price > 0 {
			price = sql.NullInt64{Int64: int64(s.price), Valid: true}
		}
		if _, err := tx.Exec(`INSERT INTO services (slug,name,short_desc,long_desc,icon,category,starting_at,featured,sort_order)
			VALUES (?,?,?,?,?,?,?,?,?)`, s.slug, s.name, s.short, s.long, s.icon, s.cat, price, boolInt(s.featured), i); err != nil {
			return err
		}
	}

	// ---- Service areas --------------------------------------------------
	areas := []struct {
		city, zips string
		featured   bool
	}{
		{"Chicago", "60601-60661", true}, {"Evanston", "60201, 60202", true}, {"Skokie", "60076, 60077", true},
		{"Glenview", "60025, 60026", true}, {"Northbrook", "60062", true}, {"Schaumburg", "60173, 60193", true},
		{"Naperville", "60540, 60563", true}, {"Oak Park", "60301-60304", true}, {"Arlington Heights", "60004-60006", false},
		{"Des Plaines", "60016, 60018", false}, {"Park Ridge", "60068", false}, {"Wilmette", "60091", false},
		{"Palatine", "60067, 60074", false}, {"Elgin", "60120-60124", false}, {"Aurora", "60502-60507", false},
		{"Wheaton", "60187, 60189", false}, {"Downers Grove", "60515, 60516", false}, {"Oak Lawn", "60453", false},
		{"Buffalo Grove", "60089", false}, {"Mount Prospect", "60056", false}, {"Elmhurst", "60126", false},
		{"Lombard", "60148", false}, {"Highland Park", "60035", false}, {"Niles", "60714", false},
	}
	for _, a := range areas {
		slug := strings.ToLower(strings.ReplaceAll(a.city, " ", "-"))
		blurb := "Trusted air duct, dryer vent and chimney cleaning in " + a.city + ", IL. Same-week appointments, upfront pricing and a 100% satisfaction guarantee."
		if _, err := tx.Exec(`INSERT INTO service_areas (slug,city,state,zip_codes,blurb,featured) VALUES (?,?,?,?,?,?)`,
			slug, a.city, "IL", a.zips, blurb, boolInt(a.featured)); err != nil {
			return err
		}
	}

	// ---- Testimonials ---------------------------------------------------
	testimonials := []struct {
		author, loc, quote, service, date string
		rating                            int
	}{
		{"Maria G.", "Evanston, IL", "Marcus and Dev were on time, explained everything and showed me the camera footage before and after. I could not believe what came out of our vents. The whole house smells cleaner.", "Air Duct Cleaning", "2026-08-21", 5},
		{"Tom R.", "Naperville, IL", "Our dryer went from two cycles to one. They pulled out a bird's nest from the exterior vent and fixed the flap. Fair price, no upsell.", "Dryer Vent Cleaning", "2026-08-02", 5},
		{"Priya S.", "Schaumburg, IL", "Booked online on Tuesday, cleaned Thursday. They wore shoe covers, protected the floors and left every register spotless. Allergies noticeably better within a week.", "Air Duct Cleaning", "2026-07-14", 5},
		{"James K.", "Oak Park, IL", "Honest company. They inspected first and told me one system did not actually need cleaning yet. Only charged for the one that did.", "HVAC Inspection", "2026-06-30", 5},
		{"Linda W.", "Glenview, IL", "Had the UV light installed with the cleaning. Musty smell from the basement is completely gone. Would recommend to anyone with an older home.", "UV Light Installation", "2026-06-11", 5},
		{"Ahmed H.", "Chicago, IL", "Our restaurant's rooftop unit had not been cleaned in years. They came after close, finished by 3am and provided the documentation our insurer wanted.", "Commercial Air Duct Cleaning", "2026-05-27", 5},
		{"Sarah M.", "Northbrook, IL", "Second time using them. Same great crew, same result. The before/after photos are worth it alone.", "Air Duct Cleaning", "2026-05-09", 5},
		{"Derek P.", "Skokie, IL", "Chimney had a serious creosote buildup. Thorough job, clean workspace, and a clear written report I could give to my insurance.", "Chimney Sweep", "2026-04-18", 4},
	}
	for _, t := range testimonials {
		if _, err := tx.Exec(`INSERT INTO testimonials (author,location,rating,quote,service,source,reviewed_at) VALUES (?,?,?,?,?,?,?)`,
			t.author, t.loc, t.rating, t.quote, t.service, "Google", t.date); err != nil {
			return err
		}
	}

	// ---- FAQs -----------------------------------------------------------
	faqs := [][2]string{
		{"How much does air duct cleaning cost?", "A standard single-furnace home starts at $299 and includes every supply and return, the main trunk lines, register cleaning and a camera inspection. Larger homes, multiple systems and add-ons like sanitizing or dryer vents are quoted upfront before we start — never after."},
		{"How often should ducts be cleaned?", "Most homes benefit from a cleaning every 3–5 years. Sooner if you have just renovated, moved into a new home, have pets that shed, notice visible dust around registers or have family members with allergies or asthma."},
		{"How long does the service take?", "A typical single-system home takes 2–4 hours. We tell you the expected time when we book and call ahead if anything changes."},
		{"Is it safe for kids and pets?", "Yes. The cleaning is entirely mechanical — vacuum and brushes. Our optional sanitizer is EPA-registered and hospital-grade; we recommend keeping pets in another room for about an hour while it dries."},
		{"Will it make a mess in my house?", "No. The system is under negative pressure the entire time, so debris travels to the vacuum, not into your rooms. Our crew uses drop cloths, shoe covers and corner guards."},
		{"How do I know it was actually done?", "You watch it. We show you camera footage of the trunk line before we start and again when we finish, and you get the photos in your emailed report."},
		{"Do you clean the furnace and coil too?", "The blower compartment and accessible coil surface are included in every duct cleaning. Deep coil cleaning is available as an add-on if the inspection shows heavy buildup."},
		{"Can dirty ducts really affect energy bills?", "Yes. Restricted airflow makes the blower work harder and run longer. The EPA and Department of Energy estimate a clean system can reduce HVAC energy use by up to 20%."},
		{"Are you licensed and insured?", "Fully licensed, bonded and insured. Our technicians are NADCA-trained and background-checked, and every job carries a 100% satisfaction guarantee."},
		{"What areas do you serve?", "Chicago and the surrounding suburbs across Cook, Lake, DuPage and Kane counties. See the Service Areas page for the full list — if you do not see your town, call us; we probably still come to you."},
	}
	for i, f := range faqs {
		if _, err := tx.Exec(`INSERT INTO faqs (question,answer,sort_order) VALUES (?,?,?)`, f[0], f[1], i); err != nil {
			return err
		}
	}

	// ---- Promotions -----------------------------------------------------
	promos := []struct{ title, desc, badge, code, expires string }{
		{"Fall Whole-Home Special", "Full air duct cleaning for a single-furnace home, including camera inspection and register cleaning.", "$100 OFF", "FALL100", "2026-11-30"},
		{"Duct + Dryer Vent Bundle", "Add a dryer vent cleaning to any air duct cleaning and save.", "SAVE $60", "BUNDLE60", "2026-12-31"},
		{"Free Sanitizing Treatment", "Book a cleaning for two or more systems and get the EPA-registered sanitizing treatment free.", "FREE ADD-ON", "CLEAN2", ""},
	}
	for _, p := range promos {
		var exp sql.NullString
		if p.expires != "" {
			exp = sql.NullString{String: p.expires, Valid: true}
		}
		if _, err := tx.Exec(`INSERT INTO promotions (title,description,badge,code,expires_at,active) VALUES (?,?,?,?,?,1)`,
			p.title, p.desc, p.badge, p.code, exp); err != nil {
			return err
		}
	}

	// ---- Blog posts -----------------------------------------------------
	posts := []struct{ slug, title, excerpt, body, cat, date string }{
		{"signs-your-air-ducts-need-cleaning", "7 Signs Your Air Ducts Need Cleaning",
			"Dust that comes back a day after you wipe it, musty smells when the furnace kicks on, and five other tell-tale signs.",
			"## 1. Dust returns within a day\n\nIf you wipe a shelf and it is dusty again tomorrow, the dust is coming from somewhere — usually your supply registers.\n\n## 2. A musty smell when the system starts\n\nThat first-blast odor when the furnace or AC kicks on is often mold or bacteria on the coil and in the ducts.\n\n## 3. Visible debris at the registers\n\nPull a register cover off. If you see clumps, pet hair or drywall dust, the rest of the run looks the same.\n\n## 4. You just renovated\n\nDrywall and sawdust are fine enough to travel the entire system.\n\n## 5. Allergies are worse indoors\n\nIf symptoms improve when you leave the house, your indoor air is the problem.\n\n## 6. Uneven airflow between rooms\n\nA restricted duct starves the room at the end of the run.\n\n## 7. It has been more than five years\n\nOr you simply do not know. An inspection is inexpensive and tells you for sure.",
			"Tips", "2026-09-02"},
		{"dryer-vent-fire-safety", "Why Dryer Vent Cleaning Is a Fire Safety Issue, Not a Chore",
			"Thousands of home fires each year start in the dryer. Here is what actually causes them and how to spot the warning signs.",
			"Lint is extremely flammable, and a dryer vent is a long, warm tube that collects it. Over time the lint compacts, airflow drops and the dryer's heating element runs hotter and longer to compensate.\n\n## Warning signs\n\n- Clothes take more than one cycle to dry\n- The top of the dryer is hot to the touch\n- A burning smell during a cycle\n- The exterior flap does not open when the dryer runs\n\n## How often\n\nOnce a year for most homes; twice a year for large families or long vent runs.",
			"Safety", "2026-08-19"},
		{"what-to-expect-during-duct-cleaning", "What to Expect During a Professional Duct Cleaning",
			"From the first camera pass to the final walkthrough — the step-by-step process so there are no surprises on the day.",
			"## Before we arrive\n\nClear a path to the furnace and each register. Pets are welcome, but a closed room keeps them calm.\n\n## Step 1: Inspection\n\nWe run a camera through the trunk line and show you what we see.\n\n## Step 2: Negative pressure\n\nThe HEPA vacuum is connected to the trunk line and the whole system is sealed.\n\n## Step 3: Agitation\n\nEach run is brushed and air-whipped toward the vacuum.\n\n## Step 4: Registers and blower\n\nEvery cover is washed; the blower compartment is cleaned.\n\n## Step 5: Walkthrough\n\nA second camera pass, photos for your report and a review of anything we noticed.",
			"Process", "2026-07-28"},
	}
	for _, p := range posts {
		if _, err := tx.Exec(`INSERT INTO posts (slug,title,excerpt,body,category,read_minutes,published_at) VALUES (?,?,?,?,?,?,?)`,
			p.slug, p.title, p.excerpt, p.body, p.cat, 4, p.date); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
