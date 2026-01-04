import { Pool } from "pg";

const connectionString = process.env.MODULE_DB_URL;
const schema = process.env.MODULE_DB_SCHEMA ?? "basic_tribe_ui";

if (!connectionString) {
	console.error("MODULE_DB_URL is required (see .env.example).");
	process.exit(1);
}

const pool = new Pool({ connectionString });

const roles = [
	{ name: "Chief", sort: 1 },
	{ name: "Elder", sort: 2 },
	{ name: "Warrior", sort: 3 },
	{ name: "Builder", sort: 4 },
	{ name: "Gatherer", sort: 5 },
	{ name: "Crafter", sort: 6 },
	{ name: "Explorer", sort: 7 },
	{ name: "Logistician", sort: 8 },
	{ name: "Healer", sort: 9 },
	{ name: "Neophyte", sort: 10 }
];

const ranks = [
	{ name: "Novice", sort: 1 },
	{ name: "Journeyman", sort: 2 },
	{ name: "Veteran", sort: 3 },
	{ name: "Expert", sort: 4 },
	{ name: "Master", sort: 5 },
	{ name: "Legionnaire", sort: 6 },
	{ name: "Centurion", sort: 7 },
	{ name: "Praetor", sort: 8 },
	{ name: "Legate", sort: 9 }
];

const accessLists = [
	"manage_members",
	"manage_roles",
	"manage_access_lists",
	"view_audit_log",
	"manage_billing"
];

const members = [
	{ display_name: "Aria Voss", status: "active", wallet_address: "0x8f3c...91b2", roles: ["Chief"] },
	{ display_name: "Kellan Rye", status: "active", wallet_address: "0x51a2...0fdc", roles: ["Elder"] },
	{ display_name: "Mira Sol", status: "active", wallet_address: "0x7d10...fe0a", roles: ["Builder"] },
	{ display_name: "Tomas Vale", status: "pending", wallet_address: null, roles: ["Gatherer"] },
	{ display_name: "Nia Quell", status: "active", wallet_address: "0x0a8b...44be", roles: ["Explorer"] }
];

