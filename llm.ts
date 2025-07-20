import { App } from "./app";

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  reasoning_content?: string;
};

export type LLMResponse = {
  role: "assistant";
  content: string;
  reasoning_content: string;
};

export class LLM {
  public is_ready: boolean;
  public default_model: string = "Qwen/QwQ-32B";

  constructor(
    private app: App,
    private endpoint: string,
    private api_key: string,
  ) {
    this.is_ready = this.endpoint !== "" && this.api_key !== "";
  }

  async chat(
    session_id: string,
    user_message: string,
    model: string = this.default_model,
  ): Promise<LLMResponse> {
    if (!this.is_ready) {
      throw new Error("LLM is not ready");
    }

    const history = this.app.sessions.get_message_history(session_id, {
      digest: "undigested",
      with_digest: true,
    });

    const messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    messages.push({ role: "user", content: user_message });

    return await this.chat_completions(messages, model);
  }

  async chat_completions(
    messages: LLMMessage[],
    model: string = this.default_model,
  ) {
    const endpoint = this.endpoint + "/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages,
      }),
    });
    const data = await response.json();
    return data.choices[0].message as LLMResponse;
  }
}
