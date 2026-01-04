export function ErrorView(props: { title?: string; error: unknown }) {
	const message =
		props.error instanceof Error ? props.error.message : typeof props.error === "string" ? props.error : "Unknown error";

	return (
		<div className="card">
			<div style={{ fontWeight: 700, marginBottom: 8 }}>{props.title ?? "Error"}</div>
			<div className="small">{message}</div>
		</div>
	);
}