async function seed() {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		for (const role of roles) {
			await client.query(
				`INSERT INTO ${schema}.roles (name, sort_order, created_at, updated_at)
				 VALUES ($1, $2, now(), now())
				 ON CONFLICT (name) DO UPDATE SET
				   sort_order = EXCLUDED.sort_order,
				   updated_at = now()`,
				[role.name, role.sort]
			);
		}

		for (const rank of ranks) {
			await client.query(
				`INSERT INTO ${schema}.ranks (name, sort_order, role_id, created_at, updated_at)
				 VALUES ($1, $2, NULL, now(), now())
				 ON CONFLICT (name) WHERE role_id IS NULL DO UPDATE SET
				   sort_order = EXCLUDED.sort_order,
				   updated_at = now()`,
				[rank.name, rank.sort]
			);
		}

		const roleRankMap = new Map([
			["Builder", ["Novice", "Journeyman", "Veteran", "Expert"]],
			["Gatherer", ["Novice", "Journeyman", "Veteran", "Expert"]],
			["Crafter", ["Novice", "Journeyman", "Veteran", "Expert"]],
			["Warrior", ["Legionnaire", "Centurion", "Praetor", "Legate"]],
			["Elder", ["Veteran", "Expert", "Master"]]
		]);

		for (const [roleName, rankNames] of roleRankMap.entries()) {
			const roleResult = await client.query(
				`SELECT id FROM ${schema}.roles WHERE name = $1`,
				[roleName]
			);
			const roleId = roleResult.rows[0]?.id;
			if (!roleId) continue;

			const rankResult = await client.query(
				`SELECT id, name FROM ${schema}.ranks
				 WHERE role_id IS NULL AND name = ANY($1::text[])`,
				[rankNames]
			);

			let order = 1;
			for (const rank of rankResult.rows) {
				await client.query(
					`INSERT INTO ${schema}.role_ranks (role_id, rank_id, sort_order, created_at)
					 VALUES ($1, $2, $3, now())
					 ON CONFLICT DO NOTHING`,
					[roleId, rank.id, order]
				);
				order += 1;
			}
		}

		for (const name of accessLists) {
			await client.query(
				`INSERT INTO ${schema}.access_lists (name, created_at, updated_at)
				 VALUES ($1, now(), now())
				 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name`,
				[name]
			);
		}

		await client.query(
			`INSERT INTO ${schema}.visibility_settings (area, is_public, created_at, updated_at)
			 VALUES ($1, $2, now(), now())
			 ON CONFLICT (area) DO UPDATE SET
			   is_public = EXCLUDED.is_public,
			   updated_at = now()`,
			["members", true]
		);

		await client.query(
			`INSERT INTO ${schema}.visibility_settings (area, is_public, created_at, updated_at)
			 VALUES ($1, $2, now(), now())
			 ON CONFLICT (area) DO UPDATE SET
			   is_public = EXCLUDED.is_public,
			   updated_at = now()`,
			["roles", false]
		);

		for (const member of members) {
			let memberId;
			if (member.wallet_address) {
				const existing = await client.query(
					`SELECT id FROM ${schema}.members WHERE wallet_address = $1`,
					[member.wallet_address]
				);
				if (existing.rowCount > 0) {
					memberId = existing.rows[0].id;
					await client.query(
						`UPDATE ${schema}.members
						 SET display_name = $1,
						     status = $2,
						     updated_at = now()
						 WHERE id = $3`,
						[member.display_name, member.status, memberId]
					);
				}
			}

			if (!memberId) {
				const insertResult = await client.query(
					`INSERT INTO ${schema}.members
					 (display_name, status, wallet_address, created_at, updated_at)
					 VALUES ($1, $2, $3, now(), now())
					 RETURNING id`,
					[member.display_name, member.status, member.wallet_address]
				);
				memberId = insertResult.rows[0]?.id;
			}

			if (!memberId) continue;

			for (const roleName of member.roles) {
				const roleResult = await client.query(
					`SELECT id FROM ${schema}.roles WHERE name = $1`,
					[roleName]
				);
				const roleId = roleResult.rows[0]?.id;
				if (!roleId) continue;

				await client.query(
					`INSERT INTO ${schema}.member_roles (member_id, role_id, created_at)
					 VALUES ($1, $2, now())
					 ON CONFLICT DO NOTHING`,
					[memberId, roleId]
				);
			}
		}

		const accessRoleMap = new Map([
			["manage_members", ["Chief", "Elder"]],
			["manage_roles", ["Chief"]],
			["manage_access_lists", ["Chief"]],
			["view_audit_log", ["Chief", "Elder"]],
			["manage_billing", ["Chief"]]
		]);

		for (const [accessName, roleNames] of accessRoleMap.entries()) {
			const accessResult = await client.query(
				`SELECT id FROM ${schema}.access_lists WHERE name = $1`,
				[accessName]
			);
			const accessId = accessResult.rows[0]?.id;
			if (!accessId) continue;

			const roleResult = await client.query(
				`SELECT id, name FROM ${schema}.roles WHERE name = ANY($1::text[])`,
				[roleNames]
			);

			for (const role of roleResult.rows) {
				await client.query(
					`INSERT INTO ${schema}.role_access (role_id, access_list_id, created_at)
					 VALUES ($1, $2, now())
					 ON CONFLICT DO NOTHING`,
					[role.id, accessId]
				);
			}
		}

		const globalRankResult = await client.query(
			`SELECT id FROM ${schema}.ranks WHERE role_id IS NULL AND name = $1`,
			["Veteran"]
		);
		const globalRankId = globalRankResult.rows[0]?.id;

		const memberResult = await client.query(
			`SELECT id, display_name FROM ${schema}.members WHERE display_name = ANY($1::text[])`,
			[["Aria Voss", "Mira Sol", "Kellan Rye"]]
		);

		const memberMap = new Map(memberResult.rows.map((row) => [row.display_name, row.id]));

		if (memberMap.get("Aria Voss") && globalRankId) {
			await client.query(
				`INSERT INTO ${schema}.member_ranks (member_id, rank_id, role_id, created_at)
				 VALUES ($1, $2, NULL, now())
				 ON CONFLICT DO NOTHING`,
				[memberMap.get("Aria Voss"), globalRankId]
			);
		}

		const roleRankAssignments = [
			{ member: "Mira Sol", role: "Builder", rank: "Journeyman" },
			{ member: "Kellan Rye", role: "Elder", rank: "Expert" }
		];

		for (const assignment of roleRankAssignments) {
			const memberId = memberMap.get(assignment.member);
			if (!memberId) continue;
			const roleResult = await client.query(
				`SELECT id FROM ${schema}.roles WHERE name = $1`,
				[assignment.role]
			);
			const rankResult = await client.query(
				`SELECT id FROM ${schema}.ranks WHERE role_id IS NULL AND name = $1`,
				[assignment.rank]
			);
			const roleId = roleResult.rows[0]?.id;
			const rankId = rankResult.rows[0]?.id;
			if (!roleId || !rankId) continue;

			await client.query(
				`INSERT INTO ${schema}.member_ranks (member_id, rank_id, role_id, created_at)
				 VALUES ($1, $2, $3, now())
				 ON CONFLICT DO NOTHING`,
				[memberId, rankId, roleId]
			);
		}

		await client.query("COMMIT");
		console.log("Seeded module data.");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

seed()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await pool.end();
	});
