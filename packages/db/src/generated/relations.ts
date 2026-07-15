import { relations } from "drizzle-orm/relations";
import { interviewSessions, interviewReport, interviewConfigs, interviewMessages, bills, chats, previewTokens, billContents, interviewQuestions, reportReactions, topicAnalysisVersions, topicAnalysisTopics, topicAnalysisClassifications, interviewRatingFeedbacks, councilSessions, councilSessionMinutes, committees, factionStances, factions, billsTags, tags, themes, themeContents, themeInitiatives } from "./schema";

export const interviewReportRelations = relations(interviewReport, ({one, many}) => ({
	interviewSession: one(interviewSessions, {
		fields: [interviewReport.interviewSessionId],
		references: [interviewSessions.id]
	}),
	reportReactions: many(reportReactions),
	topicAnalysisClassifications: many(topicAnalysisClassifications),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({one, many}) => ({
	interviewReports: many(interviewReport),
	interviewConfig: one(interviewConfigs, {
		fields: [interviewSessions.interviewConfigId],
		references: [interviewConfigs.id]
	}),
	interviewMessages: many(interviewMessages),
	interviewRatingFeedbacks: many(interviewRatingFeedbacks),
}));

export const interviewConfigsRelations = relations(interviewConfigs, ({one, many}) => ({
	interviewSessions: many(interviewSessions),
	bill: one(bills, {
		fields: [interviewConfigs.billId],
		references: [bills.id]
	}),
	theme: one(themes, {
		fields: [interviewConfigs.themeId],
		references: [themes.id]
	}),
	themeInitiative: one(themeInitiatives, {
		fields: [interviewConfigs.themeInitiativeId],
		references: [themeInitiatives.id]
	}),
	interviewQuestions: many(interviewQuestions),
}));

export const interviewMessagesRelations = relations(interviewMessages, ({one}) => ({
	interviewSession: one(interviewSessions, {
		fields: [interviewMessages.interviewSessionId],
		references: [interviewSessions.id]
	}),
}));

export const chatsRelations = relations(chats, ({one}) => ({
	bill: one(bills, {
		fields: [chats.billId],
		references: [bills.id]
	}),
}));

export const billsRelations = relations(bills, ({one, many}) => ({
	chats: many(chats),
	previewTokens: many(previewTokens),
	billContents: many(billContents),
	interviewConfigs: many(interviewConfigs),
	topicAnalysisVersions: many(topicAnalysisVersions),
	councilSession: one(councilSessions, {
		fields: [bills.councilSessionId],
		references: [councilSessions.id]
	}),
	committee: one(committees, {
		fields: [bills.committeeId],
		references: [committees.id]
	}),
	factionStances: many(factionStances),
	billsTags: many(billsTags),
}));

export const previewTokensRelations = relations(previewTokens, ({one}) => ({
	bill: one(bills, {
		fields: [previewTokens.billId],
		references: [bills.id]
	}),
}));

export const billContentsRelations = relations(billContents, ({one}) => ({
	bill: one(bills, {
		fields: [billContents.billId],
		references: [bills.id]
	}),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({one}) => ({
	interviewConfig: one(interviewConfigs, {
		fields: [interviewQuestions.interviewConfigId],
		references: [interviewConfigs.id]
	}),
}));

export const reportReactionsRelations = relations(reportReactions, ({one}) => ({
	interviewReport: one(interviewReport, {
		fields: [reportReactions.interviewReportId],
		references: [interviewReport.id]
	}),
}));

export const topicAnalysisTopicsRelations = relations(topicAnalysisTopics, ({one, many}) => ({
	topicAnalysisVersion: one(topicAnalysisVersions, {
		fields: [topicAnalysisTopics.versionId],
		references: [topicAnalysisVersions.id]
	}),
	topicAnalysisClassifications: many(topicAnalysisClassifications),
}));

export const topicAnalysisVersionsRelations = relations(topicAnalysisVersions, ({one, many}) => ({
	topicAnalysisTopics: many(topicAnalysisTopics),
	topicAnalysisClassifications: many(topicAnalysisClassifications),
	bill: one(bills, {
		fields: [topicAnalysisVersions.billId],
		references: [bills.id]
	}),
}));

export const topicAnalysisClassificationsRelations = relations(topicAnalysisClassifications, ({one}) => ({
	topicAnalysisVersion: one(topicAnalysisVersions, {
		fields: [topicAnalysisClassifications.versionId],
		references: [topicAnalysisVersions.id]
	}),
	interviewReport: one(interviewReport, {
		fields: [topicAnalysisClassifications.interviewReportId],
		references: [interviewReport.id]
	}),
	topicAnalysisTopic: one(topicAnalysisTopics, {
		fields: [topicAnalysisClassifications.topicId],
		references: [topicAnalysisTopics.id]
	}),
}));

export const interviewRatingFeedbacksRelations = relations(interviewRatingFeedbacks, ({one}) => ({
	interviewSession: one(interviewSessions, {
		fields: [interviewRatingFeedbacks.interviewSessionId],
		references: [interviewSessions.id]
	}),
}));

export const councilSessionMinutesRelations = relations(councilSessionMinutes, ({one}) => ({
	councilSession: one(councilSessions, {
		fields: [councilSessionMinutes.councilSessionId],
		references: [councilSessions.id]
	}),
}));

export const councilSessionsRelations = relations(councilSessions, ({many}) => ({
	councilSessionMinutes: many(councilSessionMinutes),
	bills: many(bills),
}));

export const committeesRelations = relations(committees, ({many}) => ({
	bills: many(bills),
}));

export const factionStancesRelations = relations(factionStances, ({one}) => ({
	bill: one(bills, {
		fields: [factionStances.billId],
		references: [bills.id]
	}),
	faction: one(factions, {
		fields: [factionStances.factionId],
		references: [factions.id]
	}),
}));

export const factionsRelations = relations(factions, ({many}) => ({
	factionStances: many(factionStances),
}));

export const billsTagsRelations = relations(billsTags, ({one}) => ({
	bill: one(bills, {
		fields: [billsTags.billId],
		references: [bills.id]
	}),
	tag: one(tags, {
		fields: [billsTags.tagId],
		references: [tags.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	billsTags: many(billsTags),
}));

export const themeContentsRelations = relations(themeContents, ({one}) => ({
	theme: one(themes, {
		fields: [themeContents.themeId],
		references: [themes.id]
	}),
}));

export const themesRelations = relations(themes, ({many}) => ({
	themeContents: many(themeContents),
	themeInitiatives: many(themeInitiatives),
	interviewConfigs: many(interviewConfigs),
}));

export const themeInitiativesRelations = relations(themeInitiatives, ({one, many}) => ({
	theme: one(themes, {
		fields: [themeInitiatives.themeId],
		references: [themes.id]
	}),
	interviewConfigs: many(interviewConfigs),
}));