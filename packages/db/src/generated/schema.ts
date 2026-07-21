import { pgTable, index, unique, pgPolicy, uuid, text, timestamp, integer, foreignKey, check, jsonb, boolean, smallint, numeric, uniqueIndex, date, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const billPublishStatus = pgEnum("bill_publish_status", ['draft', 'published', 'coming_soon'])
export const billStatusEnum = pgEnum("bill_status_enum", ['preparing', 'submitted', 'in_committee', 'plenary_session', 'approved', 'rejected', 'adopted', 'partially_adopted'])
export const chatRoleEnum = pgEnum("chat_role_enum", ['user', 'system', 'assistant'])
export const difficultyLevelEnum = pgEnum("difficulty_level_enum", ['normal', 'hard'])
export const interviewConfigStatusEnum = pgEnum("interview_config_status_enum", ['public', 'closed'])
export const interviewFeedbackTagEnum = pgEnum("interview_feedback_tag_enum", ['irrelevant_questions', 'not_aligned', 'misunderstood', 'too_many_questions', 'other'])
export const interviewModeEnum = pgEnum("interview_mode_enum", ['loop', 'bulk'])
export const interviewReportRoleEnum = pgEnum("interview_report_role_enum", ['subject_expert', 'work_related', 'daily_life_affected', 'general_citizen'])
export const interviewRoleEnum = pgEnum("interview_role_enum", ['assistant', 'user'])
export const moderationStatusEnum = pgEnum("moderation_status_enum", ['ok', 'warning', 'ng'])
export const proposalTypeEnum = pgEnum("proposal_type_enum", ['mayor_bill', 'committee_bill', 'report', 'petition', 'member_bill', 'other'])
export const reportReviewStatusEnum = pgEnum("report_review_status_enum", ['auto_approved', 'pending', 'approved', 'rejected'])
export const stanceTypeEnum = pgEnum("stance_type_enum", ['for', 'against', 'neutral', 'conditional_for', 'conditional_against', 'considering', 'continued_deliberation'])


export const tags = pgTable("tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	label: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	featuredPriority: integer("featured_priority"),
	description: text(),
}, (table) => [
	index("idx_tags_featured_priority").using("btree", table.featuredPriority.asc().nullsLast().op("int4_ops")).where(sql`(featured_priority IS NOT NULL)`),
	unique("tags_label_key").on(table.label),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`true` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const interviewReport = pgTable("interview_report", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	interviewSessionId: uuid("interview_session_id").notNull(),
	summary: text(),
	stance: stanceTypeEnum(),
	role: interviewReportRoleEnum(),
	roleDescription: text("role_description"),
	opinions: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isPublicByAdmin: boolean("is_public_by_admin").default(false).notNull(),
	contentRichness: jsonb("content_richness"),
	roleTitle: text("role_title"),
	isPublicByUser: boolean("is_public_by_user").default(false).notNull(),
	totalContentRichness: integer("total_content_richness").generatedAlwaysAs(sql`
CASE
    WHEN ((content_richness IS NOT NULL) AND ((content_richness ->> 'total'::text) IS NOT NULL) AND ((content_richness ->> 'total'::text) ~ '^\d+$'::text)) THEN ((content_richness ->> 'total'::text))::integer
    ELSE NULL::integer
END`),
	moderationScore: integer("moderation_score"),
	moderationStatus: moderationStatusEnum("moderation_status").generatedAlwaysAs(sql`
CASE
    WHEN (moderation_score IS NULL) THEN NULL::moderation_status_enum
    WHEN (moderation_score >= 70) THEN 'ng'::moderation_status_enum
    WHEN (moderation_score >= 30) THEN 'warning'::moderation_status_enum
    ELSE 'ok'::moderation_status_enum
END`),
	moderationReasoning: text("moderation_reasoning"),
	reviewStatus: reportReviewStatusEnum("review_status").default('pending').notNull(),
	moderationCategories: jsonb("moderation_categories"),
	faithfulnessOk: boolean("faithfulness_ok"),
	faithfulnessReasoning: text("faithfulness_reasoning"),
}, (table) => [
	index("idx_interview_report_is_public_by_admin").using("btree", table.isPublicByAdmin.asc().nullsLast().op("bool_ops")),
	index("idx_interview_report_moderation_status").using("btree", table.moderationStatus.asc().nullsLast().op("enum_ops")),
	index("idx_interview_report_review_status").using("btree", table.reviewStatus.asc().nullsLast().op("enum_ops")),
	index("idx_interview_report_total_content_richness").using("btree", table.totalContentRichness.desc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.interviewSessionId],
			foreignColumns: [interviewSessions.id],
			name: "interview_report_interview_session_id_fkey"
		}).onDelete("cascade"),
	unique("interview_report_interview_session_id_key").on(table.interviewSessionId),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`(is_public_by_admin AND is_public_by_user)` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
	check("chk_moderation_score_range", sql`(moderation_score IS NULL) OR ((moderation_score >= 0) AND (moderation_score <= 100))`),
]);

