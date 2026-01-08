import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { listMembers } from "@/api/members";
import { getModuleSession } from "@/api/moduleSession";
import { listAccessLists } from "@/api/roles";

type JobScope = "tribe" | "alliance";
type JobPriority = "low" | "medium" | "high";
type JobStatus = "open" | "in_progress" | "review" | "paid";

type JobTask = {
	id: string;
	label: string;
	done: boolean;
};

type JobContributor = {
	id: string;
	name: string;
	contribution: number;
};

type Job = {
	id: string;
	title: string;
	summary: string;
	scope: JobScope;
	priority: JobPriority;
	status: JobStatus;
	reward: number;
	dueDate: string;
	createdAt: string;
	ownerId: string;
	delegateIds: string[];
	tasks: JobTask[];
	contributors: JobContributor[];
};

const STORAGE_KEY = "job-board-jobs";

const seedJobs: Job[] = [
	{
		id: "job-ironwood",
		title: "Ironwood convoy",
		summary: "Deliver 400 ironwood to Embergate before the next siege window.",
		scope: "tribe",
		priority: "high",
		status: "in_progress",
		reward: 1200,
		dueDate: "2026-01-20",
		createdAt: "2026-01-05",
		ownerId: "seed-owner",
		delegateIds: [],
		tasks: [
			{ id: "task-ironwood-1", label: "Scout safe route", done: true },
			{ id: "task-ironwood-2", label: "Gather 400 ironwood", done: false },
			{ id: "task-ironwood-3", label: "Run convoy escort", done: false }
		],
		contributors: [
			{ id: "contrib-1", name: "Sable", contribution: 24 },
			{ id: "contrib-2", name: "Voss", contribution: 18 }
		]
	},
	{
		id: "job-watchtower",
		title: "Watchtower repairs",
		summary: "Restore the northern watchtower and set early warning beacons.",
		scope: "alliance",
		priority: "medium",
		status: "review",
		reward: 900,
		dueDate: "2026-01-18",
		createdAt: "2026-01-03",
		ownerId: "seed-owner",
		delegateIds: [],
		tasks: [
			{ id: "task-watchtower-1", label: "Salvage stone blocks", done: true },
			{ id: "task-watchtower-2", label: "Install beacon lattice", done: true }
		],
		contributors: [
			{ id: "contrib-3", name: "Mara", contribution: 15 },
			{ id: "contrib-4", name: "Kael", contribution: 10 }
		]
	},
	{
		id: "job-patrol",
		title: "Ghostline patrol",
		summary: "Clear raider camps along the Ghostline and log loot.",
		scope: "tribe",
		priority: "low",
		status: "open",
		reward: 450,
		dueDate: "2026-01-22",
		createdAt: "2026-01-07",
		ownerId: "seed-owner",
		delegateIds: [],
		tasks: [
			{ id: "task-patrol-1", label: "Mark camp locations", done: false },
			{ id: "task-patrol-2", label: "Clear raider squads", done: false }
		],
		contributors: []
	}
];

const emptyDraft = {
	title: "",
	summary: "",
	scope: "tribe" as JobScope,
	priority: "medium" as JobPriority,
	reward: "",
	dueDate: "",
	tasks: "",
	delegateIds: [] as string[]
};

const emptyContributor = { name: "", contribution: "" };

function formatReward(value: number) {
	return value.toLocaleString();
}

function getProgress(tasks: JobTask[]) {
	if (!tasks.length) return 0;
	const doneCount = tasks.filter((task) => task.done).length;
	return Math.round((doneCount / tasks.length) * 100);
}

function buildId(prefix: string) {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return `${prefix}-${crypto.randomUUID()}`;
	}
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function memberLabel(id: string, members: { id: string; displayName: string }[] | undefined) {
	const match = members?.find((member) => member.id === id);
	return match?.displayName ?? id;
}

function normalizeJob(job: Job): Job {
	return {
		...job,
		ownerId: job.ownerId || "unknown",
		delegateIds: Array.isArray(job.delegateIds) ? job.delegateIds : [],
		tasks: Array.isArray(job.tasks) ? job.tasks : [],
		contributors: Array.isArray(job.contributors) ? job.contributors : []
	};
}

