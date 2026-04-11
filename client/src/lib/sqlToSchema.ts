/*
Style reminder — Cartographic Workshop:
Warm drafting-table utility, precise linework, scholarly hierarchy, and clear technical annotation.
Keep parsing outputs structured, legible, and suitable for an editorial technical interface.
*/

export type SqlColumn = {
  name: string;
  rawType: string;
  normalizedType: string;
  notNull: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    column: string;
  };
};

export type SqlForeignKey = {
  column: string;
  referencesTable: string;
  referencesColumn: string;
};

export type SqlTable = {
  name: string;
  columns: SqlColumn[];
  primaryKeys: string[];
  foreignKeys: SqlForeignKey[];
  uniqueColumns: string[];
};

export type ParsedSchema = {
  tables: SqlTable[];
  warnings: string[];
  mermaid: string;
  relationalSchema: string;
  sourceDialectHint: string;
};

export const SAMPLE_SQL = `-- phpMyAdmin SQL Dump
CREATE DATABASE IF NOT EXISTS \`teams_bot\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE \`teams_bot\`;

CREATE TABLE \`batches\` (
  \`batch_id\` int(11) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`status\` enum('pending','complete') NOT NULL DEFAULT 'pending',
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`added_by\` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE \`batch_students\` (
  \`student_record_id\` int(11) NOT NULL,
  \`batch_id\` int(11) NOT NULL,
  \`student_id\` varchar(50) NOT NULL,
  \`student_email\` varchar(255) NOT NULL,
  \`student_name\` varchar(255) NOT NULL,
  \`class\` varchar(50) DEFAULT NULL,
  \`class_no\` int(11) DEFAULT NULL,
  \`message_id\` varchar(255) DEFAULT NULL,
  \`chat_id\` varchar(255) DEFAULT NULL,
  \`reaction_status\` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE \`student_marks\` (
  \`mark_id\` int(11) NOT NULL,
  \`student_record_id\` int(11) NOT NULL,
  \`assignment_name\` varchar(255) NOT NULL,
  \`student_score\` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE \`batches\`
  ADD PRIMARY KEY (\`batch_id\`);

ALTER TABLE \`batch_students\`
  ADD PRIMARY KEY (\`student_record_id\`),
  ADD KEY \`batch_id\` (\`batch_id\`);

ALTER TABLE \`student_marks\`
  ADD PRIMARY KEY (\`mark_id\`),
  ADD KEY \`student_record_id\` (\`student_record_id\`);

ALTER TABLE \`batch_students\`
  ADD CONSTRAINT \`batch_students_ibfk_1\` FOREIGN KEY (\`batch_id\`) REFERENCES \`batches\` (\`batch_id\`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE \`student_marks\`
  ADD CONSTRAINT \`student_marks_ibfk_1\` FOREIGN KEY (\`student_record_id\`) REFERENCES \`batch_students\` (\`student_record_id\`) ON DELETE CASCADE ON UPDATE CASCADE;`;

const COLUMN_CONSTRAINT_KEYWORDS = [
  "not",
  "null",
  "default",
  "primary",
  "key",
  "unique",
  "references",
  "constraint",
  "check",
  "auto_increment",
  "comment",
  "collate",
  "character",
  "generated",
  "on",
  "unsigned",
  "zerofill",
] as const;

