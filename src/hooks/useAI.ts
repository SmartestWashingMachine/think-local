import { useCallback, useEffect, useRef, useState } from "react";
import { Wllama } from "@wllama/wllama/esm/index.js";
import type { ModelInfo, ModelStatus } from "../ai/types";
import { saveModelId, formatModelId } from "../ai/models";
import { WLLAMA_CONFIG_PATHS, buildHFDownloadUrl, buildHFMmprojUrl } from "../ai/config";
import type { ChatCompletionTool } from "../types/mcp";
import type {
  ChatCompletionMessage,
  ChatCompletionChunk,
  ChatCompletionAssistantMessage,
  ChatCompletionToolMessage,
} from "@wllama/wllama/esm/types/oai-compat";

export function useAI() {
  const wllamaRef = useRef<Wllama | null>(null);

  const [status, setStatus] = useState<ModelStatus>("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loadedModelInfo, setLoadedModelInfo] = useState<ModelInfo | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [cachedList, setCachedList] = useState<{ url: string; size: number }[]>(
    []
  );
  const [webGpuSupported, setWebGpuSupported] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
          const adapter = await (navigator.gpu as GPU).requestAdapter();
          setWebGpuSupported(!!adapter);
        } else {
          setWebGpuSupported(false);
        }
      } catch {
        setWebGpuSupported(false);
      }
    })();
  }, []);

  const refreshCachedList = useCallback(async () => {
    const wllama = wllamaRef.current;
    if (!wllama) {
      setCachedList([]);
      return;
    }
    try {
      const models = await wllama.modelManager.getModels();
      setCachedList(models.map((m) => ({ url: m.url, size: m.size })));
    } catch {
      setCachedList([]);
    }
  }, []);

  useEffect(() => {
    return () => {
      wllamaRef.current?.exit().catch(() => {});
      wllamaRef.current = null;
    };
  }, []);

  const getOrCreateWllama = useCallback(async () => {
    if (!wllamaRef.current) {
      wllamaRef.current = new Wllama(WLLAMA_CONFIG_PATHS);
    }
    if (wllamaRef.current.isModelLoaded()) {
      await wllamaRef.current.exit();
    }
  }, []);

  const loadModel = useCallback(
    async (info: ModelInfo) => {
      const wllama = wllamaRef.current;
      const url = buildHFDownloadUrl(info.repo, info.file);

      const isCached = wllama
        ? (await wllama.modelManager.getModels()).some((m) => m.url === url)
        : false;

      if (isCached) {
        setStatus("loading");
        setError(null);
      } else {
        setStatus("downloading");
        setDownloadProgress(0);
        setError(null);
      }

      await getOrCreateWllama();

      try {
        if (info.mmprojFile) {
          const mmprojUrl = buildHFMmprojUrl(info);
          await wllamaRef.current!.loadModelFromUrl(
            { url, mmprojUrl },
            {
              useCache: true,
              progressCallback: (progress) => {
                if (progress.total > 0) {
                  setDownloadProgress(
                    Math.round((progress.loaded / progress.total) * 100)
                  );
                }
              },
            }
          );
        } else {
          await wllamaRef.current!.loadModelFromUrl(url, {
            useCache: true,
            progressCallback: (progress) => {
              if (progress.total > 0) {
                setDownloadProgress(
                  Math.round((progress.loaded / progress.total) * 100)
                );
              }
            },
          });
        }

        setLoadedModelInfo(info);
        setStatus("loaded");
        saveModelId(formatModelId(info.repo, info.file));
        await refreshCachedList();
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    },
    [getOrCreateWllama, refreshCachedList]
  );

  const unloadModel = useCallback(async () => {
    if (wllamaRef.current) {
      await wllamaRef.current.exit();
    }
    setLoadedModelInfo(null);
    setStatus("idle");
    setError(null);
    setDownloadProgress(0);
    saveModelId(null);
  }, []);

  const generateCompletionStream = useCallback(
    async (
      messages: ChatCompletionMessage[],
      onToken: (token: string) => void
    ): Promise<string> => {
      const wllama = wllamaRef.current;
      if (!wllama || !wllama.isModelLoaded()) {
        throw new Error("No model loaded");
      }

      let fullContent = "";

      await wllama.createChatCompletion({
        messages,
        max_tokens: 256,
        temperature: 0.7,
        stream: true,
        onData: (chunk) => {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            fullContent += delta;
            onToken(delta);
          }
        },
      });

      return fullContent;
    },
    []
  );

  const generateCompletionWithTools = useCallback(
    async (
      initialMessages: ChatCompletionMessage[],
      onToken: (token: string) => void,
      tools: ChatCompletionTool[],
      executeTool: (
        name: string,
        args: Record<string, unknown>
      ) => Promise<string>,
      onToolTrace?: (name: string, args: string, result: string) => void
    ): Promise<string> => {
      const wllama = wllamaRef.current;
      if (!wllama || !wllama.isModelLoaded()) {
        throw new Error("No model loaded");
      }

      const messages = initialMessages.slice();
      let fullContent = "";
      let runs = 0;
      const MAX_TOOL_RUNS = 5;

      while (runs < MAX_TOOL_RUNS) {
        runs++;
        fullContent = "";
        type ChunkToolCall = NonNullable<
          NonNullable<
            ChatCompletionChunk["choices"]
          >[number]["delta"]["tool_calls"]
        >[number] & { function: { name: string; arguments: string } };
        const toolCallMap = new Map<number, ChunkToolCall>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = {
          messages,
          max_tokens: 256,
          temperature: 0.7,
          stream: true,
          onData: (chunk: ChatCompletionChunk) => {
            const choice = chunk.choices?.[0];
            if (!choice) return;

            const delta = choice.delta;

            if (delta?.content) {
              fullContent += delta.content;
              onToken(delta.content);
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                let existing = toolCallMap.get(tc.index);
                if (!existing) {
                  existing = {
                    index: tc.index,
                    id: tc.id ?? crypto.randomUUID(),
                    type: "function",
                    function: { name: "", arguments: "" },
                  };
                  toolCallMap.set(tc.index, existing);
                }
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name)
                  existing.function.name += tc.function.name;
                if (tc.function?.arguments)
                  existing.function.arguments += tc.function.arguments;
              }
            }
          },
        };

        if (runs === 1 && tools.length > 0) {
          params.tools = tools;
          params.tool_choice = "auto";
        }

        await wllama.createChatCompletion(params);

        const rawCalls = Array.from(toolCallMap.values());
        if (rawCalls.length === 0) {
          break;
        }

        const toolCallDefs = rawCalls.map((tc) => ({
          id: tc.id!,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));

        const assistantMsg: ChatCompletionAssistantMessage = {
          role: "assistant",
          content: fullContent || null,
          tool_calls: toolCallDefs,
        };
        messages.push(assistantMsg);

        for (const tc of rawCalls) {
          try {
            const parsed = JSON.parse(tc.function.arguments) as Record<
              string,
              unknown
            >;
            const result = await executeTool(tc.function.name, parsed);
            onToolTrace?.(tc.function.name, tc.function.arguments, result);
            const toolMsg: ChatCompletionToolMessage = {
              role: "tool",
              tool_call_id: tc.id!,
              content: result,
            };
            messages.push(toolMsg);
          } catch {
            const toolMsg: ChatCompletionToolMessage = {
              role: "tool",
              tool_call_id: tc.id!,
              content: "Error executing tool",
            };
            messages.push(toolMsg);
          }
        }
      }

      return fullContent;
    },
    []
  );

  const removeCachedModel = useCallback(
    async (url: string) => {
      const wllama = wllamaRef.current;
      if (!wllama) return;
      const models = await wllama.modelManager.getModels();
      const target = models.find((m) => m.url === url);
      if (target) {
        await target.remove();
        await refreshCachedList();
      }
    },
    [refreshCachedList]
  );

  return {
    status,
    downloadProgress,
    loadedModel: loadedModelInfo,
    error,
    cachedModels: cachedList,
    webGpuSupported,
    loadModel,
    unloadModel,
    generateCompletionStream,
    generateCompletionWithTools,
    removeCachedModel,
  };
}