export function JobBoard() {
	const [jobs, setJobs] = useState<Job[]>(() => {
		if (typeof window === "undefined") return seedJobs;
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) return seedJobs;
		try {
			const parsed = JSON.parse(stored) as Job[];
			return Array.isArray(parsed) && parsed.length
				? parsed.map((job) => normalizeJob(job))
				: seedJobs;
		} catch {
			return seedJobs;
		}
	});
	const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id ?? null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [draft, setDraft] = useState(emptyDraft);
	const [contributorDraft, setContributorDraft] = useState(emptyContributor);
	const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
	const [search, setSearch] = useState("");
	const [delegatePickerOpen, setDelegatePickerOpen] = useState(false);
	const [delegateEditorOpen, setDelegateEditorOpen] = useState(false);

	const sessionQuery = useQuery({
		queryKey: ["module-session"],
		queryFn: getModuleSession
	});
	const member = sessionQuery.data?.member ?? null;
	const memberRoles = member?.roles ?? [];

	const membersQuery = useQuery({
		queryKey: ["module-members"],
		queryFn: listMembers,
		enabled: Boolean(member)
	});

	const accessListsQuery = useQuery({
		queryKey: ["module-access-lists"],
		queryFn: listAccessLists,
		enabled: Boolean(member)
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
	}, [jobs]);

	useEffect(() => {
		const needsNormalize = jobs.some(
			(job) =>
				!job.ownerId ||
				!Array.isArray(job.delegateIds) ||
				!Array.isArray(job.tasks) ||
				!Array.isArray(job.contributors)
		);
		if (!needsNormalize) return;
		setJobs((prev) => prev.map((job) => normalizeJob(job)));
	}, [jobs]);

	const selectedJob = useMemo(
		() => jobs.find((job) => job.id === selectedJobId) ?? null,
		[jobs, selectedJobId]
	);

	useEffect(() => {
		if (selectedJobId && selectedJob) return;
		setSelectedJobId(jobs[0]?.id ?? null);
	}, [jobs, selectedJob, selectedJobId]);

	useEffect(() => {
		setDelegateEditorOpen(false);
	}, [selectedJobId]);

	const filteredJobs = useMemo(() => {
		const query = search.trim().toLowerCase();
		return jobs.filter((job) => {
			const matchesStatus = statusFilter === "all" ? true : job.status === statusFilter;
			if (!matchesStatus) return false;
			if (!query) return true;
			return [job.title, job.summary].some((field) => field.toLowerCase().includes(query));
		});
	}, [jobs, search, statusFilter]);

	const activeJobs = jobs.filter((job) => job.status === "open" || job.status === "in_progress");
	const pendingRewards = jobs
		.filter((job) => job.status === "review")
		.reduce((sum, job) => sum + job.reward, 0);
	const largestRewardJob = jobs.reduce<Job | null>((current, job) => {
		if (!current) return job;
		return job.reward > current.reward ? job : current;
	}, null);

	const activePayoutJob = jobs.find((job) => job.status === "review") ?? null;

	const accessFor = (name: string) => {
		const list = accessListsQuery.data?.find((item) => item.name === name);
		if (!list) return [];
		return list.roles;
	};

	const canEditByAccessList = memberRoles.some((role) =>
		accessFor("update_job_postings").includes(role)
	);

	const canEditJob = (job: Job | null) => {
		if (!job || !member) return false;
		if (job.ownerId === member.id) return true;
		if (job.delegateIds.includes(member.id)) return true;
		if (canEditByAccessList) return true;
		return false;
	};

	function updateJob(id: string, updater: (job: Job) => Job) {
		setJobs((prev) =>
			prev.map((job) => {
				if (job.id !== id) return job;
				if (!canEditJob(job)) return job;
				return updater(job);
			})
		);
	}

	function handleCreateJob(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!member) {
			return;
		}
		const rewardValue = Number(draft.reward);
		if (!draft.title.trim() || !draft.summary.trim() || Number.isNaN(rewardValue)) {
			return;
		}
		const tasks = draft.tasks
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.map((label) => ({ id: buildId("task"), label, done: false }));
		const newJob: Job = {
			id: buildId("job"),
			title: draft.title.trim(),
			summary: draft.summary.trim(),
			scope: draft.scope,
			priority: draft.priority,
			status: "open",
			reward: rewardValue,
			dueDate: draft.dueDate,
			createdAt: new Date().toISOString().slice(0, 10),
			ownerId: member.id,
			delegateIds: draft.delegateIds,
			tasks,
			contributors: []
		};
		setJobs((prev) => [newJob, ...prev]);
		setSelectedJobId(newJob.id);
		setDraft(emptyDraft);
		setShowCreateModal(false);
		setDelegatePickerOpen(false);
	}

	function handleAddContributor(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedJob) return;
		if (!canEditJob(selectedJob)) return;
		const contributionValue = Number(contributorDraft.contribution);
		if (!contributorDraft.name.trim() || Number.isNaN(contributionValue)) {
			return;
		}
		const newContributor: JobContributor = {
			id: buildId("contrib"),
			name: contributorDraft.name.trim(),
			contribution: contributionValue
		};
		updateJob(selectedJob.id, (job) => ({
			...job,
			contributors: [...job.contributors, newContributor]
		}));
		setContributorDraft(emptyContributor);
	}

	const selectedTotalContribution = selectedJob
		? selectedJob.contributors.reduce((sum, item) => sum + item.contribution, 0)
		: 0;

	const selectedJobCanEdit = canEditJob(selectedJob);
	const selectedOwnerLabel =
		selectedJob && membersQuery.data
			? memberLabel(selectedJob.ownerId, membersQuery.data)
			: selectedJob?.ownerId ?? "-";

	return (
		<div className="stack">
			<div className="hero">
				<div className="hero-header">
					<div>
						<div className="eyebrow">Job Board</div>
						<h1>Open contracts</h1>
						<div className="small">
							Post tribe or alliance jobs and split rewards by contribution.
						</div>
					</div>
					<div className="hero-actions">
						<button
							type="button"
							onClick={() => {
								setShowCreateModal(true);
								setDelegatePickerOpen(false);
							}}
							disabled={!member}
						>
							Post a job
						</button>
						<button
							type="button"
							className="secondary"
							onClick={() => setSelectedJobId(activePayoutJob?.id ?? jobs[0]?.id ?? null)}
						>
							View active payouts
						</button>
					</div>
				</div>
				<div className="hero-grid">
					<div className="stat">
						<span className="stat-label">Active jobs</span>
						<span className="stat-value">{activeJobs.length}</span>
						<span className="small">
							{activeJobs.length ? "Contracts in progress." : "No live contracts yet."}
						</span>
					</div>
					<div className="stat">
						<span className="stat-label">Pending rewards</span>
						<span className="stat-value">{formatReward(pendingRewards)}</span>
						<span className="small">
							{pendingRewards ? "Awaiting payout approval." : "No payouts queued."}
						</span>
					</div>
					<div className="stat">
						<span className="stat-label">Largest scope</span>
						<span className="stat-value">{largestRewardJob?.scope ?? "-"}</span>
						<span className="small">
							{largestRewardJob
								? `${largestRewardJob.title} · ${formatReward(largestRewardJob.reward)}`
								: "Track alliance-wide goals."}
						</span>
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Job pipeline</div>
					<div className="small">
						Triage contracts, monitor progress, and keep rewards aligned with impact.
					</div>
					<div className="stack" style={{ marginTop: 12 }}>
						<label className="stack">
							<span className="small">Search jobs</span>
							<input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Title or objective"
							/>
						</label>
						<label className="stack">
							<span className="small">Status filter</span>
							<select
								value={statusFilter}
								onChange={(event) =>
									setStatusFilter(event.target.value as JobStatus | "all")
								}
							>
								<option value="all">All</option>
								<option value="open">Open</option>
								<option value="in_progress">In progress</option>
								<option value="review">Review</option>
								<option value="paid">Paid</option>
							</select>
						</label>
					</div>
					<div className="table table-4" style={{ marginTop: 16 }}>
						<div className="table-row table-header">
							<span>Job</span>
							<span>Status</span>
							<span>Reward</span>
							<span>Due</span>
						</div>
						{filteredJobs.map((job) => (
							<div className="table-row" key={job.id}>
								<div className="stack" style={{ gap: 4 }}>
									<span>{job.title}</span>
									<span className="small">
										{job.scope} · {job.priority} · {getProgress(job.tasks)}%
									</span>
									<div className="row" style={{ flexWrap: "wrap" }}>
										<span className="chip info">
											Owner: {memberLabel(job.ownerId, membersQuery.data)}
										</span>
										{job.delegateIds.length ? (
											job.delegateIds.map((delegateId) => (
												<span className="chip" key={delegateId}>
													{memberLabel(delegateId, membersQuery.data)}
												</span>
											))
										) : (
											<span className="chip">No delegates</span>
										)}
									</div>
									<button type="button" onClick={() => setSelectedJobId(job.id)}>
										View
									</button>
								</div>
								<span
									className={
										job.status === "paid"
											? "chip good"
											: job.status === "review"
												? "chip warn"
												: "chip"
									}
								>
									{job.status.replace("_", " ")}
								</span>
								<span>{formatReward(job.reward)}</span>
								<span>{job.dueDate || "-"}</span>
							</div>
						))}
						{filteredJobs.length === 0 ? (
							<div className="table-row">
								<span style={{ gridColumn: "1 / -1" }}>No jobs match that filter.</span>
							</div>
						) : null}
					</div>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Active job</div>
					{selectedJob ? (
						<div className="stack">
							<div>
								<h2>{selectedJob.title}</h2>
								<div className="small">{selectedJob.summary}</div>
							</div>
							{selectedJobCanEdit ? null : (
								<span className="small">
									You can view this job, but only the owner, delegates, or roles with
									access can edit it.
								</span>
							)}
							<div className="kv">
								<span>Status</span>
								<span>
									<select
										value={selectedJob.status}
										disabled={!selectedJobCanEdit}
										onChange={(event) =>
											updateJob(selectedJob.id, (job) => ({
												...job,
												status: event.target.value as JobStatus
											}))
										}
									>
										<option value="open">Open</option>
										<option value="in_progress">In progress</option>
										<option value="review">Review</option>
										<option value="paid">Paid</option>
									</select>
								</span>
								<span>Scope</span>
								<span>{selectedJob.scope}</span>
								<span>Priority</span>
								<span>{selectedJob.priority}</span>
								<span>Reward pool</span>
								<span>{formatReward(selectedJob.reward)}</span>
								<span>Due date</span>
								<span>{selectedJob.dueDate || "-"}</span>
								<span>Owner</span>
								<span>{selectedOwnerLabel}</span>
							</div>
							<div className="stack">
								<div style={{ fontWeight: 700 }}>Contacts</div>
								<div className="row" style={{ flexWrap: "wrap" }}>
									<span className="chip info">Owner: {selectedOwnerLabel}</span>
									{selectedJob.delegateIds.length ? (
										selectedJob.delegateIds.map((delegateId) => (
											<span className="chip" key={delegateId}>
												{memberLabel(delegateId, membersQuery.data)}
											</span>
										))
									) : (
										<span className="chip">No delegates</span>
									)}
								</div>
								<span className="small">
									These members can answer questions and approve updates.
								</span>
							</div>
							{membersQuery.data && selectedJobCanEdit ? (
								<div className="stack">
									<div style={{ fontWeight: 700 }}>Delegates</div>
								<div className="dropdown">
									<button
										className="dropdown-trigger"
										type="button"
										onClick={() => setDelegateEditorOpen((prev) => !prev)}
									>
										{selectedJob.delegateIds.length
											? `${selectedJob.delegateIds.length} selected`
											: "Select delegates"}
									</button>
									{delegateEditorOpen ? (
										<div className="dropdown-menu">
											{membersQuery.data.map((memberOption) => {
												const selected = selectedJob.delegateIds.includes(
													memberOption.id
													);
													return (
														<label key={memberOption.id} className="dropdown-item">
															<input
																type="checkbox"
																checked={selected}
																onChange={() =>
																	updateJob(selectedJob.id, (job) => {
																		const next = new Set(job.delegateIds);
																		if (next.has(memberOption.id)) {
																			next.delete(memberOption.id);
																		} else if (memberOption.id !== job.ownerId) {
																			next.add(memberOption.id);
																		}
																		return { ...job, delegateIds: Array.from(next) };
																	})
																}
															/>
															<span>{memberOption.displayName}</span>
														</label>
													);
												})}
											</div>
										) : null}
									</div>
									<span className="small">
										Delegates can update status, tasks, and payouts. The owner always retains
										access.
									</span>
								</div>
							) : null}
							<div className="stack">
								<div style={{ fontWeight: 700 }}>Tasks</div>
								{selectedJob.tasks.length ? (
									<div className="stack">
										{selectedJob.tasks.map((task) => (
											<label className="row" key={task.id}>
												<input
													type="checkbox"
													checked={task.done}
													disabled={!selectedJobCanEdit}
													onChange={() =>
														updateJob(selectedJob.id, (job) => ({
															...job,
															tasks: job.tasks.map((item) =>
																item.id === task.id
																	? { ...item, done: !item.done }
																	: item
															)
														}))
													}
												/>
												<span>{task.label}</span>
											</label>
										))}
									</div>
								) : (
									<span className="small">No tasks added yet.</span>
								)}
							</div>
						</div>
					) : (
						<span className="small">Select a job to review details.</span>
					)}
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Payouts & contributions</div>
					{selectedJob ? (
						<div className="stack">
							<div className="small">
								Reward splits update based on contribution totals.
							</div>
							<form className="row" onSubmit={handleAddContributor}>
								<input
									value={contributorDraft.name}
									onChange={(event) =>
										setContributorDraft((prev) => ({
											...prev,
											name: event.target.value
										}))
									}
									placeholder="Contributor"
									disabled={!selectedJobCanEdit}
								/>
								<input
									type="number"
									min={0}
									value={contributorDraft.contribution}
									onChange={(event) =>
										setContributorDraft((prev) => ({
											...prev,
											contribution: event.target.value
										}))
									}
									placeholder="Points"
									disabled={!selectedJobCanEdit}
								/>
								<button type="submit" disabled={!selectedJobCanEdit}>
									Add
								</button>
							</form>
							<div className="table table-3">
								<div className="table-row table-header">
									<span>Contributor</span>
									<span>Share</span>
									<span>Payout</span>
								</div>
								{selectedJob.contributors.map((contributor) => {
									const share = selectedTotalContribution
										? Math.round(
												(contributor.contribution / selectedTotalContribution) * 100
											)
										: 0;
									const payout = selectedTotalContribution
										? Math.round(
												(contributor.contribution / selectedTotalContribution) *
													selectedJob.reward
											)
										: 0;
									return (
										<div className="table-row" key={contributor.id}>
											<span>{contributor.name}</span>
											<span>{share}%</span>
											<span>{formatReward(payout)}</span>
										</div>
									);
								})}
								{selectedJob.contributors.length === 0 ? (
									<div className="table-row">
										<span style={{ gridColumn: "1 / -1" }}>
											Add contributors to calculate payouts.
										</span>
									</div>
								) : null}
							</div>
						</div>
					) : (
						<span className="small">Pick a job to manage payouts.</span>
					)}
				</div>
			</div>
			{showCreateModal ? (
				<div
					role="dialog"
					aria-modal="true"
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(5, 8, 14, 0.7)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: 20,
						zIndex: 50
					}}
					onClick={() => {
						setShowCreateModal(false);
						setDelegatePickerOpen(false);
					}}
				>
					<div
						className="card"
						style={{ maxWidth: 720, width: "100%", maxHeight: "85vh", overflowY: "auto" }}
						onClick={(event) => event.stopPropagation()}
					>
						<div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
							<div style={{ fontWeight: 700 }}>Post a new job</div>
							<button
								type="button"
								className="secondary"
								onClick={() => {
									setShowCreateModal(false);
									setDelegatePickerOpen(false);
								}}
							>
								Close
							</button>
						</div>
						<form className="stack" onSubmit={handleCreateJob}>
							<label className="stack">
								<span className="small">Job title</span>
								<input
									value={draft.title}
									onChange={(event) =>
										setDraft((prev) => ({ ...prev, title: event.target.value }))
									}
									placeholder="Convoy escort"
								/>
							</label>
							<label className="stack">
								<span className="small">Summary</span>
								<textarea
									rows={3}
									value={draft.summary}
									onChange={(event) =>
										setDraft((prev) => ({ ...prev, summary: event.target.value }))
									}
									placeholder="What needs to happen and where."
								/>
							</label>
							<div className="grid">
								<label className="stack">
									<span className="small">Scope</span>
									<select
										value={draft.scope}
										onChange={(event) =>
											setDraft((prev) => ({
												...prev,
												scope: event.target.value as JobScope
											}))
										}
									>
										<option value="tribe">Tribe</option>
										<option value="alliance">Alliance</option>
									</select>
								</label>
								<label className="stack">
									<span className="small">Priority</span>
									<select
										value={draft.priority}
										onChange={(event) =>
											setDraft((prev) => ({
												...prev,
												priority: event.target.value as JobPriority
											}))
										}
									>
										<option value="low">Low</option>
										<option value="medium">Medium</option>
										<option value="high">High</option>
									</select>
								</label>
							</div>
							<div className="grid">
								<label className="stack">
									<span className="small">Reward pool</span>
									<input
										type="number"
										min={0}
										value={draft.reward}
										onChange={(event) =>
											setDraft((prev) => ({ ...prev, reward: event.target.value }))
										}
										placeholder="800"
									/>
								</label>
								<label className="stack">
									<span className="small">Due date</span>
									<input
										type="date"
										value={draft.dueDate}
										onChange={(event) =>
											setDraft((prev) => ({ ...prev, dueDate: event.target.value }))
										}
									/>
								</label>
							</div>
							<label className="stack">
								<span className="small">Tasks (one per line)</span>
								<textarea
									rows={4}
									value={draft.tasks}
									onChange={(event) =>
										setDraft((prev) => ({ ...prev, tasks: event.target.value }))
									}
									placeholder={"Scout route\nGather materials\nRun escort"}
								/>
							</label>
							<label className="stack">
								<span className="small">Delegates</span>
								<div className="dropdown">
									<button
										className="dropdown-trigger"
										type="button"
										onClick={() => setDelegatePickerOpen((prev) => !prev)}
									>
										{draft.delegateIds.length
											? `${draft.delegateIds.length} selected`
											: "Select delegates"}
									</button>
									{delegatePickerOpen ? (
										<div className="dropdown-menu">
											{membersQuery.data?.map((memberOption) => {
												const selected = draft.delegateIds.includes(memberOption.id);
												return (
													<label key={memberOption.id} className="dropdown-item">
														<input
															type="checkbox"
															checked={selected}
															onChange={() =>
																setDraft((prev) => {
																	const next = new Set(prev.delegateIds);
																	if (next.has(memberOption.id)) {
																		next.delete(memberOption.id);
																	} else if (member?.id !== memberOption.id) {
																		next.add(memberOption.id);
																	}
																	return { ...prev, delegateIds: Array.from(next) };
																})
															}
														/>
														<span>{memberOption.displayName}</span>
													</label>
												);
											})}
											{(membersQuery.data ?? []).length === 0 ? (
												<span className="small">No members available.</span>
											) : null}
										</div>
									) : null}
								</div>
							</label>
							<div className="row">
								<button type="submit" disabled={!member}>
									Post job
								</button>
								<button
									type="button"
									className="secondary"
									onClick={() => setDraft(emptyDraft)}
								>
									Reset
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</div>
	);
}
