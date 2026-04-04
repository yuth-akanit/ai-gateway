export type ProviderParams = {
    provider: string;
    model: string;
    systemPrompt: string;
    developerPrompt?: string;
    userInput: string | Record<string, any>;
    requireJson?: boolean;
    temperature?: number;
    maxTokens?: number;
  };
  
  export type ProviderResult = {
    provider: string;
    model: string;
    success: boolean;
    rawText?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    errorCode?: string;
    errorMessage?: string;
  };
  
  export async function executeOpenAI(params: ProviderParams): Promise<ProviderResult> {
    const start = Date.now();
    const apiKey = process.env.GATEWAY_OPENAI_KEY;
  
    if (!apiKey) {
      console.error("[GATEWAY] OpenAI API Key is missing. Check .env.local");
      return {
        provider: "openai",
        model: params.model,
        success: false,
        errorCode: "MISSING_API_KEY",
        errorMessage: "OpenAI API Key is not configured."
      };
    }

    // Debug ONLY first and last 4 chars for security
    console.log(`[GATEWAY] Using API Key: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)} (Length: ${apiKey.length})`);
  
    try {
      const messages: any[] = [
        { role: "system", content: params.systemPrompt }
      ];
  
      if (params.developerPrompt) {
        messages.push({ role: "developer", content: params.developerPrompt });
      }
  
      const contentStr = typeof params.userInput === "string" 
        ? params.userInput 
        : JSON.stringify(params.userInput);
  
      messages.push({ role: "user", content: contentStr });
  
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000,
          response_format: params.requireJson ? { type: "json_object" } : undefined,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        return {
          provider: "openai",
          model: params.model,
          success: false,
          errorCode: data.error?.type || "API_ERROR",
          errorMessage: data.error?.message || "OpenAI API returned an error.",
          latencyMs: Date.now() - start,
        };
      }
  
      return {
        provider: "openai",
        model: params.model,
        success: true,
        rawText: data.choices[0].message.content,
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return {
        provider: "openai",
        model: params.model,
        success: false,
        errorCode: "FETCH_ERROR",
        errorMessage: error.message,
        latencyMs: Date.now() - start,
      };
    }
  }
