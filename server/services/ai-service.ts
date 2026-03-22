// server/services/ai-service.ts
// CENTRAL AI SERVICE — Every AI feature calls this, never OpenAI directly
// OpenAI ONLY via Replit integration

import OpenAI from "openai";

// ============================================================
// TYPES
// ============================================================
export type AiModel = "gpt-4o" | "gpt-4o-mini";
export type AiProvider = "openai";

export interface AiGenerateOptions {
  model?: AiModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface AiStreamChunk {
  text: string;
  done: boolean;
}

export interface AiEmbeddingResult {
  embedding: number[];
  tokensUsed: number;
}

interface ModelConfig {
  provider: AiProvider;
  modelId: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

// ============================================================
// MODEL REGISTRY
// ============================================================
const MODEL_REGISTRY: Record<AiModel, ModelConfig> = {
  "gpt-4o": {
    provider: "openai",
    modelId: "gpt-4o",
    maxTokens: 128000,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  "gpt-4o-mini": {
    provider: "openai",
    modelId: "gpt-4o-mini",
    maxTokens: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
};

// Auto-routing: best model per task type
const AUTO_MODEL_MAP: Record<string, AiModel> = {
  writing: "gpt-4o",
  code: "gpt-4o",
  analysis: "gpt-4o",
  summary: "gpt-4o-mini",
  quick: "gpt-4o-mini",
  creative: "gpt-4o",
  translation: "gpt-4o",
};

// ============================================================
// AI SERVICE CLASS
// ============================================================
class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }

  resolveModel(taskType?: string, requestedModel?: AiModel): AiModel {
    if (requestedModel) return requestedModel;
    if (taskType && AUTO_MODEL_MAP[taskType]) return AUTO_MODEL_MAP[taskType];
    return "gpt-4o-mini";
  }

  async generateText(
    userPrompt: string,
    options: AiGenerateOptions = {}
  ): Promise<{ text: string; tokensUsed: { input: number; output: number } }> {
    const model = options.model || "gpt-4o-mini";
    const config = MODEL_REGISTRY[model];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    const response = await this.openai.chat.completions.create({
      model: config.modelId,
      messages,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
    });

    const text = response.choices[0]?.message?.content || "";
    const usage = response.usage;

    return {
      text,
      tokensUsed: {
        input: usage?.prompt_tokens || 0,
        output: usage?.completion_tokens || 0,
      },
    };
  }

  async *generateStream(
    userPrompt: string,
    options: AiGenerateOptions = {}
  ): AsyncGenerator<AiStreamChunk> {
    const model = options.model || "gpt-4o-mini";
    const config = MODEL_REGISTRY[model];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    const stream = await this.openai.chat.completions.create({
      model: config.modelId,
      messages,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      const done = chunk.choices[0]?.finish_reason === "stop";
      if (text || done) {
        yield { text, done };
      }
    }
  }

  async generateWithTools(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.ChatCompletionTool[],
    options: AiGenerateOptions = {}
  ): Promise<OpenAI.Chat.ChatCompletionMessage> {
    const model = options.model || "gpt-4o";
    const config = MODEL_REGISTRY[model];

    const response = await this.openai.chat.completions.create({
      model: config.modelId,
      messages,
      tools,
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature ?? 0.5,
    });

    return response.choices[0].message;
  }

  async generateEmbedding(text: string): Promise<AiEmbeddingResult> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536,
    });

    return {
      embedding: response.data[0].embedding,
      tokensUsed: response.usage.total_tokens,
    };
  }

  async generateEmbeddingBatch(texts: string[]): Promise<AiEmbeddingResult[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 1536,
    });

    return response.data.map((item) => ({
      embedding: item.embedding,
      tokensUsed: Math.ceil(response.usage.total_tokens / texts.length),
    }));
  }

  async generateJSON<T>(
    userPrompt: string,
    options: AiGenerateOptions & { jsonSchema?: string } = {}
  ): Promise<T> {
    const systemPrompt = `${options.systemPrompt || ""}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no backticks, no explanation. Just the JSON object.`;

    const { text } = await this.generateText(userPrompt, {
      ...options,
      systemPrompt,
      temperature: options.temperature ?? 0.3,
    });

    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  }
}

// Singleton export
export const aiService = new AiService();
