export function composeUserMessage(params: {
    taskType: string;
    input: Record<string, any>;
    retrieved: any;
    constraints?: Record<string, any>;
  }): string {
    const question = params.input?.question || params.input?.text || '';
    const contextMd = params.retrieved?.retrievedContextMd || "No relevant knowledge found.";
    
    // Create a very clear markdown structure for the model to follow
    return `
# PROJECT QA REQUEST
Task Type: ${params.taskType}

## QUESTION
${question}

## RETRIEVED CONTEXT
The following information was retrieved from the project's knowledge base. Use it to answer the question above.

---
${contextMd}
---

## CONSTRAINTS & DETAILS
- Additional Input Data: ${JSON.stringify(params.input, null, 2)}
- Response Format: ${params.constraints?.require_json ? "JSON" : "Markdown / Plain Text"}
`.trim();
  }

  // Backward compatibility for the route file while we transition
  export function composeUserPayload(params: {
    input: Record<string, any>;
    context?: Record<string, any>;
    retrieved?: any;
    constraints?: Record<string, any>;
  }) {
    return composeUserMessage({
      taskType: "default", // will be overridden in the call if needed
      input: params.input,
      retrieved: params.retrieved,
      constraints: params.constraints
    });
  }
