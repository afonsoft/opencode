import { afterEach, expect } from "bun:test"
import { writeFile } from "fs/promises"
import path from "path"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { Effect } from "effect"
import { ModelsDev } from "@opencode-ai/core/models-dev"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { disposeAllInstances } from "../fixture/fixture"
import { Auth } from "@/auth"
import { Config } from "@/config/config"
import { Env } from "../../src/env"
import { Plugin } from "../../src/plugin/index"
import { Provider } from "@/provider/provider"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { testEffect } from "../lib/effect"

afterEach(async () => {
  await disposeAllInstances()
})

const it = testEffect(
  LayerNode.compile(
    LayerNode.group([
      Provider.node,
      FSUtil.node,
      Env.node,
      Config.node,
      Auth.node,
      Plugin.node,
      ModelsDev.node,
      RuntimeFlags.node,
    ]),
  ),
)

const captured = { authorization: undefined as string | undefined }

const serveModels = (options?: { fail?: boolean }) =>
  Effect.gen(function* () {
    captured.authorization = undefined
    const server = Bun.serve({
      port: 0,
      fetch: (req) => {
        captured.authorization = req.headers.get("authorization") ?? undefined
        if (options?.fail) return new Response("boom", { status: 500 })
        if (new URL(req.url).pathname !== "/v1/models") return new Response("not found", { status: 404 })
        return Response.json({
          object: "list",
          data: [
            { id: "gateway-model-a", object: "model" },
            { id: "gateway-model-b", object: "model", name: "Gateway Model B" },
          ],
        })
      },
    })
    yield* Effect.addFinalizer(() => Effect.promise(() => server.stop(true)))
    return server
  })

const writeConfig = (dir: string, provider: Record<string, unknown>) =>
  Effect.promise(() =>
    writeFile(
      path.join(dir, "opencode.json"),
      JSON.stringify({ $schema: "https://opencode.ai/config.json", provider }),
    ),
  )

const omniroute = (baseURL: string, options?: { apiKey?: string; models?: Record<string, object>; npm?: string }) => ({
  omniroute: {
    name: "OmniRoute",
    npm: options?.npm ?? "@ai-sdk/openai-compatible",
    options: {
      baseURL,
      ...(options?.apiKey ? { apiKey: options.apiKey } : {}),
    },
    ...(options?.models ? { models: options.models } : {}),
  },
})

it.instance(
  "discovers models for a config openai-compatible provider with no declared models",
  Effect.gen(function* () {
    const providers = yield* Provider.use.list()
    const provider = providers[ProviderV2.ID.make("omniroute")]
    expect(provider).toBeDefined()
    expect(provider.source).toBe("config")
    expect(provider.models["gateway-model-a"]).toBeDefined()
    expect(provider.models["gateway-model-b"].name).toBe("Gateway Model B")
    expect(provider.models["gateway-model-a"].api.npm).toBe("@ai-sdk/openai-compatible")
    expect(captured.authorization).toBe("Bearer test-gateway-key")
  }),
  {
    init: (dir) =>
      Effect.gen(function* () {
        const server = yield* serveModels()
        yield* writeConfig(dir, omniroute(`http://localhost:${server.port}/v1`, { apiKey: "test-gateway-key" }))
      }),
  },
)

it.instance(
  "keeps declared models instead of discovering",
  Effect.gen(function* () {
    const providers = yield* Provider.use.list()
    const provider = providers[ProviderV2.ID.make("omniroute")]
    expect(provider).toBeDefined()
    expect(Object.keys(provider.models)).toEqual(["declared-model"])
    expect(captured.authorization).toBeUndefined()
  }),
  {
    init: (dir) =>
      Effect.gen(function* () {
        const server = yield* serveModels()
        yield* writeConfig(
          dir,
          omniroute(`http://localhost:${server.port}/v1`, {
            apiKey: "test-gateway-key",
            models: { "declared-model": { name: "Declared" } },
          }),
        )
      }),
  },
)

it.instance(
  "does not discover for a non-openai-compatible npm",
  Effect.gen(function* () {
    const providers = yield* Provider.use.list()
    expect(providers[ProviderV2.ID.make("omniroute")]).toBeUndefined()
    expect(captured.authorization).toBeUndefined()
  }),
  {
    init: (dir) =>
      Effect.gen(function* () {
        const server = yield* serveModels()
        yield* writeConfig(
          dir,
          omniroute(`http://localhost:${server.port}/v1`, { apiKey: "test-gateway-key", npm: "@ai-sdk/anthropic" }),
        )
      }),
  },
)

it.instance(
  "drops the provider when the endpoint cannot be listed",
  Effect.gen(function* () {
    const providers = yield* Provider.use.list()
    expect(providers[ProviderV2.ID.make("omniroute")]).toBeUndefined()
  }),
  {
    init: (dir) =>
      Effect.gen(function* () {
        const server = yield* serveModels({ fail: true })
        yield* writeConfig(dir, omniroute(`http://localhost:${server.port}/v1`, { apiKey: "test-gateway-key" }))
      }),
  },
)
