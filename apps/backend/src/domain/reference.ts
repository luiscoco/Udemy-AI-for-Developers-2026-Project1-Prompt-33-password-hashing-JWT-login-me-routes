const REFERENCE_PATTERN = /^WO-(\d{4})-(\d{4})$/;

export function nextWorkOrderReference(existingReferences: string[], year: number): string {
  const sequences = existingReferences
    .map((reference) => REFERENCE_PATTERN.exec(reference))
    .filter((match): match is RegExpExecArray => match !== null)
    .filter((match) => Number(match[1]) === year)
    .map((match) => Number(match[2]));

  const nextSequence = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;

  return `WO-${year}-${String(nextSequence).padStart(4, "0")}`;
}
