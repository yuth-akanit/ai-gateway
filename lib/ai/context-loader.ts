import { supabaseAdmin } from "../supabase/admin";

export type KnowledgeDocRow = {
  id?: string;
  doc_type: string | null;
  title: string | null;
  source: string | null;
  content_md: string | null;
  tags: string[] | null;
  updated_at?: string | null;
};

export type RetrievedContextItem = {
  kind: 'knowledge_doc';
  title: string;
  docType: string;
  source: string;
  tags: string[];
  content: string;
  score: number;
};

export type LoadedContextResult = {
  items: RetrievedContextItem[];
  contextBlock: string;
  debug: {
    query: string;
    total_fetched: number;
    total_selected: number;
    query_tokens: string[];
    selected_docs: {
      title: string;
      doc_type: string;
      score: number;
    }[];
  };
};

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'in', 'on', 'at', 'by', 'is',
  'are', 'be', 'with', 'from', 'that', 'this', 'it', 'as', 'was', 'were',
  'คือ', 'และ', 'ของ', 'ที่', 'ใน', 'ให้', 'จาก', 'กับ', 'ว่า', 'ได้', 'ไป', 'มี',
  'งาน', 'ระบบ', 'ข้อมูล', 'อะไร', 'อย่าง', 'ตอนนี้', 'สรุป'
]);

function normalizeText(input: string | null | undefined): string {
  return (input ?? '')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars).trimEnd() + '\n...[truncated]';
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function scoreDoc(row: KnowledgeDocRow, queryTokens: string[], priorityTerms: string[]): number {
  const title = normalizeText(row.title).toLowerCase();
  const docType = normalizeText(row.doc_type).toLowerCase();
  const source = normalizeText(row.source).toLowerCase();
  const tags = (row.tags ?? []).map((t) => t.toLowerCase());
  const content = normalizeText(row.content_md).toLowerCase();

  let score = 0;

  // 1. Score based on generic query tokens
  for (const token of queryTokens) {
    if (title.includes(token)) score += 12;
    if (docType.includes(token)) score += 8;
    if (tags.some((t) => t.includes(token))) score += 10;
    if (source.includes(token)) score += 4;
    if (content.includes(token)) score += 2;
  }

  // 2. Extra weight for high-priority terms (project_codes, workflow_codes)
  for (const term of priorityTerms) {
      if (!term) continue;
      const t = term.toLowerCase();
      if (tags.some(tag => tag.toLowerCase() === t)) score += 20;
      if (title.includes(t)) score += 15;
  }

  // 3. Preference for structural docs
  if (docType === 'architecture') score += 5;
  if (docType === 'roadmap') score += 3;
  if (docType === 'overview') score += 3;

  return score;
}

function toRetrievedItem(
  row: KnowledgeDocRow,
  score: number,
  maxCharsPerDoc: number
): RetrievedContextItem {
  return {
    kind: 'knowledge_doc',
    title: normalizeText(row.title) || 'Untitled',
    docType: normalizeText(row.doc_type) || 'unknown',
    source: normalizeText(row.source) || 'unknown',
    tags: row.tags ?? [],
    content: truncate(normalizeText(row.content_md), maxCharsPerDoc),
    score,
  };
}

function renderContextBlock(items: RetrievedContextItem[], maxTotalChars: number): string {
  if (!items.length) {
    return [
      '## Retrieved Context',
      'No relevant knowledge_docs were found.',
    ].join('\n');
  }

  const parts: string[] = ['## Retrieved Context'];
  let used = parts.join('\n').length;

  for (const [idx, item] of items.entries()) {
    const block = [
      `### Context ${idx + 1}`,
      `title: ${item.title}`,
      `doc_type: ${item.docType}`,
      `source: ${item.source}`,
      `tags: ${item.tags.join(', ') || '-'}`,
      'content:',
      item.content,
    ].join('\n');

    if (used + block.length + 2 > maxTotalChars) break;

    parts.push(block);
    used += block.length + 2;
  }

  return parts.join('\n\n');
}

export type LoadAiContextParams = {
  mode: string;
  taskType: string;
  input: any;
  context?: any;
  maxDocs?: number;
  maxCharsPerDoc?: number;
  maxTotalChars?: number;
};

/**
 * Robust context loader for Project Q&A and Build tasks.
 * Combines tags, title, and content searching with priority scoring.
 */
export async function loadAiContext({
  mode,
  taskType,
  input,
  context,
  maxDocs = 4,
  maxCharsPerDoc = 2500,
  maxTotalChars = 9000,
}: LoadAiContextParams): Promise<LoadedContextResult> {
  const question = input?.question || input?.text || '';
  const normalizedQuestion = normalizeText(question);
  const queryTokens = tokenize(normalizedQuestion);
  
  // Extract explicit codes to prioritize
  const projectCode = context?.registry?.project_codes?.[0] || '';
  const workflowKey = context?.registry?.workflow_codes?.[0] || '';
  const priorityTerms = [projectCode, workflowKey, taskType].filter(Boolean);

  // Fetch from knowledge_docs
  // V1: fetch a reasonable set and score in-memory (good for < 1000 docs)
  const { data, error } = await supabaseAdmin
    .from('knowledge_docs')
    .select('id, doc_type, title, source, content_md, tags, updated_at')
    .limit(50);

  if (error) {
    console.error(`[CONTEXT_LOADER] KNOWLEDGE_DOCS_LOAD_FAILED: ${error.message}`);
    return {
        items: [],
        contextBlock: "Error loading context from database.",
        debug: { 
            query: normalizedQuestion, 
            query_tokens: queryTokens,
            total_fetched: 0, 
            total_selected: 0,
            selected_docs: []
        }
    };
  }

  const rows = data ?? [];

  const ranked = rows
    .map((row) => ({
      row,
      score: scoreDoc(row as KnowledgeDocRow, queryTokens, priorityTerms),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDocs)
    .map((x) => toRetrievedItem(x.row as KnowledgeDocRow, x.score, maxCharsPerDoc));

  // If no hits by scoring, but we have some docs, maybe just show the most recent ones 
  // ONLY if this is a general "overview" request. 
  // For precise Q&A, we might prefer saying "not found".
  // Let's stick to the scoring for now.
  
  const contextBlock = renderContextBlock(ranked, maxTotalChars);

  return {
    items: ranked,
    contextBlock,
    debug: {
      query: normalizedQuestion,
      total_fetched: rows.length,
      total_selected: ranked.length,
      query_tokens: queryTokens,
      selected_docs: ranked.map(d => ({
          title: d.title,
          doc_type: d.docType,
          score: d.score
      }))
    },
  };
}
