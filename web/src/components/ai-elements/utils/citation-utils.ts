/**
 * Format a citation label from source URLs.
 * Displays the hostname of the first source, and "+N" if there are more.
 * Returns "unknown" if no sources are provided.
 */
export function formatCitationLabel(sources: string[]): string {
  const [firstSource] = sources;
  if (firstSource === undefined) {
    return "unknown";
  }
  const hostname = new URL(firstSource).hostname;
  if (sources.length > 1) {
    return `${hostname} +${sources.length - 1}`;
  }
  return hostname;
}
