import http from "node:http";
import { Pool } from "pg";

try {
	const dotenv = await import("dotenv");
	dotenv.config();
} catch {
	// Optional dependency; env vars may be provided by the shell.
}

const port = Number(process.env.MODULE_API_PORT ?? 8787);
const schema = process.env.MODULE_DB_SCHEMA ?? "basic_tribe_ui";
const connectionString = process.env.MODULE_DB_URL;

if (!connectionString) {
	console.error("MODULE_DB_URL is required (see .env.example).");
	process.exit(1);
}

const pool = new Pool({ connectionString });

function sendJson(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		"Content-Type": "application/json",
		"Content-Length": Buffer.byteLength(body),
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type, X-Module-Auth",
		"Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
	});
	res.end(body);
}

async function readJson(req) {
	const chunks = [];
	for await (const chunk of req) {
		chunks.push(chunk);
	}
	const raw = Buffer.concat(chunks).toString("utf-8");
	if (!raw) return null;
	return JSON.parse(raw);
}

function notFound(res) {
	sendJson(res, 404, { message: "Not found" });
}

function methodNotAllowed(res) {
	sendJson(res, 405, { message: "Method not allowed" });
}

function sanitizeRoles(input) {
	if (!Array.isArray(input)) return [];
	return input
		.map((item) => (typeof item === "string" ? item.trim() : ""))
		.filter((item) => item.length > 0);
}

async function resolveRoleIds(client, roleNames) {
	if (!roleNames.length) return [];
	const result = await client.query(
		`SELECT id, name FROM ${schema}.roles WHERE name = ANY($1::text[])`,
		[roleNames]
	);
	return result.rows;
}

function isAuthed(req) {
	return String(req.headers["x-module-auth"]).toLowerCase() === "true";
}

function getRoleName(req) {
	const raw = req.headers["x-module-role"];
	if (typeof raw !== "string") return "";
	return raw.trim();
}

async function hasAccess(client, roleName, accessName) {
	if (!roleName) return false;
	const result = await client.query(
		`SELECT 1
		 FROM ${schema}.role_access ra
		 JOIN ${schema}.access_lists al ON al.id = ra.access_list_id
		 JOIN ${schema}.roles r ON r.id = ra.role_id
		 WHERE r.name = $1 AND al.name = $2
		 LIMIT 1`,
		[roleName, accessName]
	);
	return result.rowCount > 0;
}

async function requireAccess(req, res, accessName) {
	if (!isAuthed(req)) {
		sendJson(res, 401, { message: "Authentication required." });
		return false;
	}
	const roleName = getRoleName(req);
	const ok = await hasAccess(pool, roleName, accessName);
	if (!ok) {
		sendJson(res, 403, { message: "Insufficient access." });
	}
	return ok;
}
async function getVisibilityMap(client) {
	const result = await client.query(
		`SELECT area, is_public
		 FROM ${schema}.visibility_settings`
	);
	const map = new Map();
	for (const row of result.rows) {
		map.set(row.area, row.is_public);
	}
	return map;
}