export const committees = pgTable("committees", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`true` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const interviewSessions = pgTable("interview_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	interviewConfigId: uuid("interview_config_id").notNull(),
	userId: uuid("user_id").notNull(),
	langfuseSessionId: text("langfuse_session_id"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	rating: smallint(),
}, (table) => [
	index("idx_interview_sessions_config_id").using("btree", table.interviewConfigId.asc().nullsLast().op("uuid_ops")),
	index("idx_interview_sessions_config_user").using("btree", table.interviewConfigId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_interview_sessions_started_at").using("btree", table.startedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_interview_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.interviewConfigId],
			foreignColumns: [interviewConfigs.id],
			name: "interview_sessions_interview_config_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("resident_own", { as: "permissive", for: "all", to: ["resident_writer"], using: sql`(user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid)`, withCheck: sql`(user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid)`  }),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"] }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
	check("interview_sessions_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const interviewMessages = pgTable("interview_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	interviewSessionId: uuid("interview_session_id").notNull(),
	role: interviewRoleEnum().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_interview_messages_session_created").using("btree", table.interviewSessionId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_interview_messages_session_id").using("btree", table.interviewSessionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.interviewSessionId],
			foreignColumns: [interviewSessions.id],
			name: "interview_messages_interview_session_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("resident_own", { as: "permissive", for: "all", to: ["resident_writer"], using: sql`(EXISTS ( SELECT 1
   FROM interview_sessions s
  WHERE ((s.id = interview_messages.interview_session_id) AND (s.user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM interview_sessions s
  WHERE ((s.id = interview_messages.interview_session_id) AND (s.user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid))))`  }),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"] }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const themes = pgTable("themes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	emoji: text(),
	name: text().notNull(),
	lead: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_themes_sort_order").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
	unique("themes_slug_key").on(table.slug),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"] }),
]);

export const themeContents = pgTable("theme_contents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	themeId: uuid("theme_id").notNull(),
	overview: text(),
	policies: jsonb().default([]).notNull(),
	numbers: jsonb().default([]).notNull(),
	plans: jsonb().default([]).notNull(),
	billTagLabel: text("bill_tag_label"),
	aiSummary: text("ai_summary"),
	aiSummarySourceUrl: text("ai_summary_source_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.themeId],
			foreignColumns: [themes.id],
			name: "theme_contents_theme_id_fkey"
		}).onDelete("cascade"),
	unique("theme_contents_theme_id_key").on(table.themeId),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"] }),
]);

export const themeInitiatives = pgTable("theme_initiatives", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	themeId: uuid("theme_id").notNull(),
	title: text().notNull(),
	body: text(),
	dateLabel: text("date_label"),
	url: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_theme_initiatives_theme_id").using("btree", table.themeId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.themeId],
			foreignColumns: [themes.id],
			name: "theme_initiatives_theme_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"] }),
]);

export const chats = pgTable("chats", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	billId: uuid("bill_id").notNull(),
	userId: uuid("user_id"),
	role: chatRoleEnum().notNull(),
	message: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_chats_bill_id").using("btree", table.billId.asc().nullsLast().op("uuid_ops")),
	index("idx_chats_bill_user").using("btree", table.billId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_chats_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_chats_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "chats_bill_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("resident_own", { as: "permissive", for: "all", to: ["resident_writer"], using: sql`(user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid)`, withCheck: sql`(user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid)`  }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const previewTokens = pgTable("preview_tokens", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	billId: uuid("bill_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
}, (table) => [
	index("idx_preview_tokens_bill_id").using("btree", table.billId.asc().nullsLast().op("uuid_ops")),
	index("idx_preview_tokens_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_preview_tokens_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "preview_tokens_bill_id_fkey"
		}).onDelete("cascade"),
	unique("preview_tokens_token_key").on(table.token),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
]);

export const billContents = pgTable("bill_contents", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	billId: uuid("bill_id").notNull(),
	difficultyLevel: difficultyLevelEnum("difficulty_level").notNull(),
	title: text().notNull(),
	summary: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_bill_contents_bill_id").using("btree", table.billId.asc().nullsLast().op("uuid_ops")),
	index("idx_bill_contents_difficulty").using("btree", table.difficultyLevel.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "bill_contents_bill_id_fkey"
		}).onDelete("cascade"),
	unique("bill_contents_bill_id_difficulty_level_key").on(table.billId, table.difficultyLevel),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`(EXISTS ( SELECT 1
   FROM bills b
  WHERE ((b.id = bill_contents.bill_id) AND (b.publish_status = 'published'::bill_publish_status))))` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const chatUsageEvents = pgTable("chat_usage_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sessionId: text("session_id"),
	promptName: text("prompt_name"),
	model: text().notNull(),
	inputTokens: integer("input_tokens").default(0).notNull(),
	outputTokens: integer("output_tokens").default(0).notNull(),
	totalTokens: integer("total_tokens").default(0).notNull(),
	costUsd: numeric("cost_usd", { precision: 12, scale:  6 }).default('0').notNull(),
	metadata: jsonb(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chat_usage_events_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("chat_usage_events_user_id_occurred_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.occurredAt.asc().nullsLast().op("timestamptz_ops")),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
]);

export const expertRegistrations = pgTable("expert_registrations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	affiliation: text().notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: uuid("user_id").notNull(),
}, (table) => [
	uniqueIndex("idx_expert_registrations_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_expert_registrations_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	// NOTE: auth.users への FK は cross-schema のため introspect 対象外（DB 側の制約は有効）
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
]);

export const interviewConfigs = pgTable("interview_configs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	billId: uuid("bill_id"),
	status: interviewConfigStatusEnum().default('closed').notNull(),
	themes: text().array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text().notNull(),
	mode: interviewModeEnum().default('loop').notNull(),
	chatModel: text("chat_model"),
	estimatedDuration: integer("estimated_duration"),
	themeId: uuid("theme_id"),
	themeInitiativeId: uuid("theme_initiative_id"),
}, (table) => [
	index("idx_interview_configs_bill_id").using("btree", table.billId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_interview_configs_bill_public").using("btree", table.billId.asc().nullsLast().op("uuid_ops")).where(sql`(status = 'public'::interview_config_status_enum)`),
	index("idx_interview_configs_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_interview_configs_theme_id").using("btree", table.themeId.asc().nullsLast().op("uuid_ops")),
	index("idx_interview_configs_theme_initiative_id").using("btree", table.themeInitiativeId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_interview_configs_theme_initiative_public").using("btree", table.themeInitiativeId.asc().nullsLast().op("uuid_ops")).where(sql`(status = 'public'::interview_config_status_enum)`),
	uniqueIndex("idx_interview_configs_theme_public").using("btree", table.themeId.asc().nullsLast().op("uuid_ops")).where(sql`(status = 'public'::interview_config_status_enum)`),
	foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "interview_configs_bill_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.themeId],
			foreignColumns: [themes.id],
			name: "interview_configs_theme_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.themeInitiativeId],
			foreignColumns: [themeInitiatives.id],
			name: "interview_configs_theme_initiative_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`(((bill_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM bills b
  WHERE ((b.id = interview_configs.bill_id) AND (b.publish_status = 'published'::bill_publish_status))))) OR ((theme_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM themes t
  WHERE ((t.id = interview_configs.theme_id) AND t.is_active)))) OR ((theme_initiative_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM theme_initiatives i
  WHERE ((i.id = interview_configs.theme_initiative_id) AND i.is_active)))))` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
	check("chk_interview_target_exactly_one", sql`num_nonnulls(bill_id, theme_id, theme_initiative_id) = 1`),
]);

export const interviewQuestions = pgTable("interview_questions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	interviewConfigId: uuid("interview_config_id").notNull(),
	question: text().notNull(),
	followUpGuide: text("follow_up_guide"),
	quickReplies: text("quick_replies").array(),
	questionOrder: integer("question_order").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_interview_questions_config_id").using("btree", table.interviewConfigId.asc().nullsLast().op("uuid_ops")),
	index("idx_interview_questions_config_order").using("btree", table.interviewConfigId.asc().nullsLast().op("int4_ops"), table.questionOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.interviewConfigId],
			foreignColumns: [interviewConfigs.id],
			name: "interview_questions_interview_config_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`(EXISTS ( SELECT 1
   FROM (interview_configs c
     JOIN bills b ON ((b.id = c.bill_id)))
  WHERE ((c.id = interview_questions.interview_config_id) AND (b.publish_status = 'published'::bill_publish_status))))` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const reportReactions = pgTable("report_reactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	interviewReportId: uuid("interview_report_id").notNull(),
	userId: uuid("user_id").notNull(),
	reactionType: text("reaction_type").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_report_reactions_report_id").using("btree", table.interviewReportId.asc().nullsLast().op("uuid_ops")),
	index("idx_report_reactions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.interviewReportId],
			foreignColumns: [interviewReport.id],
			name: "report_reactions_interview_report_id_fkey"
		}).onDelete("cascade"),
	unique("report_reactions_interview_report_id_user_id_key").on(table.interviewReportId, table.userId),
	pgPolicy("resident_own", { as: "permissive", for: "all", to: ["resident_writer"], using: sql`(user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid)`, withCheck: sql`(user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid)`  }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
	check("report_reactions_reaction_type_check", sql`reaction_type = ANY (ARRAY['helpful'::text, 'hmm'::text])`),
]);

export const topicAnalysisTopics = pgTable("topic_analysis_topics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	versionId: uuid("version_id").notNull(),
	name: text().notNull(),
	descriptionMd: text("description_md").notNull(),
	representativeOpinions: jsonb("representative_opinions").default([]).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_topic_analysis_topics_version_id").using("btree", table.versionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.versionId],
			foreignColumns: [topicAnalysisVersions.id],
			name: "topic_analysis_topics_version_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
]);

export const topicAnalysisClassifications = pgTable("topic_analysis_classifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	versionId: uuid("version_id").notNull(),
	interviewReportId: uuid("interview_report_id").notNull(),
	topicId: uuid("topic_id").notNull(),
	opinionIndex: integer("opinion_index").notNull(),
}, (table) => [
	index("idx_topic_analysis_classifications_topic_id").using("btree", table.topicId.asc().nullsLast().op("uuid_ops")),
	index("idx_topic_analysis_classifications_version_id").using("btree", table.versionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.versionId],
			foreignColumns: [topicAnalysisVersions.id],
			name: "topic_analysis_classifications_version_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.interviewReportId],
			foreignColumns: [interviewReport.id],
			name: "topic_analysis_classifications_interview_report_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [topicAnalysisTopics.id],
			name: "topic_analysis_classifications_topic_id_fkey"
		}).onDelete("cascade"),
	unique("topic_analysis_classification_version_id_interview_report_i_key").on(table.versionId, table.interviewReportId, table.topicId, table.opinionIndex),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
]);

export const topicAnalysisVersions = pgTable("topic_analysis_versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	billId: uuid("bill_id").notNull(),
	version: integer().notNull(),
	status: text().default('pending').notNull(),
	summaryMd: text("summary_md"),
	intermediateResults: jsonb("intermediate_results"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	currentStep: text("current_step"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	phaseData: jsonb("phase_data"),
}, (table) => [
	index("idx_topic_analysis_versions_bill_id").using("btree", table.billId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "topic_analysis_versions_bill_id_fkey"
		}).onDelete("cascade"),
	unique("topic_analysis_versions_bill_id_version_key").on(table.billId, table.version),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
	check("topic_analysis_versions_status_check", sql`status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])`),
]);

export const interviewRatingFeedbacks = pgTable("interview_rating_feedbacks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	interviewSessionId: uuid("interview_session_id").notNull(),
	tag: interviewFeedbackTagEnum().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_interview_rating_feedbacks_session").using("btree", table.interviewSessionId.asc().nullsLast().op("uuid_ops")),
	index("idx_interview_rating_feedbacks_tag").using("btree", table.tag.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.interviewSessionId],
			foreignColumns: [interviewSessions.id],
			name: "interview_rating_feedbacks_interview_session_id_fkey"
		}).onDelete("cascade"),
	unique("interview_rating_feedbacks_interview_session_id_tag_key").on(table.interviewSessionId, table.tag),
	pgPolicy("resident_own", { as: "permissive", for: "all", to: ["resident_writer"], using: sql`(EXISTS ( SELECT 1
   FROM interview_sessions s
  WHERE ((s.id = interview_rating_feedbacks.interview_session_id) AND (s.user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM interview_sessions s
  WHERE ((s.id = interview_rating_feedbacks.interview_session_id) AND (s.user_id = (NULLIF(current_setting('app.anon_id'::text, true), ''::text))::uuid))))`  }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const councilSessions = pgTable("council_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slug: text(),
	councilUrl: text("council_url"),
	isActive: boolean("is_active").default(false).notNull(),
}, (table) => [
	index("idx_council_sessions_date_range").using("btree", table.startDate.asc().nullsLast().op("date_ops"), table.endDate.asc().nullsLast().op("date_ops")),
	index("idx_diet_sessions_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	unique("diet_sessions_slug_key").on(table.slug),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`true` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
	check("end_date_after_start_date", sql`end_date >= start_date`),
]);

export const factions = pgTable("factions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	displayName: text("display_name").notNull(),
	alternativeNames: text("alternative_names").array().default([""]).notNull(),
	logoUrl: text("logo_url"),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`true` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const councilSessionMinutes = pgTable("council_session_minutes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	councilSessionId: uuid("council_session_id").notNull(),
	meetingDate: date("meeting_date").notNull(),
	dayNumber: integer("day_number"),
	title: text(),
	sourcePdfUrl: text("source_pdf_url").notNull(),
	markdownText: text("markdown_text"),
	extractedAt: timestamp("extracted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_council_session_minutes_meeting_date").using("btree", table.meetingDate.desc().nullsFirst().op("date_ops")),
	index("idx_council_session_minutes_session_id").using("btree", table.councilSessionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.councilSessionId],
			foreignColumns: [councilSessions.id],
			name: "council_session_minutes_council_session_id_fkey"
		}).onDelete("cascade"),
	unique("council_session_minutes_council_session_id_meeting_date_key").on(table.councilSessionId, table.meetingDate),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
]);

export const bills = pgTable("bills", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: text().notNull(),
	status: billStatusEnum().notNull(),
	statusNote: text("status_note"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	thumbnailUrl: text("thumbnail_url"),
	publishStatus: billPublishStatus("publish_status").default('draft').notNull(),
	isFeatured: boolean("is_featured").default(false).notNull(),
	shareThumbnailUrl: text("share_thumbnail_url"),
	councilSessionId: uuid("council_session_id"),
	publishStatusOrder: integer("publish_status_order").generatedAlwaysAs(sql`
CASE publish_status
    WHEN 'draft'::bill_publish_status THEN 0
    WHEN 'coming_soon'::bill_publish_status THEN 1
    WHEN 'published'::bill_publish_status THEN 2
    ELSE NULL::integer
END`),
	isReviewCompleted: boolean("is_review_completed").default(false).notNull(),
	submittedDate: timestamp("submitted_date", { withTimezone: true, mode: 'string' }),
	slug: text(),
	knowledgeSource: text("knowledge_source"),
	useKnowledgeSourceInChat: boolean("use_knowledge_source_in_chat").default(false).notNull(),
	statusOrder: integer("status_order").generatedAlwaysAs(sql`
CASE status
    WHEN 'approved'::bill_status_enum THEN 0
    WHEN 'adopted'::bill_status_enum THEN 0
    WHEN 'partially_adopted'::bill_status_enum THEN 1
    WHEN 'rejected'::bill_status_enum THEN 2
    WHEN 'plenary_session'::bill_status_enum THEN 3
    WHEN 'in_committee'::bill_status_enum THEN 4
    WHEN 'submitted'::bill_status_enum THEN 5
    WHEN 'preparing'::bill_status_enum THEN 6
    ELSE NULL::integer
END`),
	committeeId: uuid("committee_id"),
	billNumber: text("bill_number").default('').notNull(),
	proposalType: proposalTypeEnum("proposal_type").default('mayor_bill').notNull(),
}, (table) => [
	uniqueIndex("bills_session_bill_number_unique_idx").using("btree", table.councilSessionId.asc().nullsLast().op("text_ops"), table.billNumber.asc().nullsLast().op("uuid_ops")).where(sql`((bill_number IS NOT NULL) AND (bill_number <> ''::text) AND (council_session_id IS NOT NULL))`),
	index("idx_bills_committee_id").using("btree", table.committeeId.asc().nullsLast().op("uuid_ops")),
	index("idx_bills_council_session_id").using("btree", table.councilSessionId.asc().nullsLast().op("uuid_ops")),
	index("idx_bills_is_featured").using("btree", table.isFeatured.asc().nullsLast().op("bool_ops")).where(sql`(is_featured = true)`),
	index("idx_bills_proposal_type").using("btree", table.proposalType.asc().nullsLast().op("enum_ops")),
	index("idx_bills_publish_status").using("btree", table.publishStatus.asc().nullsLast().op("enum_ops")),
	index("idx_bills_publish_status_order").using("btree", table.publishStatusOrder.asc().nullsLast().op("int4_ops")),
	index("idx_bills_published_at").using("btree", table.publishedAt.desc().nullsFirst().op("timestamptz_ops")),
	uniqueIndex("idx_bills_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("idx_bills_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_bills_status_order").using("btree", table.statusOrder.asc().nullsLast().op("int4_ops")),
	index("idx_bills_submitted_date").using("btree", table.submittedDate.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.councilSessionId],
			foreignColumns: [councilSessions.id],
			name: "bills_diet_session_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.committeeId],
			foreignColumns: [committees.id],
			name: "bills_committee_id_fkey"
		}),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`(publish_status = ANY (ARRAY['published'::bill_publish_status, 'coming_soon'::bill_publish_status]))` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const factionStances = pgTable("faction_stances", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	billId: uuid("bill_id").notNull(),
	factionId: uuid("faction_id").notNull(),
	type: stanceTypeEnum().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_faction_stances_bill_id").using("btree", table.billId.asc().nullsLast().op("uuid_ops")),
	index("idx_faction_stances_faction_id").using("btree", table.factionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "faction_stances_bill_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.factionId],
			foreignColumns: [factions.id],
			name: "faction_stances_faction_id_fkey"
		}).onDelete("cascade"),
	unique("faction_stances_bill_id_faction_id_key").on(table.billId, table.factionId),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`(EXISTS ( SELECT 1
   FROM bills b
  WHERE ((b.id = faction_stances.bill_id) AND (b.publish_status = 'published'::bill_publish_status))))` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);

export const rateLimitCounters = pgTable("rate_limit_counters", {
	bucketKey: text("bucket_key").notNull(),
	windowStartedAt: timestamp("window_started_at", { withTimezone: true, mode: 'string' }).notNull(),
	requestCount: integer("request_count").default(0).notNull(),
}, (table) => [
	index("idx_rate_limit_counters_window").using("btree", table.windowStartedAt.asc().nullsLast().op("timestamptz_ops")),
	primaryKey({ columns: [table.bucketKey, table.windowStartedAt], name: "rate_limit_counters_pkey"}),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"], using: sql`true`, withCheck: sql`true`  }),
]);

export const billsTags = pgTable("bills_tags", {
	billId: uuid("bill_id").notNull(),
	tagId: uuid("tag_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "bills_tags_bill_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "bills_tags_tag_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.billId, table.tagId], name: "bills_tags_pkey"}),
	pgPolicy("public_read", { as: "permissive", for: "select", to: ["public_reader"], using: sql`(EXISTS ( SELECT 1
   FROM bills b
  WHERE ((b.id = bills_tags.bill_id) AND (b.publish_status = ANY (ARRAY['published'::bill_publish_status, 'coming_soon'::bill_publish_status])))))` }),
	pgPolicy("app_admin_all", { as: "permissive", for: "all", to: ["app_admin"] }),
]);
