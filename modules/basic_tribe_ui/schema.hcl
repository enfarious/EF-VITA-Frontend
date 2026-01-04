schema "public" {}

schema "basic_tribe_ui" {}

enum "member_status" {
	schema = schema.basic_tribe_ui
	values = ["active", "pending", "suspended"]
}

table "members" {
	schema = schema.basic_tribe_ui

	column "id" {
		type    = uuid
		default = sql("gen_random_uuid()")
	}

	column "display_name" {
		type = text
	}

	column "status" {
		type    = enum.member_status
		default = "active"
	}

	column "wallet_address" {
		type = text
		null = true
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "updated_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "created_by" {
		type = text
		null = true
	}

	column "updated_by" {
		type = text
		null = true
	}

	primary_key {
		columns = [column.id]
	}

	index "members_wallet_address_idx" {
		unique  = true
		columns = [column.wallet_address]
		where   = "wallet_address IS NOT NULL"
	}
}

table "roles" {
	schema = schema.basic_tribe_ui

	column "id" {
		type    = uuid
		default = sql("gen_random_uuid()")
	}

	column "sort_order" {
		type    = int
		default = 0
	}

	column "name" {
		type = text
	}

	column "description" {
		type = text
		null = true
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "updated_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "created_by" {
		type = text
		null = true
	}

	column "updated_by" {
		type = text
		null = true
	}

	primary_key {
		columns = [column.id]
	}

	index "roles_name_idx" {
		unique  = true
		columns = [column.name]
	}
}

table "access_lists" {
	schema = schema.basic_tribe_ui

	column "id" {
		type    = uuid
		default = sql("gen_random_uuid()")
	}

	column "name" {
		type = text
	}

	column "description" {
		type = text
		null = true
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "updated_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "created_by" {
		type = text
		null = true
	}

	column "updated_by" {
		type = text
		null = true
	}

	primary_key {
		columns = [column.id]
	}

	index "access_lists_name_idx" {
		unique  = true
		columns = [column.name]
	}
}

table "ranks" {
	schema = schema.basic_tribe_ui

	column "id" {
		type    = uuid
		default = sql("gen_random_uuid()")
	}

	column "sort_order" {
		type    = int
		default = 0
	}

	column "name" {
		type = text
	}

	column "description" {
		type = text
		null = true
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "updated_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "created_by" {
		type = text
		null = true
	}

	column "updated_by" {
		type = text
		null = true
	}

	primary_key {
		columns = [column.id]
	}

	index "ranks_name_idx" {
		unique  = true
		columns = [column.name]
	}
}

table "role_ranks" {
	schema = schema.basic_tribe_ui

	column "role_id" {
		type = uuid
	}

	column "rank_id" {
		type = uuid
	}

	column "sort_order" {
		type    = int
		default = 0
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "created_by" {
		type = text
		null = true
	}

	primary_key {
		columns = [column.role_id, column.rank_id]
	}

	foreign_key "role_ranks_role_id_fkey" {
		columns     = [column.role_id]
		ref_columns = [table.roles.column.id]
		on_delete   = "CASCADE"
	}

	foreign_key "role_ranks_rank_id_fkey" {
		columns     = [column.rank_id]
		ref_columns = [table.ranks.column.id]
		on_delete   = "CASCADE"
	}
}

table "role_rank_overrides" {
	schema = schema.basic_tribe_ui

	column "role_id" {
		type = uuid
	}

	column "rank_id" {
		type = uuid
	}

	column "name" {
		type = text
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "updated_at" {
		type    = timestamptz
		default = sql("now()")
	}

	primary_key {
		columns = [column.role_id, column.rank_id]
	}

	foreign_key "role_rank_overrides_role_id_fkey" {
		columns     = [column.role_id]
		ref_columns = [table.roles.column.id]
		on_delete   = "CASCADE"
	}

	foreign_key "role_rank_overrides_rank_id_fkey" {
		columns     = [column.rank_id]
		ref_columns = [table.ranks.column.id]
		on_delete   = "CASCADE"
	}
}

table "member_ranks" {
	schema = schema.basic_tribe_ui

	column "id" {
		type    = uuid
		default = sql("gen_random_uuid()")
	}

	column "member_id" {
		type = uuid
	}

	column "rank_id" {
		type = uuid
	}

	column "role_id" {
		type = uuid
		null = true
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "created_by" {
		type = text
		null = true
	}

	primary_key {
		columns = [column.id]
	}

	index "member_ranks_unique_idx" {
		unique  = true
		columns = [column.member_id, column.rank_id, column.role_id]
	}

	index "member_ranks_role_unique_idx" {
		unique  = true
		columns = [column.member_id, column.role_id]
		where   = "role_id IS NOT NULL"
	}

	index "member_ranks_global_unique_idx" {
		unique  = true
		columns = [column.member_id]
		where   = "role_id IS NULL"
	}

	foreign_key "member_ranks_member_id_fkey" {
		columns     = [column.member_id]
		ref_columns = [table.members.column.id]
		on_delete   = "CASCADE"
	}

	foreign_key "member_ranks_rank_id_fkey" {
		columns     = [column.rank_id]
		ref_columns = [table.ranks.column.id]
		on_delete   = "CASCADE"
	}

	foreign_key "member_ranks_role_id_fkey" {
		columns     = [column.role_id]
		ref_columns = [table.roles.column.id]
		on_delete   = "CASCADE"
	}
}

table "visibility_settings" {
	schema = schema.basic_tribe_ui

	column "area" {
		type = text
	}

	column "is_public" {
		type    = bool
		default = false
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "updated_at" {
		type    = timestamptz
		default = sql("now()")
	}

	primary_key {
		columns = [column.area]
	}
}

table "member_roles" {
	schema = schema.basic_tribe_ui

	column "member_id" {
		type = uuid
	}

	column "role_id" {
		type = uuid
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "created_by" {
		type = text
		null = true
	}

	primary_key {
		columns = [column.member_id, column.role_id]
	}

	foreign_key "member_roles_member_id_fkey" {
		columns     = [column.member_id]
		ref_columns = [table.members.column.id]
		on_delete   = "CASCADE"
	}

	foreign_key "member_roles_role_id_fkey" {
		columns     = [column.role_id]
		ref_columns = [table.roles.column.id]
		on_delete   = "CASCADE"
	}
}

table "role_access" {
	schema = schema.basic_tribe_ui

	column "role_id" {
		type = uuid
	}

	column "access_list_id" {
		type = uuid
	}

	column "created_at" {
		type    = timestamptz
		default = sql("now()")
	}

	column "created_by" {
		type = text
		null = true
	}

	primary_key {
		columns = [column.role_id, column.access_list_id]
	}

	foreign_key "role_access_role_id_fkey" {
		columns     = [column.role_id]
		ref_columns = [table.roles.column.id]
		on_delete   = "CASCADE"
	}

	foreign_key "role_access_access_list_id_fkey" {
		columns     = [column.access_list_id]
		ref_columns = [table.access_lists.column.id]
		on_delete   = "CASCADE"
	}
}
