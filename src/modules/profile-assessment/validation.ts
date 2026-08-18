export function normalizeDisplayName(
  value: FormDataEntryValue | null,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length === 0 ? null : normalized;
}

export function displayNameError(displayName: string | null): string | null {
  if (displayName && displayName.length > 80) {
    return "Display name must be 80 characters or fewer.";
  }

  return null;
}

export function parseRowVersion(
  value: FormDataEntryValue | null,
): number | null | undefined {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    return undefined;
  }

  return parsed;
}