const server = http.createServer(async (req, res) => {
	try {
		if (!req.url) return notFound(res);
		if (req.method === "OPTIONS") {
			res.writeHead(204, {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Content-Type, X-Module-Auth",
				"Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
			});
			res.end();
			return;
		}
		const url = new URL(req.url, `http://${req.headers.host}`);

		if (url.pathname === "/visibility") {
			if (req.method === "GET") {
				const result = await pool.query(
					`SELECT area, is_public
					 FROM ${schema}.visibility_settings
					 ORDER BY area`
				);

				return sendJson(
					res,
					200,
					result.rows.map((row) => ({
						area: row.area,
						isPublic: row.is_public
					}))
				);
			}

			return methodNotAllowed(res);
		}

		if (url.pathname.startsWith("/visibility/")) {
			const area = url.pathname.split("/")[2];
			if (req.method !== "PATCH") return methodNotAllowed(res);
			if (area !== "members" && area !== "roles") return notFound(res);
			if (!(await requireAccess(req, res, "manage_roles"))) return;

			const payload = await readJson(req);
			const isPublic = Boolean(payload?.isPublic);
			await pool.query(
				`INSERT INTO ${schema}.visibility_settings (area, is_public, created_at, updated_at)
				 VALUES ($1, $2, now(), now())
				 ON CONFLICT (area) DO UPDATE SET
				   is_public = EXCLUDED.is_public,
				   updated_at = now()`,
				[area, isPublic]
			);
			return sendJson(res, 200, { ok: true });
		}

		if (url.pathname === "/roles") {
			if (req.method === "GET") {
				const visibility = await getVisibilityMap(pool);
				const isPublic = visibility.get("roles") ?? false;
				if (!isPublic && !isAuthed(req)) {
					return sendJson(res, 401, { message: "Authentication required." });
				}

				const result = await pool.query(
					`SELECT id, name, description, sort_order AS "sortOrder"
					 FROM ${schema}.roles
					 ORDER BY sort_order, name`
				);

				return sendJson(res, 200, result.rows);
			}

			if (req.method === "POST") {
				if (!(await requireAccess(req, res, "manage_roles"))) return;
				const payload = await readJson(req);
				const name = payload?.name;
				const description = payload?.description ?? null;

				if (!name || typeof name !== "string") {
					return sendJson(res, 400, { message: "name is required." });
				}

				const sortOrder = Number.isFinite(payload?.sortOrder) ? Number(payload.sortOrder) : null;
				const result = await pool.query(
					`INSERT INTO ${schema}.roles (name, description, sort_order, created_at, updated_at)
					 VALUES (
					 	$1,
					 	$2,
					 	COALESCE($3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM ${schema}.roles)),
					 	now(),
					 	now()
					 )
					 RETURNING id, name, description, sort_order AS "sortOrder"`,
					[name.trim(), description, sortOrder]
				);

				return sendJson(res, 201, result.rows[0]);
			}

			return methodNotAllowed(res);
		}

		if (url.pathname === "/roles/order") {
			if (req.method !== "PATCH") return methodNotAllowed(res);
			if (!(await requireAccess(req, res, "manage_roles"))) return;
			const payload = await readJson(req);
			const roleIds = Array.isArray(payload?.roleIds) ? payload.roleIds : [];
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				for (let i = 0; i < roleIds.length; i += 1) {
					await client.query(
						`UPDATE ${schema}.roles SET sort_order = $1, updated_at = now() WHERE id = $2`,
						[i + 1, roleIds[i]]
					);
				}
				await client.query("COMMIT");
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
			return sendJson(res, 200, { ok: true });
		}

		if (url.pathname === "/ranks") {
			if (req.method === "GET") {
				const visibility = await getVisibilityMap(pool);
				const isPublic = visibility.get("roles") ?? false;
				if (!isPublic && !isAuthed(req)) {
					return sendJson(res, 401, { message: "Authentication required." });
				}
				const result = await pool.query(
					`SELECT id, name, description, sort_order AS "sortOrder"
					 FROM ${schema}.ranks
					 ORDER BY sort_order, name`
				);
				return sendJson(res, 200, result.rows);
			}

			if (req.method === "POST") {
				if (!(await requireAccess(req, res, "manage_roles"))) return;
				const payload = await readJson(req);
				const name = payload?.name;
				const description = payload?.description ?? null;

				if (!name || typeof name !== "string") {
					return sendJson(res, 400, { message: "name is required." });
				}

				const sortOrder = Number.isFinite(payload?.sortOrder) ? Number(payload.sortOrder) : null;
				const result = await pool.query(
					`INSERT INTO ${schema}.ranks (name, description, sort_order, created_at, updated_at)
					 VALUES (
					 	$1,
					 	$2,
					 	COALESCE($3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM ${schema}.ranks)),
					 	now(),
					 	now()
					 )
					 RETURNING id, name, description, sort_order AS "sortOrder"`,
					[name.trim(), description, sortOrder]
				);

				return sendJson(res, 201, result.rows[0]);
			}

			return methodNotAllowed(res);
		}

		if (url.pathname === "/ranks/order") {
			if (req.method !== "PATCH") return methodNotAllowed(res);
			if (!(await requireAccess(req, res, "manage_roles"))) return;
			const payload = await readJson(req);
			const rankIds = Array.isArray(payload?.rankIds) ? payload.rankIds : [];
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				for (let i = 0; i < rankIds.length; i += 1) {
					await client.query(
						`UPDATE ${schema}.ranks SET sort_order = $1, updated_at = now() WHERE id = $2`,
						[i + 1, rankIds[i]]
					);
				}
				await client.query("COMMIT");
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
			return sendJson(res, 200, { ok: true });
		}

		if (url.pathname.startsWith("/ranks/")) {
			const rankId = url.pathname.split("/")[2];
			if (!rankId) return notFound(res);

			if (req.method === "PATCH") {
				if (!(await requireAccess(req, res, "manage_roles"))) return;
				const payload = await readJson(req);
				const name = payload?.name;
				const description = payload?.description ?? null;

				if (!name || typeof name !== "string") {
					return sendJson(res, 400, { message: "name is required." });
				}

				const sortOrder = Number.isFinite(payload?.sortOrder) ? Number(payload.sortOrder) : null;
				const result = await pool.query(
					`UPDATE ${schema}.ranks
					 SET name = $1,
					     description = $2,
					     sort_order = COALESCE($3, sort_order),
					     updated_at = now()
					 WHERE id = $4
					 RETURNING id, name, description, sort_order AS "sortOrder"`,
					[name.trim(), description, sortOrder, rankId]
				);

				if (result.rowCount === 0) return notFound(res);
				return sendJson(res, 200, result.rows[0]);
			}

			if (req.method === "DELETE") {
				if (!(await requireAccess(req, res, "manage_roles"))) return;
				await pool.query(`DELETE FROM ${schema}.ranks WHERE id = $1`, [rankId]);
				return sendJson(res, 200, { ok: true });
			}

			return methodNotAllowed(res);
		}

		if (url.pathname === "/role-ranks") {
			if (req.method === "GET") {
				const result = await pool.query(
					`SELECT rr.role_id AS "roleId",
					        rr.rank_id AS "rankId",
					        rr.sort_order AS "sortOrder"
					 FROM ${schema}.role_ranks rr
					 ORDER BY rr.sort_order, rr.rank_id`
				);
				return sendJson(res, 200, result.rows);
			}

			return methodNotAllowed(res);
		}

		if (url.pathname.startsWith("/role-ranks/order/")) {
			const roleId = url.pathname.split("/")[3];
			if (!roleId) return notFound(res);
			if (req.method !== "PATCH") return methodNotAllowed(res);
			if (!(await requireAccess(req, res, "manage_roles"))) return;
			const payload = await readJson(req);
			const rankIds = Array.isArray(payload?.rankIds) ? payload.rankIds : [];
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				for (let i = 0; i < rankIds.length; i += 1) {
					await client.query(
						`UPDATE ${schema}.role_ranks SET sort_order = $1 WHERE role_id = $2 AND rank_id = $3`,
						[i + 1, roleId, rankIds[i]]
					);
				}
				await client.query("COMMIT");
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
			return sendJson(res, 200, { ok: true });
		}

		if (url.pathname === "/role-rank-overrides") {
			if (req.method === "GET") {
				const result = await pool.query(
					`SELECT role_id AS "roleId",
					        rank_id AS "rankId",
					        name
					 FROM ${schema}.role_rank_overrides`
				);
				return sendJson(res, 200, result.rows);
			}

			return methodNotAllowed(res);
		}

		if (url.pathname.startsWith("/role-rank-overrides/")) {
			const roleId = url.pathname.split("/")[2];
			if (!roleId) return notFound(res);

			if (req.method === "PATCH") {
				if (!(await requireAccess(req, res, "manage_roles"))) return;
				const payload = await readJson(req);
				const overrides = Array.isArray(payload?.overrides) ? payload.overrides : [];

				const client = await pool.connect();
				try {
					await client.query("BEGIN");
					await client.query(`DELETE FROM ${schema}.role_rank_overrides WHERE role_id = $1`, [
						roleId
					]);

					for (const override of overrides) {
						if (!override?.rankId || !override?.name) continue;
						await client.query(
							`INSERT INTO ${schema}.role_rank_overrides
							 (role_id, rank_id, name, created_at, updated_at)
							 VALUES ($1, $2, $3, now(), now())
							 ON CONFLICT DO NOTHING`,
							[roleId, override.rankId, String(override.name).trim()]
						);
					}

					await client.query("COMMIT");
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}

				return sendJson(res, 200, { ok: true });
			}

			return methodNotAllowed(res);
		}

		if (url.pathname.startsWith("/role-ranks/")) {
			const roleId = url.pathname.split("/")[2];
			if (!roleId) return notFound(res);

			if (req.method === "PATCH") {
				if (!(await requireAccess(req, res, "manage_roles"))) return;
				const payload = await readJson(req);
				const rankIds = Array.isArray(payload?.rankIds) ? payload.rankIds : [];

				const client = await pool.connect();
				try {
					await client.query("BEGIN");
					await client.query(`DELETE FROM ${schema}.role_ranks WHERE role_id = $1`, [roleId]);
					for (let i = 0; i < rankIds.length; i += 1) {
						const rankId = rankIds[i];
						await client.query(
							`INSERT INTO ${schema}.role_ranks (role_id, rank_id, sort_order, created_at)
							 VALUES ($1, $2, $3, now())
							 ON CONFLICT DO NOTHING`,
							[roleId, rankId, i + 1]
						);
					}
					await client.query("COMMIT");
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}

				return sendJson(res, 200, { ok: true });
			}

			return methodNotAllowed(res);
		}

		if (url.pathname.startsWith("/roles/")) {
			const roleId = url.pathname.split("/")[2];
			if (!roleId) return notFound(res);

			if (req.method === "PATCH") {
				if (!(await requireAccess(req, res, "manage_roles"))) return;
				const payload = await readJson(req);
				const name = payload?.name;
				const description = payload?.description ?? null;

				if (!name || typeof name !== "string") {
					return sendJson(res, 400, { message: "name is required." });
				}

				const sortOrder = Number.isFinite(payload?.sortOrder) ? Number(payload.sortOrder) : null;
				const result = await pool.query(
					`UPDATE ${schema}.roles
					 SET name = $1,
					     description = $2,
					     sort_order = COALESCE($3, sort_order),
					     updated_at = now()
					 WHERE id = $4
					 RETURNING id, name, description, sort_order AS "sortOrder"`,
					[name.trim(), description, sortOrder, roleId]
				);

				if (result.rowCount === 0) return notFound(res);
				return sendJson(res, 200, result.rows[0]);
			}

			if (req.method === "DELETE") {
				if (!(await requireAccess(req, res, "manage_roles"))) return;
				await pool.query(`DELETE FROM ${schema}.roles WHERE id = $1`, [roleId]);
				return sendJson(res, 200, { ok: true });
			}

			return methodNotAllowed(res);
		}

		if (url.pathname === "/access-lists") {
			if (req.method === "GET") {
				if (!isAuthed(req)) {
					return sendJson(res, 401, { message: "Authentication required." });
				}
				const result = await pool.query(
					`SELECT a.id,
					        a.name,
					        a.description,
					        COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
					 FROM ${schema}.access_lists a
					 LEFT JOIN ${schema}.role_access ra ON ra.access_list_id = a.id
					 LEFT JOIN ${schema}.roles r ON r.id = ra.role_id
					 GROUP BY a.id
					 ORDER BY a.name`
				);

				return sendJson(res, 200, result.rows);
			}

			if (req.method === "POST") {
				if (!(await requireAccess(req, res, "manage_access_lists"))) return;
				const payload = await readJson(req);
				const name = payload?.name;
				const description = payload?.description ?? null;
				const roles = sanitizeRoles(payload?.roles);

				if (!name || typeof name !== "string") {
					return sendJson(res, 400, { message: "name is required." });
				}

				const client = await pool.connect();
				try {
					await client.query("BEGIN");
					const accessResult = await client.query(
						`INSERT INTO ${schema}.access_lists (name, description, created_at, updated_at)
						 VALUES ($1, $2, now(), now())
						 RETURNING id, name, description`,
						[name.trim(), description]
					);

					const accessList = accessResult.rows[0];
					const roleRows = await resolveRoleIds(client, roles);
					for (const role of roleRows) {
						await client.query(
							`INSERT INTO ${schema}.role_access (role_id, access_list_id, created_at)
							 VALUES ($1, $2, now())
							 ON CONFLICT DO NOTHING`,
							[role.id, accessList.id]
						);
					}

					await client.query("COMMIT");
					return sendJson(res, 201, {
						id: accessList.id,
						name: accessList.name,
						description: accessList.description,
						roles: roleRows.map((row) => row.name)
					});
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			}

			return methodNotAllowed(res);
		}

		if (url.pathname.startsWith("/access-lists/")) {
			const accessListId = url.pathname.split("/")[2];
			if (!accessListId) return notFound(res);

			if (req.method === "PATCH") {
				if (!(await requireAccess(req, res, "manage_access_lists"))) return;
				const payload = await readJson(req);
				const name = payload?.name;
				const description = payload?.description ?? null;
				const roles = payload?.roles ? sanitizeRoles(payload.roles) : null;

				if (!name || typeof name !== "string") {
					return sendJson(res, 400, { message: "name is required." });
				}

				const client = await pool.connect();
				try {
					await client.query("BEGIN");
					const result = await client.query(
						`UPDATE ${schema}.access_lists
						 SET name = $1,
						     description = $2,
						     updated_at = now()
						 WHERE id = $3
						 RETURNING id, name, description`,
						[name.trim(), description, accessListId]
					);

					if (result.rowCount === 0) {
						await client.query("ROLLBACK");
						return notFound(res);
					}

					let roleNames = [];
					if (roles) {
						await client.query(`DELETE FROM ${schema}.role_access WHERE access_list_id = $1`, [
							accessListId
						]);

						const roleRows = await resolveRoleIds(client, roles);
						for (const role of roleRows) {
							await client.query(
								`INSERT INTO ${schema}.role_access (role_id, access_list_id, created_at)
								 VALUES ($1, $2, now())
								 ON CONFLICT DO NOTHING`,
								[role.id, accessListId]
							);
						}
						roleNames = roleRows.map((row) => row.name);
					} else {
						const roleRows = await client.query(
							`SELECT r.name
							 FROM ${schema}.role_access ra
							 JOIN ${schema}.roles r ON r.id = ra.role_id
							 WHERE ra.access_list_id = $1`,
							[accessListId]
						);
						roleNames = roleRows.rows.map((row) => row.name);
					}

					await client.query("COMMIT");
					return sendJson(res, 200, {
						id: result.rows[0].id,
						name: result.rows[0].name,
						description: result.rows[0].description,
						roles: roleNames
					});
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			}

			if (req.method === "DELETE") {
				if (!(await requireAccess(req, res, "manage_access_lists"))) return;
				await pool.query(`DELETE FROM ${schema}.access_lists WHERE id = $1`, [accessListId]);
				return sendJson(res, 200, { ok: true });
			}

			return methodNotAllowed(res);
		}

		if (url.pathname === "/members") {
			if (req.method === "GET") {
				const visibility = await getVisibilityMap(pool);
				const isPublic = visibility.get("members") ?? true;
				if (!isPublic && !isAuthed(req)) {
					return sendJson(res, 401, { message: "Authentication required." });
				}

				const result = await pool.query(
					`SELECT m.id,
					        m.display_name,
					        m.status,
					        m.wallet_address,
					        COALESCE(roles.roles, ARRAY[]::text[]) AS roles,
					        COALESCE(global_ranks.ranks, ARRAY[]::text[]) AS global_ranks,
					        COALESCE(role_ranks.role_ranks, '[]'::json) AS role_ranks
					 FROM ${schema}.members m
					 LEFT JOIN LATERAL (
					 	SELECT array_agg(r.name) AS roles
					 	FROM ${schema}.member_roles mr
					 	JOIN ${schema}.roles r ON r.id = mr.role_id
					 	WHERE mr.member_id = m.id
					 ) roles ON true
					 LEFT JOIN LATERAL (
					 	SELECT array_agg(rk.name) AS ranks
					 	FROM ${schema}.member_ranks mr
					 	JOIN ${schema}.ranks rk ON rk.id = mr.rank_id
					 	WHERE mr.member_id = m.id AND mr.role_id IS NULL
					 ) global_ranks ON true
					 LEFT JOIN LATERAL (
					 	SELECT json_agg(
					 		jsonb_build_object(
					 			'role', rr.name,
					 			'rank', COALESCE(rro.name, rk.name)
					 		)
					 	) AS role_ranks
					 	FROM ${schema}.member_ranks mr
					 	JOIN ${schema}.roles rr ON rr.id = mr.role_id
					 	JOIN ${schema}.ranks rk ON rk.id = mr.rank_id
					 	LEFT JOIN ${schema}.role_rank_overrides rro
					 		ON rro.role_id = mr.role_id AND rro.rank_id = mr.rank_id
					 	WHERE mr.member_id = m.id AND mr.role_id IS NOT NULL
					 ) role_ranks ON true
					 ORDER BY m.created_at DESC`
				);

				const members = result.rows.map((row) => ({
					id: row.id,
					displayName: row.display_name,
					status: row.status,
					walletAddress: row.wallet_address,
					roles: row.roles ?? [],
					globalRanks: row.global_ranks ?? [],
					roleRanks: row.role_ranks ?? []
				}));

				return sendJson(res, 200, members);
			}

			if (req.method === "POST") {
				if (!(await requireAccess(req, res, "manage_members"))) return;
				const payload = await readJson(req);
				const displayName = payload?.displayName;
				const status = payload?.status ?? "active";
				const walletAddress = payload?.walletAddress ?? null;
				const roles = sanitizeRoles(payload?.roles);
				const globalRankId = payload?.globalRankId ?? null;
				const roleRanks = Array.isArray(payload?.roleRanks) ? payload.roleRanks : [];

				if (!displayName || typeof displayName !== "string") {
					return sendJson(res, 400, { message: "displayName is required." });
				}

				const client = await pool.connect();
				try {
					await client.query("BEGIN");
					const memberResult = await client.query(
						`INSERT INTO ${schema}.members
						 (display_name, status, wallet_address, created_at, updated_at)
						 VALUES ($1, $2, $3, now(), now())
						 RETURNING id, display_name, status, wallet_address`,
						[displayName.trim(), status, walletAddress]
					);

					const member = memberResult.rows[0];
					const roleMap = new Map();
					for (const roleName of roles) {
						const roleResult = await client.query(
							`INSERT INTO ${schema}.roles
							 (name, created_at, updated_at)
							 VALUES ($1, now(), now())
							 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
							 RETURNING id, name`,
							[roleName]
						);

						const roleId = roleResult.rows[0].id;
						roleMap.set(roleResult.rows[0].name, roleId);
						await client.query(
							`INSERT INTO ${schema}.member_roles
							 (member_id, role_id, created_at)
							 VALUES ($1, $2, now())
							 ON CONFLICT DO NOTHING`,
							[member.id, roleId]
						);
					}

					if (globalRankId) {
						await client.query(
							`INSERT INTO ${schema}.member_ranks
							 (member_id, rank_id, role_id, created_at)
							 VALUES ($1, $2, NULL, now())
							 ON CONFLICT DO NOTHING`,
							[member.id, globalRankId]
						);
					}

					for (const entry of roleRanks) {
						if (!entry || typeof entry !== "object") continue;
						const roleName = entry.role;
						const rankId = entry.rankId;
						if (!roleName || !rankId) continue;
						const roleId = roleMap.get(roleName);
						if (!roleId) continue;
						await client.query(
							`INSERT INTO ${schema}.member_ranks
							 (member_id, rank_id, role_id, created_at)
							 VALUES ($1, $2, $3, now())
							 ON CONFLICT DO NOTHING`,
							[member.id, rankId, roleId]
						);
					}

					await client.query("COMMIT");
					return sendJson(res, 201, {
						id: member.id,
						displayName: member.display_name,
						status: member.status,
						walletAddress: member.wallet_address,
						roles,
						globalRanks: [],
						roleRanks: []
					});
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			}

			return methodNotAllowed(res);
		}

		if (url.pathname.startsWith("/members/")) {
			const memberId = url.pathname.split("/")[2];
			if (!memberId) return notFound(res);

			if (req.method === "PATCH") {
				if (!(await requireAccess(req, res, "manage_members"))) return;
				const payload = await readJson(req);
				const displayName = payload?.displayName;
				const status = payload?.status ?? "active";
				const walletAddress = payload?.walletAddress ?? null;
				const roles = sanitizeRoles(payload?.roles);
				const globalRankId = payload?.globalRankId ?? null;
				const roleRanks = Array.isArray(payload?.roleRanks) ? payload.roleRanks : [];

				if (!displayName || typeof displayName !== "string") {
					return sendJson(res, 400, { message: "displayName is required." });
				}

				const client = await pool.connect();
				try {
					await client.query("BEGIN");
					const memberResult = await client.query(
						`UPDATE ${schema}.members
						 SET display_name = $1,
						     status = $2,
						     wallet_address = $3,
						     updated_at = now()
						 WHERE id = $4
						 RETURNING id, display_name, status, wallet_address`,
						[displayName.trim(), status, walletAddress, memberId]
					);
					if (memberResult.rowCount === 0) {
						await client.query("ROLLBACK");
						return notFound(res);
					}

					await client.query(`DELETE FROM ${schema}.member_roles WHERE member_id = $1`, [
						memberId
					]);
					await client.query(`DELETE FROM ${schema}.member_ranks WHERE member_id = $1`, [
						memberId
					]);

					const roleMap = new Map();
					for (const roleName of roles) {
						const roleResult = await client.query(
							`INSERT INTO ${schema}.roles
							 (name, created_at, updated_at)
							 VALUES ($1, now(), now())
							 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
							 RETURNING id, name`,
							[roleName]
						);
						const roleId = roleResult.rows[0].id;
						roleMap.set(roleResult.rows[0].name, roleId);
						await client.query(
							`INSERT INTO ${schema}.member_roles
							 (member_id, role_id, created_at)
							 VALUES ($1, $2, now())
							 ON CONFLICT DO NOTHING`,
							[memberId, roleId]
						);
					}

					if (globalRankId) {
						await client.query(
							`INSERT INTO ${schema}.member_ranks
							 (member_id, rank_id, role_id, created_at)
							 VALUES ($1, $2, NULL, now())
							 ON CONFLICT DO NOTHING`,
							[memberId, globalRankId]
						);
					}

					for (const entry of roleRanks) {
						if (!entry || typeof entry !== "object") continue;
						const roleName = entry.role;
						const rankId = entry.rankId;
						if (!roleName || !rankId) continue;
						const roleId = roleMap.get(roleName);
						if (!roleId) continue;
						await client.query(
							`INSERT INTO ${schema}.member_ranks
							 (member_id, rank_id, role_id, created_at)
							 VALUES ($1, $2, $3, now())
							 ON CONFLICT DO NOTHING`,
							[memberId, rankId, roleId]
						);
					}

					await client.query("COMMIT");
					return sendJson(res, 200, {
						id: memberResult.rows[0].id,
						displayName: memberResult.rows[0].display_name,
						status: memberResult.rows[0].status,
						walletAddress: memberResult.rows[0].wallet_address,
						roles
					});
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				} finally {
					client.release();
				}
			}

			if (req.method === "DELETE") {
				if (!(await requireAccess(req, res, "manage_members"))) return;
				await pool.query(`DELETE FROM ${schema}.members WHERE id = $1`, [memberId]);
				return sendJson(res, 200, { ok: true });
			}

			return methodNotAllowed(res);
		}

		return notFound(res);
	} catch (error) {
		console.error(error);
		sendJson(res, 500, { message: error instanceof Error ? error.message : "Server error." });
	}
});

server.listen(port, () => {
	console.log(`Module API listening on http://localhost:${port}`);
});
