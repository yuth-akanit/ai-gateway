export type UserPayload = {
    input: Record<string, unknown>;
    context?: Record<string, unknown>;
    retrieved_context?: Record<string, unknown>;
    constraints?: Record<string, unknown>;
  };
  
  export function composeUserPayload(params: {
    input: Record<string, unknown>;
    context?: Record<string, unknown>;
    retrieved?: Record<string, unknown>;
    constraints?: Record<string, unknown>;
  }): UserPayload {
    return {
      input: params.input,
      context: params.context || {},
      retrieved_context: params.retrieved || {},
      constraints: params.constraints || {},
    };
  }