function cleanIdentifier(value: string) {
  return value.trim().replace(/^[`"'\[]+|[`"'\]]+$/g, "");
}

function splitTopLevel(input: string, separator: string) {
  const result: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const previous = input[i - 1];

    if ((char === "'" || char === '"') && previous !== "\\") {
      quote = quote === char ? null : quote ? quote : char;
      current += char;
      continue;
    }

    if (!quote) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (char === separator && depth === 0) {
        if (current.trim()) result.push(current.trim());
        current = "";
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

function splitStatements(input: string) {
  return splitTopLevel(input, ";");
}

function removeComments(sql: string) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .replace(/#.*$/gm, " ");
}

function normalizeSql(sql: string) {
  return removeComments(sql)
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\bSTART\s+TRANSACTION\b/gi, "")
    .replace(/\bCOMMIT\b/gi, "")
    .replace(/\bSET\s+SQL_MODE\b[^;]*/gi, "")
    .replace(/\bSET\s+time_zone\b[^;]*/gi, "")
    .trim();
}

function hintDialect(sql: string) {
  if (/ENGINE\s*=|CHARSET=|COLLATE=|AUTO_INCREMENT|\bENUM\s*\(/i.test(sql)) {
    return "MySQL / MariaDB style dump";
  }
  if (/sqlite_master|AUTOINCREMENT|WITHOUT ROWID/i.test(sql)) {
    return "SQLite style schema";
  }
  return "Generic SQL schema";
}

function findMatchingParen(input: string, openIndex: number) {
  let depth = 0;
  let quote: string | null = null;

  for (let i = openIndex; i < input.length; i += 1) {
    const char = input[i];
    const previous = input[i - 1];

    if ((char === "'" || char === '"') && previous !== "\\") {
      quote = quote === char ? null : quote ? quote : char;
    }

    if (!quote) {
      if (char === "(") depth += 1;
      if (char === ")") {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
  }

  return -1;
}

function extractType(definition: string) {
  const trimmed = definition.trim();
  const firstSpace = trimmed.search(/\s/);
  if (firstSpace === -1) return trimmed;

  let type = "";
  let depth = 0;
  const rest = trimmed.slice(firstSpace).trim();
  const tokens = rest.split(/\s+/);

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (depth === 0 && COLUMN_CONSTRAINT_KEYWORDS.includes(lower as (typeof COLUMN_CONSTRAINT_KEYWORDS)[number])) {
      break;
    }
    type += `${type ? " " : ""}${token}`;
    depth += (token.match(/\(/g) || []).length;
    depth -= (token.match(/\)/g) || []).length;
  }

  return type.trim();
}

function normalizeType(rawType: string) {
  const lower = rawType.toLowerCase().trim();
  if (!lower) return "TEXT";
  if (lower.startsWith("int") || lower.startsWith("bigint") || lower.startsWith("smallint")) return "INTEGER";
  if (lower.startsWith("decimal") || lower.startsWith("numeric") || lower.startsWith("float") || lower.startsWith("double")) return "NUMERIC";
  if (lower.startsWith("varchar") || lower.startsWith("char") || lower.startsWith("text") || lower.startsWith("enum")) return "TEXT";
  if (lower.startsWith("date") || lower.startsWith("time") || lower.startsWith("timestamp") || lower.startsWith("datetime")) return "DATETIME";
  if (lower.startsWith("bool") || lower.startsWith("tinyint(1)")) return "BOOLEAN";
  return rawType.replace(/\s+/g, "_").toUpperCase();
}

function parseColumn(definition: string): SqlColumn {
  const trimmed = definition.trim();
  const match = trimmed.match(/^[`"\[]?([A-Za-z0-9_]+)[`"\]]?\s+/);
  const name = cleanIdentifier(match?.[1] || trimmed.split(/\s+/)[0]);
  const rawType = extractType(trimmed);
  const lower = trimmed.toLowerCase();
  const referenceMatch = trimmed.match(/references\s+[`"\[]?([A-Za-z0-9_]+)[`"\]]?\s*\(([^)]+)\)/i);

  return {
    name,
    rawType,
    normalizedType: normalizeType(rawType),
    notNull: /not\s+null/i.test(lower),
    isPrimaryKey: /primary\s+key/i.test(lower),
    isForeignKey: Boolean(referenceMatch),
    isUnique: /\bunique\b/i.test(lower),
    defaultValue: trimmed.match(/default\s+([^\s,]+)/i)?.[1],
    references: referenceMatch
      ? {
          table: cleanIdentifier(referenceMatch[1]),
          column: cleanIdentifier(referenceMatch[2].split(",")[0]),
        }
      : undefined,
  };
}

function parseColumnList(input: string) {
  return splitTopLevel(input, ",").map((entry) => cleanIdentifier(entry));
}

function applyPrimaryKeys(table: SqlTable, primaryKeys: string[]) {
  if (!primaryKeys.length) return;
  const merged = new Set([...table.primaryKeys, ...primaryKeys]);
  table.primaryKeys = Array.from(merged);
  table.columns = table.columns.map((column) => ({
    ...column,
    isPrimaryKey: merged.has(column.name),
  }));
}

function applyUniqueColumns(table: SqlTable, uniqueColumns: string[]) {
  if (!uniqueColumns.length) return;
  const merged = new Set([...table.uniqueColumns, ...uniqueColumns]);
  table.uniqueColumns = Array.from(merged);
  table.columns = table.columns.map((column) => ({
    ...column,
    isUnique: column.isUnique || merged.has(column.name),
  }));
}

function applyForeignKeys(table: SqlTable, foreignKeys: SqlForeignKey[]) {
  if (!foreignKeys.length) return;

  const existing = new Set(table.foreignKeys.map((fk) => `${fk.column}:${fk.referencesTable}:${fk.referencesColumn}`));
  for (const fk of foreignKeys) {
    const key = `${fk.column}:${fk.referencesTable}:${fk.referencesColumn}`;
    if (!existing.has(key)) {
      table.foreignKeys.push(fk);
      existing.add(key);
    }
  }

  table.columns = table.columns.map((column) => {
    const found = table.foreignKeys.find((fk) => fk.column === column.name);
    return found
      ? {
          ...column,
          isForeignKey: true,
          references: {
            table: found.referencesTable,
            column: found.referencesColumn,
          },
        }
      : column;
  });
}

function parseCreateTableStatement(statement: string, warnings: string[]) {
  const tableMatch = statement.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?[`"\[]?([A-Za-z0-9_]+)[`"\]]?/i);
  if (!tableMatch) return null;

  const tableName = cleanIdentifier(tableMatch[1]);
  const openIndex = statement.indexOf("(", tableMatch.index ?? 0);
  const closeIndex = openIndex >= 0 ? findMatchingParen(statement, openIndex) : -1;

  if (openIndex === -1 || closeIndex === -1) {
    warnings.push(`Could not fully parse CREATE TABLE ${tableName}.`);
    return null;
  }

  const body = statement.slice(openIndex + 1, closeIndex);
  const parts = splitTopLevel(body, ",");

  const table: SqlTable = {
    name: tableName,
    columns: [],
    primaryKeys: [],
    foreignKeys: [],
    uniqueColumns: [],
  };

  const pendingPrimaryKeys: string[] = [];
  const pendingUniqueColumns: string[] = [];
  const pendingForeignKeys: SqlForeignKey[] = [];

  for (const part of parts) {
    const lower = part.trim().toLowerCase();

    if (/^(primary\s+key|constraint\s+[`"\[]?[\w-]+[`"\]]?\s+primary\s+key)/i.test(lower)) {
      const match = part.match(/primary\s+key\s*\(([^)]+)\)/i);
      if (match) pendingPrimaryKeys.push(...parseColumnList(match[1]));
      continue;
    }

    if (/^(unique\s+key|unique\s+index|unique|constraint\s+[`"\[]?[\w-]+[`"\]]?\s+unique)/i.test(lower)) {
      const match = part.match(/\(([^)]+)\)/);
      if (match) pendingUniqueColumns.push(...parseColumnList(match[1]));
      continue;
    }

    if (/^(constraint\s+[`"\[]?[\w-]+[`"\]]?\s+foreign\s+key|foreign\s+key)/i.test(lower)) {
      const match = part.match(/foreign\s+key\s*\(([^)]+)\)\s+references\s+[`"\[]?([A-Za-z0-9_]+)[`"\]]?\s*\(([^)]+)\)/i);
      if (match) {
        const columns = parseColumnList(match[1]);
        const refColumns = parseColumnList(match[3]);
        columns.forEach((column, index) => {
          pendingForeignKeys.push({
            column,
            referencesTable: cleanIdentifier(match[2]),
            referencesColumn: refColumns[index] || refColumns[0],
          });
        });
      }
      continue;
    }

    if (/^(key|index)/i.test(lower)) {
      continue;
    }

    table.columns.push(parseColumn(part));
  }

  applyPrimaryKeys(table, pendingPrimaryKeys);
  applyUniqueColumns(table, pendingUniqueColumns);
  applyForeignKeys(table, pendingForeignKeys);

  for (const column of table.columns) {
    if (column.isPrimaryKey && !table.primaryKeys.includes(column.name)) table.primaryKeys.push(column.name);
    if (column.isUnique && !table.uniqueColumns.includes(column.name)) table.uniqueColumns.push(column.name);
    if (column.references) {
      table.foreignKeys.push({
        column: column.name,
        referencesTable: column.references.table,
        referencesColumn: column.references.column,
      });
    }
  }

  table.primaryKeys = Array.from(new Set(table.primaryKeys));
  table.uniqueColumns = Array.from(new Set(table.uniqueColumns));
  applyForeignKeys(table, table.foreignKeys);

  return table;
}

function parseAlterTableStatement(statement: string, tables: Map<string, SqlTable>, warnings: string[]) {
  const match = statement.match(/alter\s+table\s+[`"\[]?([A-Za-z0-9_]+)[`"\]]?\s+([\s\S]+)/i);
  if (!match) return;

  const tableName = cleanIdentifier(match[1]);
  const table = tables.get(tableName);

  if (!table) {
    warnings.push(`ALTER TABLE ${tableName} was found before its CREATE TABLE definition.`);
    return;
  }

  const clauses = splitTopLevel(match[2], ",");
  const primaryKeys: string[] = [];
  const uniqueColumns: string[] = [];
  const foreignKeys: SqlForeignKey[] = [];

  for (const clause of clauses) {
    if (/add\s+primary\s+key/i.test(clause)) {
      const pkMatch = clause.match(/primary\s+key\s*\(([^)]+)\)/i);
      if (pkMatch) primaryKeys.push(...parseColumnList(pkMatch[1]));
      continue;
    }

    if (/add\s+(?:constraint\s+[`"\[]?[\w-]+[`"\]]?\s+)?foreign\s+key/i.test(clause)) {
      const fkMatch = clause.match(/foreign\s+key\s*\(([^)]+)\)\s+references\s+[`"\[]?([A-Za-z0-9_]+)[`"\]]?\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const columns = parseColumnList(fkMatch[1]);
        const refColumns = parseColumnList(fkMatch[3]);
        columns.forEach((column, index) => {
          foreignKeys.push({
            column,
            referencesTable: cleanIdentifier(fkMatch[2]),
            referencesColumn: refColumns[index] || refColumns[0],
          });
        });
      }
      continue;
    }

    if (/add\s+unique/i.test(clause)) {
      const uniqueMatch = clause.match(/\(([^)]+)\)/);
      if (uniqueMatch) uniqueColumns.push(...parseColumnList(uniqueMatch[1]));
    }
  }

  applyPrimaryKeys(table, primaryKeys);
  applyUniqueColumns(table, uniqueColumns);
  applyForeignKeys(table, foreignKeys);
}

function buildMermaid(tables: SqlTable[]) {
  const lines: string[] = ["erDiagram"];

  for (const table of tables) {
    lines.push(`  ${table.name} {`);
    for (const column of table.columns) {
      const flags = [
        column.isPrimaryKey ? "PK" : "",
        column.isForeignKey ? "FK" : "",
        column.isUnique && !column.isPrimaryKey ? "UQ" : "",
        column.notNull && !column.isPrimaryKey ? "NN" : "",
      ]
        .filter(Boolean)
        .join(", ");

      lines.push(`    ${column.normalizedType} ${column.name}${flags ? ` \"${flags}\"` : ""}`);
    }
    lines.push("  }");
  }

  for (const table of tables) {
    for (const foreignKey of table.foreignKeys) {
      lines.push(`  ${foreignKey.referencesTable} ||--o{ ${table.name} : \"${foreignKey.column}\"`);
    }
  }

  return lines.join("\n");
}

function buildRelationalSchema(tables: SqlTable[]) {
  return tables
    .map((table) => {
      const header = `${table.name} (${table.columns.map((column) => column.name).join(", ")})`;
      const pk = table.primaryKeys.length ? `  Primary key: ${table.primaryKeys.join(" + ")}` : "";
      const fk = table.foreignKeys.length
        ? `  Foreign key:\n${table.foreignKeys
            .map((foreignKey) => `  - ${foreignKey.column} references ${foreignKey.referencesColumn} of ${foreignKey.referencesTable}`)
            .join("\n")}`
        : "";
      const unique = table.uniqueColumns.length ? `  Unique: ${table.uniqueColumns.join(", ")}` : "";
      return [header, pk, fk, unique].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

export function parseSqlToSchema(rawSql: string): ParsedSchema {
  const normalized = normalizeSql(rawSql);
  const statements = splitStatements(normalized).map((statement) => statement.trim()).filter(Boolean);
  const warnings: string[] = [];
  const tables = new Map<string, SqlTable>();

  for (const statement of statements) {
    if (/^create\s+table/i.test(statement)) {
      const table = parseCreateTableStatement(statement, warnings);
      if (table) tables.set(table.name, table);
      continue;
    }

    if (/^alter\s+table/i.test(statement)) {
      parseAlterTableStatement(statement, tables, warnings);
      continue;
    }
  }

  if (!tables.size) {
    warnings.push("No CREATE TABLE statements were detected. This tool currently focuses on schema SQL files.");
  }

  const orderedTables = Array.from(tables.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    tables: orderedTables,
    warnings,
    mermaid: buildMermaid(orderedTables),
    relationalSchema: buildRelationalSchema(orderedTables),
    sourceDialectHint: hintDialect(rawSql),
  };
}
