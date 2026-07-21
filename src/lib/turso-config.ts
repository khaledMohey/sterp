export function cleanEnv(value: string | undefined) {
  return (value || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

export function resolveTursoConfig() {
  const rawTurso = cleanEnv(process.env.TURSO_DATABASE_URL);
  const rawDb = cleanEnv(process.env.DATABASE_URL);
  const authToken = cleanEnv(process.env.TURSO_AUTH_TOKEN);

  let url = "";
  for (const candidate of [rawTurso, rawDb]) {
    if (!candidate || candidate.startsWith("file:")) continue;

    if (candidate.startsWith("libsql://") || candidate.startsWith("https://")) {
      url = candidate;
      break;
    }

    if (candidate.includes(".turso.io")) {
      url = `libsql://${candidate.replace(/^\/\//, "")}`;
      break;
    }
  }

  return {
    url,
    authToken,
    rawTurso,
    rawDb,
    usingAdapter: Boolean(url && authToken),
  };
}
