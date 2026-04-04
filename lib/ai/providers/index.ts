import { executeOpenAI, ProviderParams, ProviderResult } from "./openai";

export async function executeProvider(params: any): Promise<ProviderResult> {
  const provider = params.provider.toLowerCase();

  switch (provider) {
    case "openai":
      return executeOpenAI(params as ProviderParams);
    default:
      // Fallback for demo or unrecognized
      return {
        provider: params.provider,
        model: params.model,
        success: false,
        errorCode: "UNSUPPORTED_PROVIDER",
        errorMessage: `Provider '${params.provider}' is not supported yet.`
      };
  }
}
